import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'

globalThis.window = {
  innerWidth: 1024,
  innerHeight: 768
}

const { AspectLinesManager } = await import('../utils/AspectLines.js')

test('AspectLinesManager initializes correctly', () => {
  const scene = new THREE.Scene()
  const planetObjects = {
    sun: new THREE.Mesh(),
    earth: new THREE.Mesh()
  }
  const manager = new AspectLinesManager(scene, planetObjects)

  assert.equal(manager.activeLinesList.length, 0)
  assert.equal(manager.lines.size, 0)
})

test('AspectLinesManager adds aspect lines and keeps activeLinesList in sync', () => {
  const scene = new THREE.Scene()
  const sunMesh = new THREE.Mesh()
  sunMesh.position.set(0, 0, 0)
  const earthMesh = new THREE.Mesh()
  earthMesh.position.set(10, 0, 0)

  const planetObjects = {
    sun: sunMesh,
    earth: earthMesh
  }
  const manager = new AspectLinesManager(scene, planetObjects)

  const aspects = [
    {
      p1: 'sun',
      p2: 'earth',
      aspect: {
        type: 'conjunction',
        color: 0xff0000,
        orb: 0.1
      }
    }
  ]

  manager.update(aspects)

  assert.equal(manager.lines.size, 1)
  assert.equal(manager.activeLinesList.length, 1)

  const lineData = manager.activeLinesList[0]
  assert.equal(lineData.aspectType, 'conjunction')
  assert.equal(manager.lines.get(lineData.key), lineData)
})

test('AspectLinesManager removes fully faded lines and updates activeLinesList backward iteration', () => {
  const scene = new THREE.Scene()
  const sunMesh = new THREE.Mesh()
  sunMesh.position.set(0, 0, 0)
  const earthMesh = new THREE.Mesh()
  earthMesh.position.set(10, 0, 0)

  const planetObjects = {
    sun: sunMesh,
    earth: earthMesh
  }
  const manager = new AspectLinesManager(scene, planetObjects)

  const aspects = [
    {
      p1: 'sun',
      p2: 'earth',
      aspect: {
        type: 'conjunction',
        color: 0xff0000,
        orb: 0.1
      }
    }
  ]

  // First frame: Add
  manager.update(aspects)
  assert.equal(manager.lines.size, 1)
  assert.equal(manager.activeLinesList.length, 1)

  const data = manager.activeLinesList[0]

  // Second frame: Aspect is no longer active
  // Since it was added, first we fade. Let's make sure opacity is close to 0 to trigger immediate removal
  data.line.material.opacity = 0.005 // Trigger immediate disposal

  // Update without aspects to trigger fade/cleanup
  manager.update([])

  // The line should be fully disposed and removed
  assert.equal(manager.lines.size, 0)
  assert.equal(manager.activeLinesList.length, 0)
})

test('AspectLinesManager dispose cleans up arrays and maps', () => {
  const scene = new THREE.Scene()
  const sunMesh = new THREE.Mesh()
  sunMesh.position.set(0, 0, 0)
  const earthMesh = new THREE.Mesh()
  earthMesh.position.set(10, 0, 0)

  const planetObjects = {
    sun: sunMesh,
    earth: earthMesh
  }
  const manager = new AspectLinesManager(scene, planetObjects)

  const aspects = [
    {
      p1: 'sun',
      p2: 'earth',
      aspect: {
        type: 'conjunction',
        color: 0xff0000,
        orb: 0.1
      }
    }
  ]

  manager.update(aspects)
  assert.equal(manager.activeLinesList.length, 1)

  manager.dispose()
  assert.equal(manager.lines.size, 0)
  assert.equal(manager.activeLinesList.length, 0)
})
