import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  getPlanetSurfaceProfile,
  createPlanetSurfaceMaterial
} from '../planets/materials/PlanetSurfaceMaterial.js'

test('planet families select intentional surface profiles', () => {
  assert.equal(getPlanetSurfaceProfile('mars').kind, 'rocky')
  assert.equal(getPlanetSurfaceProfile('earth').kind, 'terrestrial')
  assert.equal(getPlanetSurfaceProfile('jupiter').kind, 'gas')
  assert.equal(getPlanetSurfaceProfile('neptune').kind, 'ice')
})

test('rocky surfaces carry more micro detail than gas giants', () => {
  assert.ok(getPlanetSurfaceProfile('mercury').detailStrength > getPlanetSurfaceProfile('saturn').detailStrength)
})

test('Earth material retains day and night texture uniforms', () => {
  const day = new THREE.Texture()
  const night = new THREE.Texture()
  const material = createPlanetSurfaceMaterial('earth', day, night)
  assert.equal(material.uniforms.dayTexture.value, day)
  assert.equal(material.uniforms.nightTexture.value, night)
  assert.equal(material.uniforms.useNight.value, true)
})
