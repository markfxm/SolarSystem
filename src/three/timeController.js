import { computeD, computeElements, computePosition, computeRotation, computeMoonPosition } from '../utils/Astronomy.js'

export function createTimeController(planetObjects, orbitScale, extraRotating = [], moon = null, moonOrbit = null, moonOrbitRadius = 10) {
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
    let earthPos = null;

    Object.entries(planetObjects).forEach(([name, mesh]) => {
      if (name === 'sun') return; // Sun stays at origin
      const el = computeElements(name, d)
      const pos = computePosition(el, orbitScale)
      mesh.position.set(pos.x, pos.y, pos.z)

      // Use absolute rotation based on d
      mesh.rotation.y = computeRotation(name, d)

      if (name === 'earth') {
        earthPos = mesh.position.clone();
      }
    })

    // Update Moon Position (Geocentric orbit)
    if (moon && earthPos) {
      const moonLocal = computeMoonPosition(d);
      // Apply visual scale for distance
      const r = moonOrbitRadius;

      moon.position.set(
        earthPos.x + moonLocal.x * r,
        earthPos.y + moonLocal.y * r,
        earthPos.z + moonLocal.z * r
      );

      // Update Moon Orbit Line Position (moves with Earth)
      if (moonOrbit) {
        moonOrbit.position.copy(earthPos);
      }
    }

    // rotate any extra objects (e.g. the Sun, Moon)
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
