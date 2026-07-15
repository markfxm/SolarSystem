import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { unitSphereGeometry, detailSphereGeometry } from '../three/geometries.js'
import { createPlanetDetailController } from '../three/planetDetail.js'

test('prioritizing one body promotes it and demotes the previous body', () => {
  const earth = new THREE.Mesh(unitSphereGeometry)
  const mars = new THREE.Mesh(unitSphereGeometry)
  const detail = createPlanetDetailController({ earth, mars })
  detail.prioritize('earth')
  assert.equal(earth.geometry, detailSphereGeometry)
  detail.prioritize('mars')
  assert.equal(earth.geometry, unitSphereGeometry)
  assert.equal(mars.geometry, detailSphereGeometry)
})

test('unknown bodies leave the current detail body unchanged', () => {
  const earth = new THREE.Mesh(unitSphereGeometry)
  const detail = createPlanetDetailController({ earth })
  detail.prioritize('earth')
  detail.prioritize('pluto')
  assert.equal(detail.activeName, 'earth')
})
