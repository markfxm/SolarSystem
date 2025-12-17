import { computeD, computeElements, computePosition } from '../utils/Astronomy.js'

export function createTimeController(planetObjects, orbitScale) {
  let speedMode = 'real'
  let speedMultiplier = 1
  let baseD = 0
  let isFrozen = false


  function setRealTime() {
    speedMode = 'real'
    speedMultiplier = 1
    baseD = computeD(new Date())
    updatePositions(baseD)
  }

  function setFastSpeed(multiplier = 500000) {
    speedMode = 'fast'
    speedMultiplier = multiplier
  }

  function update(deltaSeconds) {
  if (isFrozen) return

  let d
  if (speedMode === 'real') {
    d = computeD(new Date())
  } else {
    if (baseD === 0) baseD = computeD(new Date())
    baseD += deltaSeconds * speedMultiplier / 86400
    d = baseD
  }

  updatePositions(d, deltaSeconds)
}


  function updatePositions(d, deltaSeconds = 0) {
    Object.entries(planetObjects).forEach(([name, mesh]) => {
      const el = computeElements(name, d)
      const pos = computePosition(el, orbitScale)
      mesh.position.set(pos.x, pos.y, pos.z)

      if (deltaSeconds) {
        mesh.rotation.y += mesh.userData.rotationSpeed * deltaSeconds
      }
    })
  }

  function freeze() {
    isFrozen = true
  }

  function unfreeze() {
    isFrozen = false
  }


  return {
    setRealTime,
    setFastSpeed,
    update,
    freeze,
    unfreeze
  }
}
