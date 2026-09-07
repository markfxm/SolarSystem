import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'

test('uses bounded distant particles and instanced meshes for visible asteroids', async () => {
  let createAsteroidField

  try {
    ;({ createAsteroidField } = await import('../three/createAsteroidField.js'))
  } catch {
    // The assertion below produces the intended red test before the module exists.
  }

  assert.equal(typeof createAsteroidField, 'function')

  const field = createAsteroidField({ orbitScale: 260, seed: 42 })

  assert.ok(field.distantDebris instanceof THREE.Points)
  assert.equal(field.distantDebris.material.sizeAttenuation, false)
  assert.ok(field.distantDebris.material.size <= 1.25)
  assert.equal(field.distantDebris.geometry.getAttribute('position').count, 2100)

  assert.equal(field.mediumMeshes.length, 4)
  assert.ok(field.mediumMeshes.every(mesh => mesh instanceof THREE.InstancedMesh))
  assert.ok(field.mediumMeshes.every(mesh => mesh.material instanceof THREE.MeshStandardMaterial))
  assert.ok(field.mediumMeshes.every(mesh => mesh.material.roughness >= 0.9))
  assert.ok(field.mediumMeshes.every(mesh => mesh.material.metalness <= 0.03))
  assert.equal(field.mediumMeshes.reduce((sum, mesh) => sum + mesh.count, 0), 204)

  assert.ok(field.heroMesh instanceof THREE.InstancedMesh)
  assert.ok(field.heroMesh.count <= 4)

  const normal = field.mediumMeshes[0].geometry.getAttribute('normal')
  const position = field.mediumMeshes[0].geometry.getAttribute('position')
  assert.ok(normal)
  assert.equal(normal.count, position.count)

  field.dispose()
})

test('updates instance rotations without producing invalid Euler orders', async () => {
  const { createAsteroidField } = await import('../three/createAsteroidField.js')
  const errors = []
  const originalError = console.error
  console.error = (...args) => errors.push(args.join(' '))

  try {
    const field = createAsteroidField({ orbitScale: 260, seed: 7 })
    const camera = new THREE.PerspectiveCamera(50, 16 / 9)
    camera.position.set(-160, 210, 680)
    const before = field.mediumMeshes[0].instanceMatrix.array.slice(0, 16)

    field.update(1, camera, true)

    const after = field.mediumMeshes[0].instanceMatrix.array.slice(0, 16)
    assert.notDeepEqual(after, before)
    assert.equal(errors.some(message => message.includes('unknown order')), false)
    field.dispose()
  } finally {
    console.error = originalError
  }
})

test('keeps medium asteroids on varied inclined orbits and springs them back after pointer repulsion', async () => {
  const { createAsteroidField } = await import('../three/createAsteroidField.js')
  const field = createAsteroidField({ orbitScale: 260, seed: 17 })
  const camera = new THREE.PerspectiveCamera(50, 16 / 9)
  camera.position.set(-160, 210, 680)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()

  field.update(0.1, camera, true)
  const mesh = field.mediumMeshes[0]
  const animation = mesh.userData.animation
  assert.ok(animation.angularVelocities.some(speed => speed !== 0))
  assert.ok(animation.inclinations.some(inclination => inclination !== 0))

  const instancePosition = new THREE.Vector3()
  const instanceMatrix = new THREE.Matrix4()
  mesh.getMatrixAt(0, instanceMatrix)
  instancePosition.setFromMatrixPosition(instanceMatrix).project(camera)

  field.setPointerNdc(instancePosition.x, instancePosition.y, 1)
  field.update(0.1, camera, true)
  assert.ok(animation.pointerOffsets.some(offset => Math.abs(offset) > 0.0001))

  field.clearPointer()
  for (let i = 0; i < 180; i++) field.update(1 / 60, camera, true)
  assert.ok(animation.pointerOffsets.every(offset => Math.abs(offset) < 0.05))
  field.dispose()
})

test('gives foreground hero asteroids the same subtle pointer spring response', async () => {
  const { createAsteroidField } = await import('../three/createAsteroidField.js')
  const field = createAsteroidField({ orbitScale: 260, seed: 23 })
  const camera = new THREE.PerspectiveCamera(50, 16 / 9)
  camera.position.set(-160, 210, 680)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()

  field.update(0.1, camera, true)
  const animation = field.heroMesh.userData.animation
  assert.ok(animation.pointerOffsets)

  const matrix = new THREE.Matrix4()
  const position = new THREE.Vector3()
  field.heroMesh.getMatrixAt(0, matrix)
  position.setFromMatrixPosition(matrix).project(camera)
  field.setPointerNdc(position.x, position.y, 1)
  field.update(0.1, camera, true)

  assert.ok(animation.pointerOffsets.some(offset => Math.abs(offset) > 0.0001))
  field.dispose()
})
