import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createPlanetTextureController } from '../three/planetTextureController.js'

function createControllerFixture() {
  const applied = []
  const promoted = []
  const scheduled = []
  const textures = {
    earth_day: new THREE.Texture(),
    earth_night: new THREE.Texture(),
    mars: new THREE.Texture()
  }
  const planetInstances = {
    earth: { updateHQ: (texture, isNight) => applied.push({ name: 'earth', texture, isNight }) },
    mars: { updateHQ: (texture, isNight) => applied.push({ name: 'mars', texture, isNight }) }
  }
  const controller = createPlanetTextureController({
    maps: {
      earth_day: '/earth-day.jpg',
      earth_night: '/earth-night.jpg',
      mars: '/mars.jpg'
    },
    loadTexture: async path => textures[path.includes('night') ? 'earth_night' : path.includes('day') ? 'earth_day' : 'mars'],
    planetInstances,
    detailController: { prioritize: name => promoted.push(name) },
    schedule: callback => scheduled.push(callback)
  })

  return { controller, applied, promoted, scheduled, textures }
}

test('preloading a planet does not change its material or geometry', async () => {
  const fixture = createControllerFixture()
  await fixture.controller.preload('mars')
  assert.deepEqual(fixture.applied, [])
  assert.deepEqual(fixture.promoted, [])
})

test('applying a preloaded planet promotes geometry and swaps its texture', async () => {
  const fixture = createControllerFixture()
  await fixture.controller.preload('mars')
  assert.equal(fixture.controller.apply('mars'), true)
  assert.deepEqual(fixture.promoted, ['mars'])
  assert.deepEqual(fixture.applied, [{ name: 'mars', texture: fixture.textures.mars, isNight: false }])
})

test('Earth night texture is applied on a later frame', async () => {
  const fixture = createControllerFixture()
  await fixture.controller.preload('earth')
  fixture.controller.apply('earth')
  assert.equal(fixture.applied.length, 1)
  assert.equal(fixture.applied[0].isNight, false)
  assert.equal(fixture.scheduled.length, 1)
  fixture.scheduled[0]()
  assert.equal(fixture.applied.length, 2)
  assert.equal(fixture.applied[1].isNight, true)
})

test('failed preload resolves false without applying detail', async () => {
  const controller = createPlanetTextureController({
    maps: { mars: '/mars.jpg' },
    loadTexture: async () => { throw new Error('load failed') },
    planetInstances: { mars: { updateHQ: () => assert.fail('must not apply') } },
    detailController: { prioritize: () => assert.fail('must not promote') }
  })

  assert.equal(await controller.preload('mars'), false)
})
