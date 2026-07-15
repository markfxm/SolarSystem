import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createInteractions } from '../three/interactions.js'

test('planet fly-to invokes its arrival callback only after the flight completes', () => {
  const originalWindow = globalThis.window
  const originalPerformance = Object.getOwnPropertyDescriptor(globalThis, 'performance')
  let now = 0
  globalThis.window = {
    innerWidth: 1280,
    innerHeight: 720,
    addEventListener: () => {},
    removeEventListener: () => {}
  }
  Object.defineProperty(globalThis, 'performance', {
    configurable: true,
    value: { now: () => now }
  })

  const domElement = {
    addEventListener: () => {},
    removeEventListener: () => {}
  }
  const controls = {
    enabled: true,
    enableRotate: true,
    enablePan: true,
    enableZoom: true,
    enableDamping: true,
    minDistance: 1,
    maxDistance: 10000,
    target: new THREE.Vector3(),
    addEventListener: () => {},
    removeEventListener: () => {},
    update: () => {}
  }
  const earth = new THREE.Mesh()
  earth.position.set(100, 0, 0)
  earth.userData.name = 'earth'
  earth.userData.originalRadius = 3
  let arrivals = 0

  try {
    const interactions = createInteractions({
      engine: {
        camera: new THREE.PerspectiveCamera(),
        controls,
        renderer: { domElement },
        scene: new THREE.Scene(),
        defaultMinDistance: 1,
        defaultMaxDistance: 10000
      },
      planets: [earth],
      planetNames: {},
      timeController: { freeze: () => {}, unfreeze: () => {} }
    })

    interactions.focusPlanetById('earth', () => { arrivals++ })
    assert.equal(arrivals, 0)
    now = 5000
    interactions.update()
    assert.equal(arrivals, 1)
    interactions.dispose()
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
    if (originalPerformance) Object.defineProperty(globalThis, 'performance', originalPerformance)
  }
})
