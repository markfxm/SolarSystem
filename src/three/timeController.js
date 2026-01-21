import { computeD, computeElements, computePosition, computeRotation } from '../utils/Astronomy.js'

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

      // Use absolute rotation based on d
      mesh.rotation.y = computeRotation(name, d)
    })

    // rotate any extra objects (e.g. the Sun)
    if (Array.isArray(extraRotating)) {
      for (const obj of extraRotating) {
        if (obj && obj.userData && obj.userData.name) {
          obj.rotation.y = computeRotation(obj.userData.name, d)
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

  function getSimulationDate() {
    const j2000 = Date.UTC(2000, 0, 1, 12)
    return new Date(j2000 + currentD * 86400000)
  }

  function setDate(date) {
    if (!(date instanceof Date)) return
    currentD = computeD(date)
    updatePositions(currentD)
  }

  return {
    setRealTime,
    setFastSpeed,
    update,
    freeze,
    unfreeze,
    resetTime,
    getSimulationDate,
    setDate
  }
}
