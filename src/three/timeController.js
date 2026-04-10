import * as THREE from 'three'
import { J2000_EPOCH, computeD, computeElements, computePosition, computeMoonPosition, computePlanetQuaternion, getRotationCache, INV_SEC_PER_DAY } from '../utils/Astronomy.js'

export function createTimeController(planetObjects, orbitScale, extraRotating = [], moon = null, moonOrbit = null, moonOrbitRadius = 10) {
  let speedMultiplier = 1
  let currentD = computeD(new Date()) // Initialize once at start
  let isFrozen = false

  // Pre-filter and optimize planet list to avoid Object.entries() and redundant if-checks in the update loop
  const activePlanets = [];
  const planetScratch = {}; // Per-planet scratch objects for threshold-based caching

  for (const name in planetObjects) {
    // Sun stays at origin, and Moon is handled separately in its geocentric loop
    if (name !== 'sun' && name !== 'moon') {
      activePlanets.push({
        name,
        mesh: planetObjects[name],
        rotCache: getRotationCache(name)
      });
      planetScratch[name] = {
        a: 1, e: 0, i: 0, N: 0, w: 0, M: 0, sqrtEE: 1, aSqrtEE: 1,
        Px: 1, Qx: 0, Py: 0, Qy: 1, Pz: 0, Qz: 0,
        PxA: 1, PyA: 0, PzA: 0, QxAS: 0, QyAS: 1, QzAS: 0,
        PxAe: 0, PyAe: 0, PzAe: 0, ae: 0,
        lastD: -999999, lastPlanet: name
      };
    }
  }

  // Pre-process extraRotating objects for efficient iteration
  const optimizedRotating = [];
  if (Array.isArray(extraRotating)) {
    for (let i = 0; i < extraRotating.length; i++) {
      const obj = extraRotating[i];
      if (obj && obj.userData && obj.userData.name) {
        optimizedRotating.push({
          name: obj.userData.name,
          mesh: obj,
          rotCache: getRotationCache(obj.userData.name)
        });
      }
    }
  }

  // Scratch variables to avoid per-frame GC
  const _earthPos = new THREE.Vector3();
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
    // Performance Optimization: Use pre-calculated inverse constant to avoid division
    currentD += deltaSeconds * speedMultiplier * INV_SEC_PER_DAY

    updatePositions(currentD, deltaSeconds)
  }

  function updatePositions(d, deltaSeconds = 0) {
    let hasEarth = false;

    // Use pre-filtered activePlanets to eliminate string comparisons and property lookups in the hot path
    for (let i = 0; i < activePlanets.length; i++) {
      const p = activePlanets[i];
      const name = p.name;
      const mesh = p.mesh;

      // Use per-planet scratch variables to enable threshold-based caching in computeElements
      const el = computeElements(name, d, planetScratch[name]);
      const pos = computePosition(el, orbitScale, _scratchPos);
      mesh.position.set(pos.x, pos.y, pos.z);

      // Use absolute IAU orientation based on d
      // Performance Optimization: Use pre-linked rotCache for O(1) orientation update
      mesh.setRotationFromQuaternion(computePlanetQuaternion(name, d, p.rotCache));

      if (name === 'earth') {
        _earthPos.copy(mesh.position);
        hasEarth = true;
      }
    }

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

    // rotate any extra objects (e.g. the Sun, Moon) using optimized list
    for (let i = 0; i < optimizedRotating.length; i++) {
      const p = optimizedRotating[i];
      // Performance Optimization: Use pre-linked rotCache for O(1) orientation update
      p.mesh.setRotationFromQuaternion(computePlanetQuaternion(p.name, d, p.rotCache));
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
    // Optimized: Use pre-calculated J2000 epoch instead of Date.UTC calls
    return new Date(J2000_EPOCH + currentD * 86400000)
  }

  function setDate(date) {
    if (!(date instanceof Date)) return
    currentD = computeD(date)
    updatePositions(currentD)
  }

  function getSimulationD() {
    return currentD;
  }

  return {
    setRealTime,
    setFastSpeed,
    update,
    freeze,
    unfreeze,
    resetTime,
    getSimulationDate,
    getSimulationD,
    setDate
  }
}
