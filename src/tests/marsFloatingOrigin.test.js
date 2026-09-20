import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createMarsSurface } from '../planets/Mars/MarsSurface.js'
import { createPlayerCollision } from '../planets/Mars/PlayerCollision.js'

// Exercise the real surface, geometry, streaming, mission and collision code.
// Only browser audio, texture IO and GPU environment-map generation are stubbed.
function surfaceFixture(t, spawnX, spawnZ) {
  const previous = Object.fromEntries(['document', 'window', 'localStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  const context = new Proxy({}, {
    get: (_, key) => key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {},
    set: () => true,
  })
  const doc = Object.assign(new EventTarget(), {
    createElement: () => ({ getContext: () => context }), hasFocus: () => true,
    hidden: false, pointerLockElement: null,
    exitPointerLock() { this.pointerLockElement = null },
  })
  const element = { requestPointerLock() { doc.pointerLockElement = element; doc.dispatchEvent(new Event('pointerlockchange')) } }
  globalThis.document = doc
  globalThis.window = Object.assign(new EventTarget(), { innerWidth: 1000, innerHeight: 800 })
  const saved = new Map()
  globalThis.localStorage = { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) }
  const parameter = () => ({ value: 0, setValueAtTime() {}, setTargetAtTime() {}, exponentialRampToValueAtTime() {} })
  const audioNode = () => ({ connect() {}, disconnect() {}, start() {}, stop() {}, gain: parameter(), frequency: parameter(), detune: parameter(), playbackRate: parameter() })
  t.mock.method(THREE.AudioContext, 'getContext', () => ({
    sampleRate: 10, currentTime: 0, destination: {},
    listener: { setPosition() {}, setOrientation() {} },
    createGain: audioNode, createBiquadFilter: audioNode, createOscillator: audioNode, createBufferSource: audioNode,
    createBuffer: () => ({ getChannelData: () => new Float32Array(20) }), resume: () => Promise.resolve(),
  }))
  t.mock.method(THREE.PMREMGenerator.prototype, 'fromScene', () => ({ texture: new THREE.Texture(), dispose() {} }))
  t.mock.method(THREE.TextureLoader.prototype, 'load', () => new THREE.Texture())
  const renderer = { domElement: element, compile() {}, capabilities: { getMaxAnisotropy: () => 1 } }
  let surface
  t.after(() => {
    surface?.dispose()
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  surface = createMarsSurface(renderer, { spawnX, spawnZ })
  return surface
}

const chunks = surface => surface.scene.children.filter(object => object.userData.cx !== undefined)

for (const coordinate of [-9000000, 9000000]) {
  test(`vehicle integration at ${coordinate}: E edge, global player, pause, teleport and exit`, t => {
    const surface = surfaceFixture(t, coordinate, coordinate)
    const rover = surface.scene.getObjectByName('Nomad six-wheel rover')
    const origin = surface.getPlayerPosition().clone().sub(surface.camera.position)
    const local = rover.getWorldPosition(new THREE.Vector3())
    surface.camera.position.copy(local).add(new THREE.Vector3(-4, 1.7, 0))
    surface.requestPointerLock()
    surface.onKeyDown({ key: 'e', repeat: false })
    assert.equal(surface.getVehicleState().mode, 'IN_VEHICLE')
    surface.onKeyDown({ key: 'e', repeat: true })
    assert.equal(surface.getVehicleState().mode, 'IN_VEHICLE')
    const expected = local.clone().add(origin)
    assert.ok(surface.getPlayerPosition().distanceTo(expected) < 1e-7)
    const mission = surface.getMissionState()
    surface.update(0.05)
    assert.equal(surface.getMissionState(), mission)
    surface.pause()
    const parked = rover.position.clone()
    surface.update(1)
    assert.deepEqual(rover.position, parked)
    surface.requestPointerLock()
    surface.onKeyDown({ key: 'e', repeat: false })
    assert.equal(surface.getVehicleState().mode, 'ON_FOOT')
    surface.teleport(-coordinate, -coordinate)
    assert.equal(surface.getVehicleState().mode, 'ON_FOOT')
    assert.ok(Math.abs(surface.getPlayerPosition().x + coordinate) < 100)
  })
}
const settle = surface => { for (let i = 0; i < 30; i++) surface.update(0) }
const originOf = surface => surface.getPlayerPosition().clone().sub(surface.camera.position)
const setGlobalPlayer = (surface, position) => {
  const origin = originOf(surface)
  surface.camera.position.copy(position).sub(origin)
}
const near = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`)
const horizontalDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)

for (const sign of [-1, 1]) {
  test(`surface at ${sign * 9000000}m keeps local GPU data, global anchors and centimeter movement`, t => {
    const x = sign * 9000000 + 123.25, z = -sign * 9000000 - 79.5
    const surface = surfaceFixture(t, x, z)
    settle(surface)
    const player = surface.getPlayerPosition().clone()
    near(player.x, x - 2)
    near(player.z, z - 17)
    near(surface.getLanderPosition().x, x - 12)
    near(surface.getSignalPosition().x, x + 26)
    near(surface.getSignalPosition().z, z - 112)
    assert.ok(Math.abs(surface.camera.position.x) < 400)
    assert.ok(Math.abs(surface.camera.position.z) < 400)
    const cameraX = Math.fround(surface.camera.position.x)
    surface.camera.position.x += 0.01
    near(Math.fround(surface.camera.position.x) - cameraX, 0.01, 0.00002)
    near(surface.getPlayerPosition().x - player.x, 0.01)
    surface.update(0)
    assert.deepEqual(surface.getExplorationPath()[0], { x: Math.round(player.x), z: Math.round(player.z) })
    surface.scene.updateMatrixWorld(true)
    surface.scene.traverse(object => {
      const positions = object.geometry?.attributes.position
      if (positions) for (let i = 0; i < positions.count; i++) {
        assert.ok(Math.abs(positions.getX(i)) < 10000 && Math.abs(positions.getZ(i)) < 10000)
      }
      if (object.isInstancedMesh) for (let i = 0; i < object.count; i++) {
        assert.ok(Math.abs(object.instanceMatrix.array[i * 16 + 12]) < 2000)
        assert.ok(Math.abs(object.instanceMatrix.array[i * 16 + 14]) < 2000)
      }
    })
    assert.equal(chunks(surface).length, 25)
    for (const chunk of chunks(surface)) {
      near(chunk.position.x + originOf(surface).x, chunk.userData.cx * 400)
      near(chunk.position.z + originOf(surface).z, chunk.userData.cz * 400)
    }
  })
}

test('rebasing preserves chunk objects and buffers, global path, task distance and mission identity', t => {
  const surface = surfaceFixture(t, 9000000, -9000000)
  surface.camera.position.x = 1999
  settle(surface)
  const beforeChunks = chunks(surface)
  const buffers = beforeChunks.map(chunk => ({ chunk, position: chunk.geometry.attributes.position.array.slice(), rocks: chunk.children[0].instanceMatrix.array.slice() }))
  const state = surface.getMissionState(), target = state.activeTarget
  const targetPosition = target.position.clone()
  const path = surface.getExplorationPath(), oldPath = structuredClone(path)
  const origin = originOf(surface)
  surface.camera.position.x += 2
  const globalBefore = surface.getPlayerPosition().clone()
  const distanceBefore = horizontalDistance(globalBefore, target.position)
  surface.update(0)
  assert.ok(Math.abs(surface.camera.position.x) < 400)
  assert.equal(originOf(surface).x - origin.x, 2000)
  near(surface.getPlayerPosition().x, globalBefore.x)
  near(surface.getPlayerPosition().z, globalBefore.z)
  near(horizontalDistance(surface.getPlayerPosition(), target.position), distanceBefore)
  assert.equal(surface.getMissionState(), state)
  assert.equal(state.activeTarget, target)
  assert.deepEqual(target.position, targetPosition)
  assert.equal(surface.getExplorationPath(), path)
  assert.deepEqual(path, oldPath)
  assert.deepEqual(chunks(surface), beforeChunks)
  for (const { chunk, position, rocks } of buffers) {
    assert.deepEqual(chunk.geometry.attributes.position.array, position)
    assert.deepEqual(chunk.children[0].instanceMatrix.array, rocks)
    near(chunk.position.x + originOf(surface).x, chunk.userData.cx * 400)
  }
  // Record a real movement after the frame shift; the map still gets global meters.
  surface.camera.position.x += 6
  surface.update(0)
  assert.deepEqual(path.at(-1), { x: Math.round(globalBefore.x + 6), z: Math.round(globalBefore.z) })
})

test('opposite distant POI teleports rebuild only the landing session and retain local collision alignment', t => {
  const surface = surfaceFixture(t, 9000000, -9000000)
  for (const sign of [-1, 1]) {
    const x = sign * 9000000 + 123.25, z = sign * 9000000 + 79.5
    surface.teleport(x, z)
    settle(surface)
    near(surface.getPlayerPosition().x, x - 2)
    near(surface.getPlayerPosition().z, z - 17)
    assert.equal(surface.getMissionState().completedCount, 0)
    assert.ok(surface.getExplorationPath().every(p => Math.abs(p.x - x) < 400))
    const target = surface.getMissionState().activeTarget.position
    const probe = surface.scene.getObjectByName('Signal 01 / crashed survey probe')
    const renderedTarget = probe.getWorldPosition(new THREE.Vector3()).add(originOf(surface))
    near(renderedTarget.x, target.x)
    near(renderedTarget.z, target.z)
    // Walk west into the upload terminal's collider in the actual surface loop.
    surface.requestPointerLock()
    surface.onKeyDown({ key: 'a' })
    for (let i = 0; i < 120; i++) surface.update(1 / 60)
    surface.onKeyUp({ key: 'a' })
    const player = surface.getPlayerPosition(), base = surface.getLanderPosition()
    near(player.x - base.x, 0.80001, 0.002)
    near(player.z, base.z)
  }
})

test('returning across an origin shift regenerates identical chunks and completes the existing global mission', t => {
  const surface = surfaceFixture(t, -9000000, 9000000)
  settle(surface)
  const originalChunks = new Map(chunks(surface).map(chunk => [
    `${chunk.userData.cx},${chunk.userData.cz}`,
    { terrain: chunk.geometry.attributes.position.array.slice(), rocks: chunk.children[0].instanceMatrix.array.slice() },
  ]))
  const state = surface.getMissionState(), firstTarget = state.activeTarget
  // Move west far enough to rebase and unload the original chunks.
  surface.camera.position.x = -2401
  settle(surface)
  assert.ok(Math.abs(surface.camera.position.x) < 400)
  assert.equal(state, surface.getMissionState())
  assert.equal(state.activeTarget, firstTarget)
  assert.ok(chunks(surface).every(chunk => !originalChunks.has(`${chunk.userData.cx},${chunk.userData.cz}`)))
  // Re-enter the original global site, which also crosses the rebase threshold.
  setGlobalPlayer(surface, firstTarget.position.clone().add(new THREE.Vector3(6, 1.7, 0)))
  settle(surface)
  assert.equal(state.stage, 'ready')
  near(horizontalDistance(surface.getPlayerPosition(), firstTarget.position), 6)
  assert.equal(chunks(surface).length, originalChunks.size)
  for (const chunk of chunks(surface)) {
    const saved = originalChunks.get(`${chunk.userData.cx},${chunk.userData.cz}`)
    assert.ok(saved)
    assert.deepEqual(chunk.geometry.attributes.position.array, saved.terrain)
    assert.deepEqual(chunk.children[0].instanceMatrix.array, saved.rocks)
  }
  surface.requestPointerLock()
  surface.interact()
  surface.update(3)
  assert.equal(state.stage, 'return')
  const base = surface.getLanderPosition().clone()
  setGlobalPlayer(surface, base.clone().add(new THREE.Vector3(2, 1.7, 1)))
  surface.update(0)
  assert.equal(state.stage, 'upload')
  const expectedMarker = base.clone().sub(originOf(surface))
  expectedMarker.y += 2.2
  surface.camera.updateMatrixWorld()
  expectedMarker.project(surface.camera)
  const marker = surface.getBaseMarker()
  near(marker.x, (expectedMarker.x + 1) * 50)
  near(marker.y, (1 - expectedMarker.y) * 50)
  surface.interact()
  assert.equal(state.completedCount, 1)
  assert.equal(state.scanTarget.id, 'signal02')
  // Unlock registers its collider after the scene root has already been shifted.
  surface.update(0)
  const beacon = surface.scene.getObjectByName('Signal 02 / survey beacon')
  assert.equal(beacon.visible, true)
  const beaconGlobal = beacon.getWorldPosition(new THREE.Vector3()).add(originOf(surface))
  near(beaconGlobal.x, state.scanTarget.position.x)
  near(beaconGlobal.z, state.scanTarget.position.z)
  setGlobalPlayer(surface, state.scanTarget.position.clone().add(new THREE.Vector3(3, 1.7, 0)))
  surface.onKeyDown({ key: 'a' })
  for (let i = 0; i < 30; i++) surface.update(1 / 60)
  surface.onKeyUp({ key: 'a' })
  near(surface.getPlayerPosition().x - state.scanTarget.position.x, 1.10001, 0.002)
})

test('collision rebasing preserves sliding and owner removal across repeated positive and negative shifts', () => {
  const collision = createPlayerCollision()
  const remove = collision.addBox({ x: 2, y: 0, z: -10 }, { x: 2.05, y: 3, z: 10 })
  let originX = 0, originZ = 0
  for (const [dx, dz] of [[2000, -2400], [-4000, 4800], [2000, -2400]]) {
    collision.shiftOrigin(dx, dz)
    originX += dx; originZ += dz
    const player = { x: -originX, y: 1.7, z: -originZ }
    collision.move(player, { x: 5, z: 1 }, () => 0)
    near(player.x + originX, 1.59999, 0.00003)
    near(player.z + originZ, 1)
  }
  collision.shiftOrigin(2400, 0)
  remove(); remove()
  const player = { x: -2400, z: 0 }
  collision.move(player, { x: 5, z: 0 }, () => 0)
  near(player.x, -2395)
  collision.clear()
  collision.shiftOrigin(-2400, 0)
  collision.move(player, { x: 5, z: 0 }, () => 0)
  near(player.x, -2390)
})
