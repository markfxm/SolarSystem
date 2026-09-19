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
  assert.equal(expedition.signal.y, 24)
  assert.ok(Math.hypot(expedition.signal.x - 1200, expedition.signal.z + 800) > 100)
  expedition.update(10)
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
