import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createMarsVehicle } from '../planets/Mars/MarsVehicle.js'
import { createPlayerCollision } from '../planets/Mars/PlayerCollision.js'

function setup() {
  const root = new THREE.Group(), rover = new THREE.Group(), camera = new THREE.PerspectiveCamera()
  root.add(rover)
  const collision = createPlayerCollision(), scanner = { visible: true }
  const vehicle = createMarsVehicle(rover, camera, collision, () => 0, scanner)
  camera.position.set(-4, 1.7, 0)
  return { root, rover, camera, collision, scanner, vehicle }
}
test('NOMAD crosses small rocks but stops at large rocks; foot queries still see small rocks', () => {
  const { vehicle, collision, rover } = setup()
  collision.addBox({ x: -0.4, y: 0, z: 5 }, { x: 0.4, y: 0.6, z: 5.8 }, { vehiclePassable: true })
  assert.equal(collision.isClear(new THREE.Vector3(0, 0, 5.4)), false)
  vehicle.interact()
  for (let i = 0; i < 30; i++) vehicle.update(0.1, { w: true }, true)
  assert.ok(rover.position.z > 6)
  const wall = rover.position.z + 10
  collision.addBox({ x: -3, y: 0, z: wall }, { x: 3, y: 5, z: wall + 3 })
  for (let i = 0; i < 40; i++) vehicle.update(0.1, { w: true }, true)
  assert.ok(rover.position.z < wall - 3.6)
})
test('mouse steers the vehicle smoothly, recenters, and does not turn a stopped rover', () => {
  const { vehicle, rover } = setup()
  vehicle.interact()
  vehicle.steerMouse(10000)
  vehicle.update(0.1, {}, true)
  assert.equal(rover.rotation.y, 0)
  vehicle.update(0.1, { w: true }, true)
  assert.ok(rover.rotation.y < 0 && rover.rotation.y > -0.07)
  vehicle.steerMouse(-10000)
  for (let i = 0; i < 10; i++) vehicle.update(0.1, { w: true }, true)
  assert.ok(rover.rotation.y > 0)
  for (let i = 0; i < 40; i++) vehicle.update(0.1, { w: true }, true)
  const heading = rover.rotation.y
  vehicle.update(0.1, { w: true }, true)
  assert.ok(Math.abs(rover.rotation.y - heading) < 0.0001)
})
test('wheel animation follows actual travel and reverses with the vehicle', () => {
  const { vehicle, rover, collision } = setup()
  let distance = 0
  rover.userData.animateWheels = travel => { distance += travel }
  vehicle.interact()
  vehicle.update(0.1, { w: true }, true)
  assert.ok(distance > 0)
  assert.ok(Math.abs(distance - rover.position.z) < 1e-9)
  for (let i = 0; i < 20; i++) vehicle.update(0.1, { s: true }, true)
  assert.ok(distance < 0)
  collision.addBox({ x: -100, y: -1, z: -100 }, { x: 100, y: 10, z: 100 })
  const stopped = distance
  vehicle.update(0.1, { w: true }, true)
  assert.equal(distance, stopped)
})
test('entry requires proximity; driving accelerates, brakes, reverses and exits safely', () => {
  const { rover, camera, scanner, vehicle } = setup()
  camera.position.x = 50
  assert.equal(vehicle.interact(), false)
  camera.position.x = -4
  assert.equal(vehicle.interact(), true)
  assert.equal(scanner.visible, false)
  vehicle.update(0.1, { w: true }, true)
  assert.ok(vehicle.state.speed > 0 && vehicle.state.speed < 1)
  for (let i = 0; i < 60; i++) vehicle.update(0.1, { w: true }, true)
  assert.ok(vehicle.state.speed <= 18)
  const forward = rover.position.z
  for (let i = 0; i < 60; i++) vehicle.update(0.1, { s: true }, true)
  assert.ok(vehicle.state.speed < 0 && vehicle.state.speed >= -6)
  assert.ok(forward > 0)
  const parked = rover.position.clone()
  vehicle.interact()
  assert.equal(vehicle.state.mode, 'ON_FOOT')
  assert.equal(scanner.visible, true)
  assert.ok(camera.position.distanceTo(parked) >= 5)
  vehicle.update(0.1, { w: true }, true)
  assert.deepEqual(rover.position, parked)
})
test('moving collider leaves no ghost at spawn and blocks the parked rover', () => {
  const { vehicle, collision, rover } = setup()
  vehicle.interact()
  for (let i = 0; i < 40; i++) vehicle.update(0.1, { w: true }, true)
  assert.equal(collision.isClear(new THREE.Vector3()), true)
  assert.equal(collision.isClear(rover.position), false)
  vehicle.dispose()
  assert.equal(collision.isClear(rover.position), true)
})
test('obstacles stop driving and all blocked exits keep the player in the vehicle', () => {
  const { vehicle, collision, rover } = setup()
  vehicle.interact()
  collision.addBox({ x: -20, y: -1, z: 8 }, { x: 20, y: 10, z: 9 })
  for (let i = 0; i < 80; i++) vehicle.update(0.1, { w: true }, true)
  assert.ok(rover.position.z < 4.4)
  collision.addBox({ x: -20, y: -1, z: -20 }, { x: 20, y: 10, z: 20 })
  vehicle.interact()
  assert.equal(vehicle.state.mode, 'IN_VEHICLE')
  assert.equal(vehicle.state.exitBlocked, true)
})
for (const globalOrigin of [-9000000, 9000000]) {
  test(`vehicle and camera survive local rebasing near ${globalOrigin}m`, () => {
    const { vehicle, root, camera, collision } = setup()
    vehicle.interact()
    vehicle.update(0.1, { w: true }, true)
    const before = vehicle.getPosition().clone(), cameraBefore = camera.position.clone()
    const shift = 2400
    root.position.z -= shift; camera.position.z -= shift; collision.shiftOrigin(0, shift)
    const after = vehicle.getPosition().clone()
    assert.equal(after.z + globalOrigin + shift, before.z + globalOrigin)
    assert.ok(Math.abs(camera.position.distanceTo(after) - cameraBefore.distanceTo(before)) < 1e-9)
    vehicle.update(0.1, { w: true }, true)
    assert.equal(collision.isClear(vehicle.getPosition()), false)
    vehicle.interact()
    assert.equal(vehicle.state.mode, 'ON_FOOT')
    assert.ok(Number.isFinite(camera.position.y))
  })
}
