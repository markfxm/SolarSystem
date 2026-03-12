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
    a: 0.00257, // Real semi-major axis in AU (not used for visual scale, but for physics if needed)
    e: [0.0549, 0],
    i: [5.145, 0],
    N: [125.08, -0.0529538083], // Nodal precession ~ -19 deg/year
    w: [318.15, 0.1643573223],  // Apsidal precession ~ +40 deg/year
    M: [115.3654, 13.0649929509],
    rotationPeriodHours: 655.7 // 27.32 days * 24
  }
};

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

/**
 * Pre-convert constants to radians at module initialization
 */
(function preConvertData() {
    for (const p in planetsData) {
        const d = planetsData[p];
        if (d.e) {
            d.i[0] *= DEG2RAD; d.i[1] *= DEG2RAD;
            d.N[0] *= DEG2RAD; d.N[1] *= DEG2RAD;
            d.w[0] *= DEG2RAD; d.w[1] *= DEG2RAD;
            d.M[0] *= DEG2RAD; d.M[1] *= DEG2RAD;
        }
    }
    for (const p in ORIENTATION_CONSTANTS) {
        const c = ORIENTATION_CONSTANTS[p];
        c.alpha0 *= DEG2RAD;
        c.delta0 *= DEG2RAD;
        c.W0 *= DEG2RAD;
        c.Wdot *= DEG2RAD;
    }
})();

export function computeD(date) {
  // Optimized: Single subtraction and division using pre-calculated J2000 epoch
  return (date.getTime() - J2000_EPOCH) / 86400000;
}

// Internal scratch variables to avoid per-frame GC
const _qResult = new THREE.Quaternion();
const _q3 = new THREE.Quaternion();
const _posResult = { x: 0, y: 0, z: 0, r: 0 };
const _elResult = { a: 1, e: 0, i: 0, N: 0, w: 0, M: 0, sqrtEE: 1 };

/**
 * Returns orbital elements.
 * Optimized: Now returns values in radians by default.
 */
export function computeElements(planetName, d, target = null) {
  const data = planetsData[planetName];
  const res = target || _elResult;
  if (!data || !data.e) {
    res.a = 1; res.e = 0; res.i = 0; res.N = 0; res.w = 0; res.M = 0; res.sqrtEE = 1;
    return res;
  }
  res.a = data.a;
  res.e = data.e[0] + data.e[1] * d;
  res.i = data.i[0] + data.i[1] * d;
  res.N = data.N[0] + data.N[1] * d;
  res.w = data.w[0] + data.w[1] * d;
  res.M = data.M[0] + data.M[1] * d;
  // Pre-calculate eccentricity constant to avoid repeated Math.sqrt in computePosition
  res.sqrtEE = Math.sqrt(1 - res.e * res.e);
  return res;
}

/**
 * Computes world-space position from orbital elements.
 * Optimized: Input elements are now in radians. Reuses sin/cos from Kepler solver.
 */
export function computePosition(elements, scale = 10, target = null) {
  const res = target || _posResult;
  const a = elements.a;
  const e = elements.e;
  const i = elements.i;
  const N = elements.N;
  const w = elements.w;
  const sqrtEE = elements.sqrtEE;
  let M = elements.M;

  // Reduce M to [-π, π]
  M = M - Math.floor(M / TWO_PI + 0.5) * TWO_PI;

  // Solve Kepler's equation with early exit for low eccentricity
  let E = M;
  let sinE, cosE, denom;
  for (let iter = 0; iter < 6; iter++) {
    sinE = Math.sin(E);
    cosE = Math.cos(E);
    denom = 1 - e * cosE;
    const error = E - e * sinE - M;
    if (Math.abs(error) < 1e-6) break;
    E -= error / denom;
  }

  // Optimized orbital plane coordinates using substitution:
  // r*cos(v) = a * (cosE - e)
  // r*sin(v) = a * sqrt(1 - e^2) * sinE
  // r = a * denom
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);
  const rCosV = a * (cosE - e);
  const rSinV = a * sqrtEE * sinE;

  const xOrb = rCosV * cosW - rSinV * sinW;
  const yOrb = rSinV * cosW + rCosV * sinW;

  // Distance from primary for scaling - reusing the last calculated denominator
  const r = a * denom;

  let x, y, z;
  // Fast-path for planets with zero inclination (e.g. Earth)
  if (i === 0 && N === 0) {
    x = xOrb;
    y = yOrb;
    z = 0;
  } else {
    const cosN = Math.cos(N);
    const sinN = Math.sin(N);
    const cosI = Math.cos(i);
    const sinI = Math.sin(i);

    x = xOrb * cosN - yOrb * cosI * sinN;
    y = xOrb * sinN + yOrb * cosI * cosN;
    z = yOrb * sinI;
  }

  // Ecliptic to World transform
  res.x = x * scale;
  res.y = z * scale;
  res.z = -y * scale;
  res.r = r * scale;
  return res;
}

const PLANET_QUAT_BASES = {};
const Q_ADJ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
const _vAxisY = new THREE.Vector3(0, 1, 0);

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

/**
 * Computes the planetary orientation as a Quaternion in Ecliptic J2000 space.
 * Uses IAU 2015 recommended models.
 * Optimized with pre-computed bases and unrolled quaternion math to avoid GC and redundant trig.
 */
export function computePlanetQuaternion(planetName, d) {
  const base = PLANET_QUAT_BASES[planetName];
  if (!base) return _qResult.identity();

  const c = ORIENTATION_CONSTANTS[planetName];
  // Constants are already in radians. W is the prime meridian rotation.
  const halfW = (c.W0 + c.Wdot * d) * 0.5;

  const s = Math.sin(halfW);
  const cW = Math.cos(halfW);

  // Unrolled quaternion multiplication: qResult = base * q(Y, W)
  // where q(Y, W) has x=0, y=sin(W/2), z=0, w=cos(W/2)
  const bx = base._x, by = base._y, bz = base._z, bw = base._w;

  _qResult._x = bx * cW - bz * s;
  _qResult._y = by * cW + bw * s;
  _qResult._z = bz * cW + bx * s;
  _qResult._w = bw * cW - by * s;

  return _qResult;
}

export function computeMoonPosition(d, target = null) {
  // Use accurate Keplerian elements for the Moon relative to Earth
  const el = computeElements('moon', d);

  // We want a normalized direction vector for the visual scaler to use.
  // The real 'a' is 0.00257 AU, which is too small for our visual logic.
  // We force 'a' to 1 so the result is effectively on a unit sphere (eccentricity aside),
  // which allows timeController to apply the visual radius (MOON_ORBIT_RADIUS).
  el.a = 1;

  return computePosition(el, 1, target);
}
