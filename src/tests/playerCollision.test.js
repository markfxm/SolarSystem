import test from 'node:test'
import assert from 'node:assert/strict'
import { createPlayerCollision } from '../planets/Mars/PlayerCollision.js'
const ground = () => 0
const box = (world, minX, maxX, minZ, maxZ, minY = 0, maxY = 3) => world.addBox({ x: minX, y: minY, z: minZ }, { x: maxX, y: maxY, z: maxZ })
test('cylinder stops at a thin wall even for a large movement and slides along it', () => {
  const world = createPlayerCollision()
  box(world, 2, 2.05, -100, 100)
  const player = { x: 0, y: 1.7, z: 0 }
  world.move(player, { x: 40, z: 0 }, ground)
  assert.ok(player.x <= 1.60001 && player.x > 1.59)
  world.move(player, { x: 4, z: -4 }, ground)
  assert.ok(player.x <= 1.60001)
  assert.ok(Math.abs(player.z + 4) < 0.001)
  assert.equal(player.y, 1.7)
})
test('corners do not leak and reversing away remains possible', () => {
  const world = createPlayerCollision()
  box(world, 2, 3, -10, 10)
  box(world, -10, 10, 2, 3)
  const player = { x: 0, z: 0 }
  world.move(player, { x: 30, z: 30 }, ground)
  assert.ok(player.x <= 1.60001 && player.z <= 1.60001)
  world.move(player, { x: -2, z: -2 }, ground)
  assert.ok(player.x < 0 && player.z < 0)
})
test('respects height, negative cells, owner removal and world reset', () => {
  const world = createPlayerCollision()
  const remove = box(world, -3, -2, -3, -2)
  const player = { x: -5, z: -2.5 }
  world.move(player, { x: 10, z: 0 }, ground)
  assert.ok(player.x <= -3.4)
  remove(); remove()
  world.move(player, { x: 10, z: 0 }, ground)
  assert.ok(player.x > 0)
  box(world, 2, 3, -10, 10, 2, 4)
  const below = { x: 0, z: 0 }
  world.move(below, { x: 5, z: 0 }, ground)
  assert.ok(Math.abs(below.x - 5) < 0.000001)
  const above = { x: 0, z: 0 }
  world.move(above, { x: 5, z: 0 }, () => 3)
  assert.ok(above.x < 2)
  world.clear()
  world.move(above, { x: 5, z: 0 }, () => 3)
  assert.ok(above.x > 5)
})
