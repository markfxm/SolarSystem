import { computeD, computeElements, computePosition } from '../utils/Astronomy.js'

export function createTimeController(planetObjects, orbitScale, extraRotating = []) {
  let speedMultiplier = 1
  let currentD = computeD(new Date()) // Initialize once at start
  let isFrozen = false

  function setRealTime() {
    speedMultiplier = 1
  }

  function setFastSpeed(multiplier = 500000) {
    speedMultiplier = multiplier
  }

  function update(deltaSeconds) {
    if (isFrozen) return

    // Always accumulate time based on speed multiplier
    // 86400 seconds in a day
    currentD += deltaSeconds * speedMultiplier / 86400

    updatePositions(currentD, deltaSeconds)
  }

  function updatePositions(d, deltaSeconds = 0) {
    Object.entries(planetObjects).forEach(([name, mesh]) => {
      const el = computeElements(name, d)
      const pos = computePosition(el, orbitScale)
      mesh.position.set(pos.x, pos.y, pos.z)

      if (deltaSeconds) {
        // Rotation speed scaler: always use speedMultiplier
        mesh.rotation.y += (mesh.userData.rotationSpeed || 0) * deltaSeconds * speedMultiplier
      }
    })

    // rotate any extra objects (e.g. the Sun) with same scaling
    if (deltaSeconds && Array.isArray(extraRotating)) {
      for (const obj of extraRotating) {
        if (obj && obj.userData && obj.userData.rotationSpeed) {
          obj.rotation.y += obj.userData.rotationSpeed * deltaSeconds * speedMultiplier
        }
      }
    }
  }

  function freeze() {
    isFrozen = true
  }

  function unfreeze() {
    isFrozen = false
  }

  function resetTime() {
    speedMultiplier = 1
    currentD = computeD(new Date())
    updatePositions(currentD)
  }

  return {
    setRealTime,
    setFastSpeed,
    update,
    freeze,
    unfreeze,
    resetTime
  }
}
