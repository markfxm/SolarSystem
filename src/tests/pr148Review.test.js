import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { PLANET_DATA } from '../data/planetData.ts'
import { createEllipticalOrbit } from '../utils/EllipticalOrbit.ts'
import { captureHighRes } from '../utils/ScreenshotEngine.ts'
import { createStarfield } from '../utils/Starfield.ts'

const generatedFiles = [
  '../data/planetData.js',
  '../types/planet.js',
  '../utils/EllipticalOrbit.js',
  '../utils/HolographicMaterial.js',
  '../utils/ScreenshotEngine.js',
  '../utils/Starfield.js',
  '../utils/i18n.js'
]

test('TypeScript source files are not shadowed by generated JavaScript', () => {
  for (const path of generatedFiles) {
    assert.equal(existsSync(fileURLToPath(new URL(path, import.meta.url))), false, path)
  }
})

test('high-resolution capture serializes the WebGL canvas directly and restores state', async () => {
  const renderer = {
    domElement: {
      toDataURL: () => 'data:image/png;base64,captured'
    },
    size: new THREE.Vector2(1280, 720),
    pixelRatio: 2,
    renderCount: 0,
    getSize(target) {
      return target.copy(this.size)
    },
    getPixelRatio() {
      return this.pixelRatio
    },
    setPixelRatio(value) {
      this.pixelRatio = value
    },
    setSize(width, height) {
      this.size.set(width, height)
    },
    render() {
      this.renderCount += 1
    }
  }
  const camera = new THREE.PerspectiveCamera(45, 16 / 9)

  const result = await captureHighRes(renderer, new THREE.Scene(), camera, 3840, 2160)

  assert.equal(result, 'data:image/png;base64,captured')
  assert.equal(camera.aspect, 16 / 9)
  assert.deepEqual(renderer.size.toArray(), [1280, 720])
  assert.equal(renderer.pixelRatio, 2)
  assert.equal(renderer.renderCount, 2)
})

test('high-resolution capture restores state when serialization fails', async () => {
  const renderer = {
    domElement: {
      toDataURL: () => {
        throw new Error('capture failed')
      }
    },
    size: new THREE.Vector2(800, 600),
    pixelRatio: 1.5,
    getSize(target) {
      return target.copy(this.size)
    },
    getPixelRatio() {
      return this.pixelRatio
    },
    setPixelRatio(value) {
      this.pixelRatio = value
    },
    setSize(width, height) {
      this.size.set(width, height)
    },
    render() {}
  }
  const camera = new THREE.PerspectiveCamera(45, 4 / 3)
  const originalError = console.error
  console.error = () => {}

  try {
    const result = await captureHighRes(renderer, new THREE.Scene(), camera, 1920, 1080)

    assert.equal(result, null)
    assert.equal(camera.aspect, 4 / 3)
    assert.deepEqual(renderer.size.toArray(), [800, 600])
    assert.equal(renderer.pixelRatio, 1.5)
  } finally {
    console.error = originalError
  }
})

test('starfield uses a uniform material size without an unused size attribute', () => {
  const scene = new THREE.Scene()

  createStarfield(scene)

  const starfield = scene.children[0]
  assert.equal(starfield.geometry.getAttribute('size'), undefined)
  assert.equal(starfield.material.size, 1.5)
})

test('elliptical orbit can be created without a browser window', () => {
  const orbit = createEllipticalOrbit({
    a: 1,
    e: 0.1,
    i: 0,
    N: 0,
    w: 0,
    PxA: 1,
    PyA: 0,
    PzA: 0,
    QxAS: 0,
    QyAS: 1,
    QzAS: 0
  }, 16)

  assert.equal(orbit.userData.isOrbit, true)
  orbit.geometry.dispose()
  orbit.material.dispose()
})

test('Mercury shrinking fact uses the correct Chinese pronoun', () => {
  assert.equal(PLANET_DATA.zh.mercury.facts[1], '随着铁核冷却，它其实正在缩小。')
})
