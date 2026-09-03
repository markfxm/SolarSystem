import * as THREE from 'three'
import { J2000_EPOCH, computeD, computeElements, computePosition, computeMoonPosition, computePlanetQuaternion, getRotationCache, INV_SEC_PER_DAY, PLANETS_DATA } from '../utils/Astronomy.js'

export function createTimeController(planetObjects, orbitScale, extraRotating = [], moon = null, moonOrbit = null, moonOrbitRadius = 10) {
  let speedMultiplier = 1
  let currentD = computeD(new Date()) // Initialize once at start
  let isFrozen = false

  // Pre-filter and optimize planet list to avoid Object.entries() and redundant if-checks in the update loop
  const activePlanets = [];
  let earthEntry = null;

  for (const name in planetObjects) {
    // Sun stays at origin, and Moon is handled separately in its geocentric loop
    if (name !== 'sun' && name !== 'moon') {
      const data = PLANETS_DATA[name];
      const entry = {
        name,
        data, // Performance Boost: Pre-linked data object for O(1) access in computeElements
        mesh: planetObjects[name],
        rotCache: getRotationCache(name),
        lastQuatD: -999999, // Performance Boost: Timestamp tracking for O(1) rotation update skip
        // Performance Optimization: store per-planet scratch objects directly on the planet entry
        // to eliminate Map-like lookups in the hot path.
        scratch: {
          a: 1, aScaled: 1, e: 0, i: 0, N: 0, w: 0, M: 0, sqrtEE: 1, aSqrtEE: 1,
          Px: 1, Qx: 0, Py: 0, Qy: 1, Pz: 0, Qz: 0,
          PxA: 1, PyA: 0, PzA: 0, QxAS: 0, QyAS: 1, QzAS: 0,
          lastD: -999999, lastPlanet: data, lastE: 0, lastM: 0, lastScale: -1
        }
      };
      activePlanets.push(entry);
      if (name === 'earth') earthEntry = entry;
    }
  }

  for (let i = 0; i < activePlanets.length; i++) {
    const mesh = activePlanets[i].mesh;
    if (mesh.matrixAutoUpdate) mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
  }

  // Pre-process extraRotating objects for efficient iteration
  const optimizedRotating = [];
  if (Array.isArray(extraRotating)) {
    for (let i = 0; i < extraRotating.length; i++) {
      const obj = extraRotating[i];
      if (obj && obj.userData && obj.userData.name) {
        if (obj.matrixAutoUpdate) obj.matrixAutoUpdate = false;
        obj.updateMatrix();
        optimizedRotating.push({
          name: obj.userData.name,
          mesh: obj,
          rotCache: getRotationCache(obj.userData.name),
          lastQuatD: -999999
        });
      }
    }
  }

  if (moon) {
    if (moon.matrixAutoUpdate) moon.matrixAutoUpdate = false;
    moon.updateMatrix();
  }
  if (moonOrbit) {
    if (moonOrbit.matrixAutoUpdate) moonOrbit.matrixAutoUpdate = false;
    moonOrbit.updateMatrix();
  }

  // Scratch variables to avoid per-frame GC
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
    // Use pre-filtered activePlanets to eliminate string comparisons and property lookups in the hot path
    for (let i = 0; i < activePlanets.length; i++) {
      const { name, data, mesh, rotCache, scratch } = activePlanets[i];

      // Optimized: Use pre-linked data object and per-planet scratch
      // This eliminates string hashing/lookups and array indexing in the hot path.
      const el = computeElements(data, d, scratch, orbitScale);
      const pos = computePosition(el, _scratchPos);

      // Performance Optimization: Only update position if movement exceeds 1e-5 units.
      // This avoids redundant Three.js matrix recalculations and world matrix dirty flags
      // during real-time or slow simulation speeds, as planets move negligibly per frame.
      let changed = false;
      const curPos = mesh.position;
      if (Math.abs(pos.x - curPos.x) > 1e-5 || Math.abs(pos.y - curPos.y) > 1e-5 || Math.abs(pos.z - curPos.z) > 1e-5) {
        mesh.position.set(pos.x, pos.y, pos.z);
        changed = true;
      }

      // Performance Optimization: Skip redundant rotation updates and quaternion equality checks
      // by comparing the entry's last apply timestamp with the rotation cache's update timestamp.
      const quat = computePlanetQuaternion(name, d, rotCache);
      if (activePlanets[i].lastQuatD !== rotCache.cache.lastD) {
        mesh.setRotationFromQuaternion(quat);
        activePlanets[i].lastQuatD = rotCache.cache.lastD;
        changed = true;
      }

      // Performance Optimization: Manually update matrix if position or rotation changed.
      // Since matrixAutoUpdate is disabled for planets, this is required for correct rendering.
      if (changed) {
        mesh.updateMatrix();
      }
    }

    // Update Moon Position (Geocentric orbit)
    // Performance Optimization: Cache Earth mesh position coordinates (ex, ey, ez) into local variables.
    // This eliminates repeated object property lookups and vector method calls in 60fps loops.
    if (moon && earthEntry) {
      const earthPos = earthEntry.mesh.position;
      const ex = earthPos.x;
      const ey = earthPos.y;
      const ez = earthPos.z;
      const moonLocal = computeMoonPosition(d, moonOrbitRadius, _scratchPos);

      const tx = ex + moonLocal.x;
      const ty = ey + moonLocal.y;
      const tz = ez + moonLocal.z;

      // Performance Optimization: Apply same 1e-5 threshold for geocentric Moon updates.
      const curMoonPos = moon.position;
      if (Math.abs(tx - curMoonPos.x) > 1e-5 || Math.abs(ty - curMoonPos.y) > 1e-5 || Math.abs(tz - curMoonPos.z) > 1e-5) {
        moon.position.set(tx, ty, tz);
        // Performance Optimization: Manually update Moon matrix as matrixAutoUpdate is disabled.
        moon.updateMatrix();
      }

      // Update Moon Orbit Line Position (moves with Earth)
      // Performance Optimization: Use 1e-5 threshold component check instead of .equals() to skip redundant updates.
      if (moonOrbit) {
        const curOrbitPos = moonOrbit.position;
        if (Math.abs(ex - curOrbitPos.x) > 1e-5 || Math.abs(ey - curOrbitPos.y) > 1e-5 || Math.abs(ez - curOrbitPos.z) > 1e-5) {
          moonOrbit.position.set(ex, ey, ez);
          // Performance Optimization: Manually update Moon Orbit matrix as matrixAutoUpdate is disabled.
          moonOrbit.updateMatrix();
        }
      }
    }

    // rotate any extra objects (e.g. the Sun, Moon) using optimized list
    for (let i = 0; i < optimizedRotating.length; i++) {
      const entry = optimizedRotating[i];
      const { name, mesh, rotCache } = entry;
      // Performance Optimization: Skip redundant rotation updates
      const quat = computePlanetQuaternion(name, d, rotCache);
      if (entry.lastQuatD !== rotCache.cache.lastD) {
        mesh.setRotationFromQuaternion(quat);
        entry.lastQuatD = rotCache.cache.lastD;
        // Performance Optimization: Manually update matrix as matrixAutoUpdate is disabled for planets/sun/moon.
        mesh.updateMatrix();
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
