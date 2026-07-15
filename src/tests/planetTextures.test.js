import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  LOW_RES_PLANET_MAPS,
  HIGH_RES_PLANET_MAPS,
  configureColorTexture,
  configureDataTexture
} from '../three/planetTextures.js'

const renderer = { capabilities: { getMaxAnisotropy: () => 16 } }

test('Moon uses its own low-resolution texture', () => {
  assert.equal(LOW_RES_PLANET_MAPS.moon, '/moon.jpg')
})

test('rocky navigation detail uses 4K textures', () => {
  assert.equal(HIGH_RES_PLANET_MAPS.mercury, '/detail/4k_mercury.jpg')
  assert.equal(HIGH_RES_PLANET_MAPS.venus, '/detail/4k_venus.jpg')
  assert.equal(HIGH_RES_PLANET_MAPS.earth_day, '/detail/4k_earth_daymap.jpg')
  assert.equal(HIGH_RES_PLANET_MAPS.earth_night, '/detail/4k_earth_nightmap.jpg')
  assert.equal(HIGH_RES_PLANET_MAPS.mars, '/detail/4k_mars.jpg')
  assert.equal(HIGH_RES_PLANET_MAPS.moon, '/detail/4k_moon.jpg')
})

test('color textures use sRGB and capped anisotropy', () => {
  const texture = new THREE.Texture()
  configureColorTexture(texture, renderer)
  assert.equal(texture.colorSpace, THREE.SRGBColorSpace)
  assert.equal(texture.anisotropy, 8)
})

test('data textures remain non-color data', () => {
  const texture = new THREE.Texture()
  configureDataTexture(texture, renderer)
  assert.equal(texture.colorSpace, THREE.NoColorSpace)
  assert.equal(texture.anisotropy, 8)
})
