import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { Sun } from '../planets/Sun/index.js'

test('Sun creates an animated surface and corona', () => {
  const sun = new Sun(10, new THREE.Scene())
  const mesh = sun.create(new THREE.Texture())
  assert.ok(mesh.material.uniforms.time)
  assert.ok(mesh.getObjectByName('sunCorona'))
})

test('Sun visual update advances surface and corona time', () => {
  const sun = new Sun(10, new THREE.Scene())
  sun.create(new THREE.Texture())
  sun.updateVisuals(0.25)
  assert.equal(sun.originalMaterial.uniforms.time.value, 0.25)
  assert.equal(sun.coronaMaterial.uniforms.time.value, 0.25)
})
