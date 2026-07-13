import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createTimeController } from '../three/timeController.js'
import { AestheticSnapshotManager } from '../utils/AestheticSnapshot.js'

test('time controller disables automatic matrix updates for externally supplied rotating objects', () => {
  const earth = new THREE.Mesh()
  earth.userData.name = 'earth'
  earth.matrixAutoUpdate = false
  earth.position.set(1, 2, 3)
  const moon = new THREE.Mesh()
  moon.userData.name = 'moon'
  const sun = new THREE.Mesh()
  sun.userData.name = 'sun'
  const moonOrbit = new THREE.Mesh()

  createTimeController(
    { earth, moon },
    1,
    [sun, moon],
    moon,
    moonOrbit,
    10
  )

  assert.equal(moon.matrixAutoUpdate, false)
  assert.equal(moonOrbit.matrixAutoUpdate, false)
  assert.equal(sun.matrixAutoUpdate, false)
  assert.ok(earth.matrix.equals(new THREE.Matrix4().compose(earth.position, earth.quaternion, earth.scale)))
})

test('aesthetic snapshot updates matrices when applying and restoring transforms', () => {
  globalThis.window = { innerWidth: 1280, innerHeight: 720 }

  try {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera()
    const earth = new THREE.Mesh()
    const sun = new THREE.Mesh()
    earth.matrixAutoUpdate = false
    sun.matrixAutoUpdate = false
    earth.position.set(1, 2, 3)
    earth.scale.setScalar(2)
    sun.position.set(4, 5, 6)
    sun.scale.setScalar(3)
    earth.updateMatrix()
    sun.updateMatrix()
    sun.name = 'sun'
    scene.add(earth, sun)

    const originalEarthMatrix = earth.matrix.clone()
    const originalSunMatrix = sun.matrix.clone()
    const snapshot = new AestheticSnapshotManager(scene, camera, { earth, sun })

    snapshot.apply(new Date('2026-01-01T00:00:00Z'))

    assert.ok(earth.matrix.equals(new THREE.Matrix4().compose(earth.position, earth.quaternion, earth.scale)))
    assert.ok(sun.matrix.equals(new THREE.Matrix4().compose(sun.position, sun.quaternion, sun.scale)))

    earth.position.set(99, 98, 97)
    sun.scale.setScalar(99)
    snapshot.restore()

    assert.ok(earth.matrix.equals(originalEarthMatrix))
    assert.ok(sun.matrix.equals(originalSunMatrix))
  } finally {
    delete globalThis.window
  }
})
