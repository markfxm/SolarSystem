import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {}
}

const { Earth } = await import('../planets/Earth/index.js')

function createEarth() {
  const earth = new Earth(3, new THREE.Scene())
  earth.addGrid = () => {}
  earth.addPOIs = () => {}
  return earth
}

test('Earth creates atmosphere and cloud shells', () => {
  const earth = createEarth()
  const mesh = earth.create(new THREE.Texture(), new THREE.Texture())
  assert.ok(mesh.getObjectByName('earthAtmosphere'))
  assert.ok(mesh.getObjectByName('earthClouds'))
})

test('Earth visual update advances cloud time', () => {
  const earth = createEarth()
  earth.create(new THREE.Texture(), new THREE.Texture())
  const before = earth.cloudMaterial.uniforms.time.value
  earth.updateVisuals(0.5)
  assert.equal(earth.cloudMaterial.uniforms.time.value, before + 0.5)
})
