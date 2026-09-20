import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createMarsExpedition } from '../planets/Mars/MarsExpedition.js'
import { createMarsLandscape, createRockGeometry } from '../planets/Mars/MarsEnvironment.js'

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

test('rock deformation is deterministic, bounded and has finite normals', () => {
  const a = createRockGeometry(2, 7), b = createRockGeometry(2, 7)
  assert.deepEqual(a.attributes.position.array, b.attributes.position.array)
  for (const attribute of ['position', 'normal', 'color']) {
    assert.ok(a.attributes[attribute].array.every(Number.isFinite))
  }
  a.computeBoundingSphere()
  assert.ok(a.boundingSphere.radius > 0.8 && a.boundingSphere.radius < 1.6)
  a.dispose(); b.dispose()
})

test('expedition anchors its destination to terrain and releases shared resources exactly once', () => withCanvas(() => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera()
  const expedition = createMarsExpedition(scene, camera, () => 24, 1200, -800)
  assert.equal(expedition.signals[0].position.y, 24)
  assert.ok(Math.hypot(expedition.signals[0].position.x - 1200, expedition.signals[0].position.z + 800) > 100)
  const secondSignal = scene.getObjectByName('Signal 02 / survey beacon')
  assert.equal(secondSignal.visible, false)
  expedition.update(10, { stage: 'scanning', progress: 0.5, paused: false })
  assert.equal(secondSignal.visible, false)
  expedition.update(11, { stage: 'complete', unlockedTargetIds: ['signal01', 'signal02'] })
  assert.equal(secondSignal.visible, true)
  assert.equal(expedition.signals[1].position.y, 24)
  scene.updateMatrixWorld(true)
  const resources = new Set()
  scene.traverse(object => {
    assert.ok(object.matrixWorld.elements.every(Number.isFinite))
    if (object.geometry) resources.add(object.geometry)
    if (object.material) {
      resources.add(object.material)
      if (object.material.map) resources.add(object.material.map)
    }
  })
  const counts = new Map()
  resources.forEach(resource => resource.addEventListener('dispose', () => counts.set(resource, (counts.get(resource) || 0) + 1)))
  expedition.dispose()
  resources.forEach(resource => assert.equal(counts.get(resource), 1))
  assert.equal(camera.children.length, 0)
  assert.deepEqual(scene.children, [camera])
}))

test('landscape disposal preserves the externally owned rock material', () => withCanvas(() => {
  const scene = new THREE.Scene(), material = new THREE.MeshStandardMaterial()
  let disposed = false
  material.addEventListener('dispose', () => { disposed = true })
  const landscape = createMarsLandscape(scene, () => 50, 10000, -5000, material)
  landscape.update(100)
  scene.updateMatrixWorld(true)
  scene.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite)))
  landscape.dispose()
  assert.equal(scene.children.length, 0)
  assert.equal(disposed, false)
  material.dispose()
}))

test('solid expedition props register collision volumes and release them on disposal', () => withCanvas(() => {
  const boxes = new Set()
  const collision = { addBox(min, max) {
    const box = { min, max }
    boxes.add(box)
    return () => boxes.delete(box)
  } }
  const expedition = createMarsExpedition(new THREE.Scene(), new THREE.PerspectiveCamera(), () => 24, 0, 0, collision)
  for (const [name, x, z] of [
    ['habitat', -9, -28], ['stairs', -9, -21], ['utility', -21, -35],
    ['rover', 9, -21], ['crate', -6.7, -19], ['solar support', -4, -38],
    ['probe', 26, -112], ['terminal', -12, -17],
  ]) {
    assert.ok([...boxes].some(({ min, max }) => min.x <= x && max.x >= x && min.z <= z && max.z >= z && min.y <= 25.7 && max.y > 24), name)
  }
  const count = boxes.size
  expedition.update(1, { unlockedTargetIds: ['signal01', 'signal02'] })
  assert.equal(boxes.size, count + 1)
  expedition.update(2, { unlockedTargetIds: ['signal01', 'signal02'] })
  assert.equal(boxes.size, count + 1)
  expedition.dispose()
  assert.equal(boxes.size, 0)
}))

test('large instanced outcrops have collision volumes and release them', () => withCanvas(() => {
  const boxes = new Set()
  const collision = { addBox(min, max) {
    const box = { min, max }; boxes.add(box)
    assert.ok(max.x > min.x && max.z > min.z && max.y > min.y)
    return () => boxes.delete(box)
  } }
  const material = new THREE.MeshStandardMaterial()
  const landscape = createMarsLandscape(new THREE.Scene(), () => 24, 0, 0, material, collision)
  assert.equal(boxes.size, 16)
  landscape.dispose()
  assert.equal(boxes.size, 0)
  material.dispose()
}))
