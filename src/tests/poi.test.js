import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'

globalThis.window = {
  innerWidth: 1024,
  innerHeight: 768
}

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {}
  }
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: (tag) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            clearRect: () => {},
            measureText: () => ({ width: 50 }),
            fillText: () => {},
            strokeText: () => {},
            font: '',
            fillStyle: '',
            textAlign: '',
            textBaseline: '',
            shadowColor: '',
            shadowBlur: 0
          })
        }
      }
      return {}
    }
  }
}

const { createPOIMarkers, updatePOIVisibility, animatePOIs } = await import('../utils/POI.js')

test('createPOIMarkers creates interactive POI group with correct layer and matrix flags', () => {
  const marsPOIs = createPOIMarkers('mars', 3.1)
  assert.ok(marsPOIs)
  assert.equal(marsPOIs.name, 'POIs_mars')
  assert.equal(marsPOIs.matrixAutoUpdate, false)
  assert.equal(marsPOIs.userData.isPOIGroup, true)

  // Mars has 5 POIs
  assert.equal(marsPOIs.children.length, 5)

  const firstPoi = marsPOIs.children[0]
  assert.equal(firstPoi.userData.isPOI, true)
  assert.equal(firstPoi.userData.planetName, 'mars')
  assert.ok(firstPoi.userData.dot)
  assert.ok(firstPoi.userData.label)
  assert.equal(firstPoi.userData.dot.matrixAutoUpdate, false)
  assert.equal(firstPoi.userData.label.matrixAutoUpdate, false)
})

test('updatePOIVisibility toggles group visibility based on camera distance', () => {
  const marsPOIs = createPOIMarkers('mars', 3.1)
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
  const planetPosition = new THREE.Vector3(0, 0, 0)

  // Camera close to planet (< Math.sqrt(1600) = 40 units)
  camera.position.set(0, 0, 30)
  updatePOIVisibility(marsPOIs, camera, planetPosition)
  assert.equal(marsPOIs.visible, true)

  // Camera far from planet (> 40 units)
  camera.position.set(0, 0, 100)
  updatePOIVisibility(marsPOIs, camera, planetPosition)
  assert.equal(marsPOIs.visible, false)
})

test('animatePOIs lerps and snaps scale on hover state changes', () => {
  const marsPOIs = createPOIMarkers('mars', 3.1)
  marsPOIs.visible = true

  const poiGroup = marsPOIs.children[0]
  const dot = poiGroup.userData.dot
  const label = poiGroup.userData.label

  assert.equal(dot.scale.x, 1.0)

  // Set hover state
  poiGroup.userData.isHovered = true

  // Animate one frame: scale should lerp towards 1.5
  animatePOIs(marsPOIs)
  assert.ok(dot.scale.x > 1.0)
  assert.ok(dot.scale.x < 1.5)
  assert.equal(dot.scale.x, label.scale.x)

  // Animate repeatedly until target 1.5 is reached / snapped
  for (let i = 0; i < 100; i++) {
    animatePOIs(marsPOIs)
  }
  assert.equal(dot.scale.x, 1.5)
  assert.equal(label.scale.x, 1.5)

  // Unhover state
  poiGroup.userData.isHovered = false
  for (let i = 0; i < 100; i++) {
    animatePOIs(marsPOIs)
  }
  assert.equal(dot.scale.x, 1.0)
  assert.equal(label.scale.x, 1.0)
})
