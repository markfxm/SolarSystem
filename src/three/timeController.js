import * as THREE from 'three'
import { computeD, computeElements, computePosition, computeMoonPosition, computePlanetQuaternion } from '../utils/Astronomy.js'

export function createTimeController(planetObjects, orbitScale, extraRotating = [], moon = null, moonOrbit = null, moonOrbitRadius = 10) {
  let speedMultiplier = 1
  let currentD = computeD(new Date()) // Initialize once at start
  let isFrozen = false

  // Scratch variables to avoid per-frame GC
  const _earthPos = new THREE.Vector3();
  const _scratchEl = { a: 1, e: 0, i: 0, N: 0, w: 0, M: 0 };
  const _scratchPos = { x: 0, y: 0, z: 0, r: 0 };

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
    let hasEarth = false;

    Object.entries(planetObjects).forEach(([name, mesh]) => {
      if (name === 'sun') return; // Sun stays at origin

      // Use scratch variables to avoid allocations
      const el = computeElements(name, d, _scratchEl);
      const pos = computePosition(el, orbitScale, _scratchPos);
      mesh.position.set(pos.x, pos.y, pos.z);

      // Use absolute IAU orientation based on d
      mesh.setRotationFromQuaternion(computePlanetQuaternion(name, d));

      if (name === 'earth') {
        _earthPos.copy(mesh.position);
        hasEarth = true;
      }
    });

    // Update Moon Position (Geocentric orbit)
    if (moon && hasEarth) {
      const moonLocal = computeMoonPosition(d, _scratchPos);
      // Apply visual scale for distance
      const r = moonOrbitRadius;

      moon.position.set(
        _earthPos.x + moonLocal.x * r,
        _earthPos.y + moonLocal.y * r,
        _earthPos.z + moonLocal.z * r
      );

      // Update Moon Orbit Line Position (moves with Earth)
      if (moonOrbit) {
        moonOrbit.position.copy(_earthPos);
      }
    }

    // rotate any extra objects (e.g. the Sun, Moon)
    if (Array.isArray(extraRotating)) {
      for (const obj of extraRotating) {
        if (obj && obj.userData && obj.userData.name) {
          const name = obj.userData.name;
          obj.setRotationFromQuaternion(computePlanetQuaternion(name, d));
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
