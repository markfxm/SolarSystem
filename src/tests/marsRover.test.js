import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { OBB } from 'three/examples/jsm/math/OBB.js'
import { createMarsRover } from '../planets/Mars/MarsRover.js'
import { createMarsExpedition } from '../planets/Mars/MarsExpedition.js'
import { createPlayerCollision } from '../planets/Mars/PlayerCollision.js'

function withCanvas(run) {
  const previous = globalThis.document
  const context = new Proxy({}, {
    get: (_, key) => key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {},
    set: () => true,
  })
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) }
  try { run() } finally {
    if (previous === undefined) delete globalThis.document
    else globalThis.document = previous
  }
}

function resourcesOf(root) {
  const resources = new Set()
  root.traverse(object => {
    if (object.geometry) resources.add(object.geometry)
    if (object.isInstancedMesh) resources.add(object)
    const materials = object.material ? [object.material].flat() : []
    for (const material of materials) {
      resources.add(material)
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value)
    }
  })
  return resources
}

test('rolling and steering keep instanced treads attached to all six wheel assemblies', () => withCanvas(() => {
  const rover = createMarsRover()
  const wheels = rover.children.filter(object => object.name.startsWith('Wheel '))
  const treads = rover.getObjectByName('Rover / 336 staggered tread blocks')
  const originals = wheels.map((wheel, i) => {
    const matrix = new THREE.Matrix4()
    treads.getMatrixAt(i * 56, matrix)
    return matrix.premultiply(new THREE.Matrix4().makeTranslation(-wheel.position.x, -wheel.position.y, -wheel.position.z))
  })
  rover.userData.animateWheels(2, 0.35)
  wheels.forEach((wheel, i) => {
    assert.ok(wheel.rotation.x > 0)
    assert.equal(wheel.rotation.y, wheel.name.endsWith('front') ? 0.35 : 0)
    const actual = new THREE.Matrix4()
    treads.getMatrixAt(i * 56, actual)
    const expected = wheel.matrix.clone().multiply(originals[i])
    actual.elements.forEach((value, j) => assert.ok(Math.abs(value - expected.elements[j]) < 1e-6))
  })
  rover.userData.animateWheels(-2, 0)
  wheels.forEach(wheel => assert.ok(Math.abs(wheel.rotation.x) < 1e-10))
}))

test('rover has six grounded wheel assemblies and bounded rendering cost', () => withCanvas(() => {
  const rover = createMarsRover()
  try {
    assert.deepEqual(rover.position.toArray(), [0, 0, 0])
    assert.deepEqual(rover.scale.toArray(), [1, 1, 1])
    const names = ['left', 'right'].flatMap(side => ['rear', 'middle', 'front'].map(position => `Wheel ${side} ${position}`))
    const wheels = rover.children.filter(child => child.name.startsWith('Wheel '))
    assert.deepEqual(wheels.map(wheel => wheel.name).sort(), names.sort())
    rover.updateMatrixWorld(true)
    for (const side of ['left', 'right']) {
      const row = ['rear', 'middle', 'front'].map(position => rover.getObjectByName(`Wheel ${side} ${position}`))
      const bounds = row.map(wheel => new THREE.Box3().setFromObject(wheel))
      for (const box of bounds) {
        assert.ok(box.min.y >= 0 && box.min.y < 0.12, 'tires sit just above the ground')
        assert.ok(box.max.y - box.min.y > 1.5, 'wheel assemblies retain their terrain clearance scale')
      }
      assert.ok(bounds[0].max.z < bounds[1].min.z && bounds[1].max.z < bounds[2].min.z, 'tire sidewalls do not intersect adjacent wheels')
    }
    const treads = rover.children.find(object => object.isInstancedMesh && object.name.includes('tread'))
    assert.ok(treads, 'repeated tread blocks share one draw call')
    treads.geometry.computeBoundingBox()
    const treadBounds = new Map(wheels.map(wheel => [wheel, []]))
    const contactBounds = new Map(wheels.map(wheel => [wheel, new THREE.Box3()]))
    for (let i = 0; i < treads.count; i++) {
      const matrix = new THREE.Matrix4(), position = new THREE.Vector3()
      treads.getMatrixAt(i, matrix)
      position.setFromMatrixPosition(matrix)
      const wheel = wheels.reduce((closest, candidate) => position.distanceToSquared(candidate.position) < position.distanceToSquared(closest.position) ? candidate : closest)
      treadBounds.get(wheel).push(new OBB().fromBox3(treads.geometry.boundingBox).applyMatrix4(matrix))
      contactBounds.get(wheel).union(treads.geometry.boundingBox.clone().applyMatrix4(matrix))
    }
    for (const [wheel, bounds] of contactBounds) assert.ok(bounds.min.y >= 0 && bounds.min.y < 0.03, `treads meet terrain: ${wheel.name}`)
    for (const side of ['left', 'right']) {
      const row = ['rear', 'middle', 'front'].map(position => rover.getObjectByName(`Wheel ${side} ${position}`))
      for (let i = 0; i < row.length - 1; i++) {
        for (const a of treadBounds.get(row[i])) for (const b of treadBounds.get(row[i + 1])) {
          assert.equal(a.intersectsOBB(b), false, `tread corners clear adjacent wheels: ${row[i].name}`)
        }
      }
    }
    let meshes = 0, triangles = 0
    rover.traverse(object => {
      assert.ok(object.matrixWorld.elements.every(Number.isFinite))
      if (!object.isMesh) return
      meshes++
      const geometry = object.geometry
      for (const attribute of Object.values(geometry.attributes)) assert.ok(attribute.array.every(Number.isFinite))
      triangles += (geometry.index?.count || geometry.attributes.position.count) / 3 * (object.isInstancedMesh ? object.count : 1)
    })
    const bounds = new THREE.Box3().setFromObject(rover)
    assert.ok(bounds.min.y >= 0 && bounds.min.y < 0.03, 'tread blocks contact terrain without sinking')
    assert.ok(meshes <= 45, `mesh budget exceeded: ${meshes}`)
    assert.ok(triangles <= 80000, `triangle budget exceeded: ${triangles}`)
  } finally {
    resourcesOf(rover).forEach(resource => resource.dispose())
  }
}))

test('expedition preserves rover placement and blocks its visible footprint until disposal', () => withCanvas(() => {
  const scene = new THREE.Scene(), collision = createPlayerCollision(), boxes = []
  const registeredCollision = { addBox(min, max) {
    boxes.push(new THREE.Box3(min.clone(), max.clone()))
    return collision.addBox(min, max)
  } }
  const expedition = createMarsExpedition(scene, new THREE.PerspectiveCamera(), () => 24, 1200, -800, registeredCollision)
  const rover = scene.getObjectByName('Nomad six-wheel rover')
  try {
    assert.deepEqual(rover.position.toArray(), [1209, 24, -821])
    assert.equal(rover.rotation.y, -0.65)
    const bounds = new THREE.Box3().setFromObject(rover)
    const collider = boxes.find(box => box.containsPoint(rover.position.clone().add(new THREE.Vector3(0, 1, 0))))
    assert.ok(collider, 'rover registers a solid volume')
    assert.ok(collider.min.x <= bounds.min.x && collider.max.x >= bounds.max.x, 'collision covers the visible vehicle width')
    assert.ok(collider.min.z <= bounds.min.z && collider.max.z >= bounds.max.z, 'collision covers the visible vehicle length')
    const player = { x: 1209, y: 25.7, z: -812 }
    collision.move(player, { x: 0, z: -10 }, () => 24)
    assert.ok(player.z > -818 && player.z < -812, 'walking toward the rover stops in front of it')
  } finally {
    expedition.dispose()
  }
  const player = { x: 1209, y: 25.7, z: -812 }
  collision.move(player, { x: 0, z: -10 }, () => 24)
  assert.ok(Math.abs(player.z + 822) < 0.000001, 'leaving the site removes rover collision')
}))

test('landing-site disposal releases every rover geometry, material and texture exactly once', () => withCanvas(() => {
  const scene = new THREE.Scene()
  const expedition = createMarsExpedition(scene, new THREE.PerspectiveCamera(), () => 0, 0, 0)
  const rover = scene.getObjectByName('Nomad six-wheel rover'), counts = new Map()
  const resources = resourcesOf(rover)
  assert.ok([...resources].some(resource => resource.isTexture && resource.colorSpace === THREE.NoColorSpace), 'physical surface detail uses a data texture')
  resources.forEach(resource => resource.addEventListener('dispose', () => counts.set(resource, (counts.get(resource) || 0) + 1)))
  expedition.dispose()
  resources.forEach(resource => assert.equal(counts.get(resource), 1, `${resource.name || resource.type} disposed once`))
  assert.equal(scene.getObjectByName('Nomad six-wheel rover'), undefined)
}))
