import * as THREE from 'three';

const planetsData = {
  sun: {
    rotationPeriodHours: 25.38 * 24
  },
  mercury: {
    a: 0.387098,
    e: [0.205635, 5.59e-10],
    i: [7.0047, 5.00e-8],
    N: [48.3313, 3.24587e-5],
    w: [29.1241, 1.01444e-5],
    M: [168.6562, 4.0923344368],
    rotationPeriodHours: 1408
  },
  venus: {
    a: 0.723330,
    e: [0.006773, -1.302e-9],
    i: [3.3946, 2.75e-8],
    N: [76.6799, 2.46590e-5],
    w: [54.8910, 1.38374e-5],
    M: [48.0052, 1.6021302244],
    rotationPeriodHours: -5832
  },
  earth: {
    a: 1.000000,
    e: [0.016709, -1.151e-9],
    i: [0, 0],
    N: [0, 0],
    w: [102.9404, 4.70935e-5], // Subtracted 180 from 282.9404
    M: [356.0470, 0.9856002585],
    rotationPeriodHours: 23.934
  },
  mars: {
    a: 1.523688,
    e: [0.093405, 2.516e-9],
    i: [1.8497, -1.78e-8],
    N: [49.5574, 2.11081e-5],
    w: [286.5016, 2.92961e-5],
    M: [18.6021, 0.5240207766],
    rotationPeriodHours: 24.623
  },
  jupiter: {
    a: 5.20256,
    e: [0.048498, 4.469e-9],
    i: [1.3030, -1.557e-7],
    N: [100.4542, 2.76854e-5],
    w: [273.8777, 1.64505e-5],
    M: [19.8950, 0.0830853001],
    rotationPeriodHours: 9.925
  },
  saturn: {
    a: 9.55475,
    e: [0.055546, -9.499e-9],
    i: [2.4886, -1.081e-7],
    N: [113.6634, 2.38980e-5],
    w: [339.3939, 2.97661e-5],
    M: [316.9670, 0.0334442282],
    rotationPeriodHours: 10.656
  },
  uranus: {
    a: 19.18171 - 1.55e-8, // a has linear term, but small
    e: [0.047318, 7.45e-9],
    i: [0.7733, 1.9e-8],
    N: [74.0005, 1.3978e-5],
    w: [96.6612, 3.0565e-5],
    M: [142.5905, 0.011725806],
    rotationPeriodHours: -17.24
  },
  neptune: {
    a: 30.05826 + 3.313e-8, // a has linear term
    e: [0.008606, 2.15e-9],
    i: [1.7700, -2.55e-7],
    N: [131.7806, 3.0173e-5],
    w: [272.8461, -6.027e-6],
    M: [260.2471, 0.005995147],
    rotationPeriodHours: 16.11
  },
  moon: {
    a: 1.0, // Scaled for direction vector computation
    e: [0.0549, 0],
    i: [5.145, 0],
    N: [125.08, -0.0529538083], // Nodal precession ~ -19 deg/year
    w: [318.15, 0.1643573223],  // Apsidal precession ~ +40 deg/year
    M: [115.3654, 13.0649929509],
    rotationPeriodHours: 655.7 // 27.32 days * 24
  }
};

export const PLANETS_DATA = planetsData;

/**
 * IAU J2000 Orientation Constants (Report 2015)
 * alpha0, delta0: North Pole RA/Dec in ICRF (degrees)
 * W0: Prime meridian at J2000 (degrees)
 * Wdot: Rotation rate (degrees/day)
 */
export const ORIENTATION_CONSTANTS = {
  mercury: { alpha0: 281.01, delta0: 61.414, W0: 329.548, Wdot: 6.1385025 },
  venus:   { alpha0: 272.76, delta0: 67.16, W0: 160.20, Wdot: -1.4813688 },
  earth:   { alpha0: 0.00, delta0: 90.00, W0: 190.1406, Wdot: 360.9856235 },
  mars:    { alpha0: 317.681, delta0: 52.886, W0: 176.630, Wdot: 350.8919822 },
  jupiter: { alpha0: 268.05, delta0: 64.49, W0: 284.95, Wdot: 870.5360000 },
  saturn:  { alpha0: 40.58, delta0: 83.537, W0: 38.90, Wdot: 810.7939024 },
  uranus:  { alpha0: 257.31, delta0: -15.175, W0: 203.81, Wdot: -501.1600928 },
  neptune: { alpha0: 299.33, delta0: 42.95, W0: 253.18, Wdot: 536.3128492 },
  moon:    { alpha0: 269.99, delta0: 66.54, W0: 38.32, Wdot: 13.17635815 },
  sun:     { alpha0: 286.13, delta0: 63.87, W0: 84.176, Wdot: 14.1844 }
};

export const J2000_EPOCH = 946728000000;
export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;
export const TWO_PI = Math.PI * 2;
export const INV_TWO_PI = 1.0 / TWO_PI;
export const INV_MS_PER_DAY = 1.0 / 86400000;
export const INV_SEC_PER_DAY = 1.0 / 86400;

/**
 * Pre-convert constants to radians and flatten linear coefficients for performance
 */
(function preConvertData() {
    for (const p in planetsData) {
        const d = planetsData[p];
        if (d.e) {
            // Pre-multiply rates and flatten to avoid array access in hot loops
            d.e0 = d.e[0]; d.e1 = d.e[1];
            d.i0 = d.i[0] * DEG2RAD; d.i1 = d.i[1] * DEG2RAD;
            d.N0 = d.N[0] * DEG2RAD; d.N1 = d.N[1] * DEG2RAD;
            d.w0 = d.w[0] * DEG2RAD; d.w1 = d.w[1] * DEG2RAD;
            d.M0 = d.M[0] * DEG2RAD; d.M1 = d.M[1] * DEG2RAD;
        }
    }
    for (const p in ORIENTATION_CONSTANTS) {
        const c = ORIENTATION_CONSTANTS[p];
        c.alpha0 *= DEG2RAD;
        c.delta0 *= DEG2RAD;
        c.W0 *= DEG2RAD;
        c.Wdot *= DEG2RAD;
        // Pre-calculate half-values to save multiplications in computePlanetQuaternion
        c.W0_half = c.W0 * 0.5;
        c.Wdot_half = c.Wdot * 0.5;
    }
})();

export function computeD(date) {
  // Optimized: Single subtraction and multiplication using pre-calculated J2000 epoch
  return (date.getTime() - J2000_EPOCH) * INV_MS_PER_DAY;
}

// Internal scratch variables to avoid per-frame GC
const _qResult = new THREE.Quaternion();
const _posResult = { x: 0, y: 0, z: 0, r: 0 };
const _elResult = {
    a: 1, e: 0, i: 0, N: 0, w: 0, M: 0, sqrtEE: 1, aSqrtEE: 1,
    Px: 1, Qx: 0, Py: 0, Qy: 1, Pz: 0, Qz: 0,
    PxA: 1, PyA: 0, PzA: 0, QxAS: 0, QyAS: 1, QzAS: 0,
    lastD: -999999, lastPlanet: ''
};

/**
 * Returns orbital elements.
 * Optimized: Threshold-based caching for slow-moving elements (Gaussian constants).
 * Reduces ~6 trig calls and 12+ multiplications per body per frame during real-time.
 */
export function computeElements(planetNameOrData, d, target = null) {
  const data = typeof planetNameOrData === 'string' ? planetsData[planetNameOrData] : planetNameOrData;
  const res = target || _elResult;
  if (!data || data.e0 === undefined) {
    res.a = 1; res.e = 0; res.i = 0; res.N = 0; res.w = 0; res.M = 0; res.sqrtEE = 1; res.aSqrtEE = 1;
    res.Px = 1; res.Qx = 0; res.Py = 0; res.Qy = 1; res.Pz = 0; res.Qz = 0;
    res.PxA = 1; res.PyA = 0; res.PzA = 0; res.QxAS = 0; res.QyAS = 1; res.QzAS = 0;
    return res;
  }

  // Mean Anomaly (M) must be updated every frame for smooth motion
  // Optimized: Uses flattened property for O(1) access
  let M = data.M0 + data.M1 * d;
  res.M = M - Math.floor(M * INV_TWO_PI + 0.5) * TWO_PI;

  // Caching: Slow elements (a, e, i, N, w) change by negligible amounts in 0.01 days (~14 min)
  // Skip recalculation of P/Q vectors if we are within threshold and same planet
  if (res.lastPlanet === data && Math.abs(d - res.lastD) < 0.01) {
    return res;
  }

  res.lastD = d;
  res.lastPlanet = data;

  res.a = data.a;
  // Optimized: Direct flattened property access eliminates array indexing
  res.e = data.e0 + data.e1 * d;
  res.i = data.i0 + data.i1 * d;
  res.N = data.N0 + data.N1 * d;
  res.w = data.w0 + data.w1 * d;

  // Pre-calculate eccentricity constants to avoid redundant math in computePosition
  res.sqrtEE = Math.sqrt(1 - res.e * res.e);
  res.aSqrtEE = res.a * res.sqrtEE;

  // Performance Optimization: Pre-calculate orbital-to-ecliptic transformation coefficients (Gaussian constants).
  const sinW = Math.sin(res.w);
  const cosW = Math.cos(res.w);

  if (res.i === 0 && res.N === 0) {
    res.Px = cosW;
    res.Qx = -sinW;
    res.Py = sinW;
    res.Qy = cosW;
    res.Pz = 0;
    res.Qz = 0;
  } else {
    const sinN = Math.sin(res.N);
    const cosN = Math.cos(res.N);
    const sinI = Math.sin(res.i);
    const cosI = Math.cos(res.i);

    const cosNcosW = cosN * cosW;
    const cosNsinW = cosN * sinW;
    const sinNcosW = sinN * cosW;
    const sinNsinW = sinN * sinW;
    const sinNcosI = sinN * cosI;
    const cosNcosI = cosN * cosI;

    res.Px = cosNcosW - sinNcosI * sinW;
    res.Qx = -cosNsinW - sinNcosI * cosW;
    res.Py = sinNcosW + cosNcosI * sinW;
    res.Qy = -sinNsinW + cosNcosI * cosW;
    res.Pz = sinW * sinI;
    res.Qz = cosW * sinI;
  }

  // Pre-calculate combined constants to save multiplications in computePosition
  const a = res.a;
  const e = res.e;
  const aSqrtEE = res.aSqrtEE;

  res.PxA = res.Px * a;
  res.PyA = res.Py * a;
  res.PzA = res.Pz * a;
  res.QxAS = res.Qx * aSqrtEE;
  res.QyAS = res.Qy * aSqrtEE;
  res.QzAS = res.Qz * aSqrtEE;

  return res;
}

/**
 * Computes world-space position from orbital elements.
 * Optimized: Input elements are now in radians. Reuses sin/cos from Kepler solver and pre-calculated matrix coefficients.
 */
export function computePosition(elements, scale = 10, target = null) {
  const res = target || _posResult;
  const { a, e, M, PxA, PyA, PzA, QxAS, QyAS, QzAS } = elements;

  // Solve Kepler's equation with early exit for low eccentricity
  let E = M;
  let sinE, cosE, denom;
  let converged = false;

  // Performance Optimization: Fast-path for zero-eccentricity orbits (like circular Earth approx)
  if (e < 1e-6) {
    sinE = Math.sin(M);
    cosE = Math.cos(M);
    denom = 1;
    converged = true;
  } else {
    for (let iter = 0; iter < 6; iter++) {
      sinE = Math.sin(E);
      cosE = Math.cos(E);
      denom = 1 - e * cosE;
      const error = E - e * sinE - M;
      if (Math.abs(error) < 1e-6) {
        converged = true;
        break;
      }
      E -= error / denom;
    }
  }

  // Ensure sinE/cosE match the final E if loop didn't break early
  if (!converged) {
    sinE = Math.sin(E);
    cosE = Math.cos(E);
    denom = 1 - e * cosE;
  }

  // Transform directly to Ecliptic plane using pre-calculated combined coefficients
  // Optimized: Factored formula pos = PxA * (cosE - e) + QxAS * sinE
  // saves 3 multiplications and 2 subtractions per call.
  const cosEmE = cosE - e;
  const x = PxA * cosEmE + QxAS * sinE;
  const y = PyA * cosEmE + QyAS * sinE;
  const z = PzA * cosEmE + QzAS * sinE;

  // Ecliptic to World transform (Standard mapping: Ecliptic XY -> World XZ, Ecliptic Z -> World Y)
  res.x = x * scale;
  res.y = z * scale;
  res.z = -y * scale;
  res.r = a * denom * scale;
  return res;
}

const PLANET_QUAT_BASES = {};
const Q_ADJ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);

function initQuatBases() {
  const epsilon = 23.4392911 * DEG2RAD;
  const qEcl = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2 - epsilon);

  Object.keys(ORIENTATION_CONSTANTS).forEach(name => {
    const c = ORIENTATION_CONSTANTS[name];
    // Constants are already in radians
    const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (c.alpha0 + Math.PI / 2));
    const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), (Math.PI / 2 - c.delta0));

    PLANET_QUAT_BASES[name] = new THREE.Quaternion()
        .copy(qEcl)
        .multiply(q1)
        .multiply(q2)
        .multiply(Q_ADJ);
  });
}
initQuatBases();

// Dedicated cache to avoid redundant trig calls for slow planetary rotation (60fps)
const QUAT_CACHE = new Map();

/**
 * Returns a pre-linked rotation cache for a specific planet.
 * Performance Optimization: Pre-links constants and base quaternion to eliminate
 * Map/Object lookups in the 60fps render loop when passed to computePlanetQuaternion.
 */
export function getRotationCache(planetName) {
  const base = PLANET_QUAT_BASES[planetName];
  if (!base) return null;

  let cache = QUAT_CACHE.get(planetName);
  if (!cache) {
    cache = { lastD: -999999, quat: new THREE.Quaternion() };
    QUAT_CACHE.set(planetName, cache);
  }

  return {
    base,
    constants: ORIENTATION_CONSTANTS[planetName],
    cache
  };
}

/**
 * Computes the planetary orientation as a Quaternion in Ecliptic J2000 space.
 * Uses IAU 2015 recommended models.
 * Optimized: Threshold-based caching. Only re-runs unrolled trig if d has shifted
 * by more than 0.0001 days (~8 seconds), saving 2 trig calls and 8 multiplications.
 *
 * Fast Path: Passing a 'rotationCache' (from getRotationCache) eliminates all
 * lookups, providing O(1) performance in the hot path.
 */
export function computePlanetQuaternion(planetName, d, rotationCache = null) {
  const r = rotationCache || getRotationCache(planetName);
  if (!r) return _qResult.identity();

  const cache = r.cache;
  if (Math.abs(d - cache.lastD) < 0.0001) {
    return _qResult.copy(cache.quat);
  }

  const base = r.base;
  const c = r.constants;
  const halfW = c.W0_half + c.Wdot_half * d;
  const s = Math.sin(halfW);
  const cW = Math.cos(halfW);

  // Unrolled quaternion multiplication: qResult = base * q(Y, W)
  const bx = base._x, by = base._y, bz = base._z, bw = base._w;

  const rx = bx * cW - bz * s;
  const ry = by * cW + bw * s;
  const rz = bz * cW + bx * s;
  const rw = bw * cW - by * s;

  cache.lastD = d;
  cache.quat.set(rx, ry, rz, rw);

  return _qResult.copy(cache.quat);
}

// Dedicated Moon scratch objects to avoid interfering with planetary element caching
const _moonElements = {
    a: 1, e: 0, i: 0, N: 0, w: 0, M: 0, sqrtEE: 1, aSqrtEE: 1,
    Px: 1, Qx: 0, Py: 0, Qy: 1, Pz: 0, Qz: 0,
    PxA: 1, PyA: 0, PzA: 0, QxAS: 0, QyAS: 1, QzAS: 0,
    lastD: -999999, lastPlanet: 'moon'
};

export function computeMoonPosition(d, target = null) {
  // Use accurate Keplerian elements for the Moon relative to Earth
  // Optimized: el.a is already 1.0 in planetsData, and computeElements
  // handles all P/Q pre-calculations correctly.
  const el = computeElements('moon', d, _moonElements);
  return computePosition(el, 1, target);
}
