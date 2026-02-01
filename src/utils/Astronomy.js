import * as THREE from 'three';

const planetsData = {
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

export function computeD(date) {
  // Days since J2000.0 (Jan 1.5, 2000)
  // Date.UTC(2000, 0, 1, 12) is J2000.0
  const j2000 = Date.UTC(2000, 0, 1, 12);
  const current = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  );
  return (current - j2000) / 86400000;
}

function rev(x) {
  return x - Math.floor(x / 360) * 360;
}

export function computeElements(planetName, d) {
  const data = planetsData[planetName];
  return {
    a: data.a, // Uranus and Neptune have linear terms, but apply if specified
    e: data.e[0] + data.e[1] * d,
    i: data.i[0] + data.i[1] * d,
    N: data.N[0] + data.N[1] * d,
    w: data.w[0] + data.w[1] * d,
    M: data.M[0] + data.M[1] * d
  };
}

// Astronomy.js — replace the old computePosition with this one
export function computePosition(elements, scale = 10) {
  // Work completely in radians from the start
  const a = elements.a;
  const e = elements.e;
  const i = elements.i * Math.PI / 180;
  const N = elements.N * Math.PI / 180;        // longitude of ascending node
  const w = elements.w * Math.PI / 180;        // argument of perihelion
  let M = elements.M * Math.PI / 180;          // mean anomaly in radians

  // Reduce M to [-π, π] (optional but safer)
  M = M - Math.floor(M / (2 * Math.PI) + 0.5) * 2 * Math.PI;

  // Solve Kepler's equation — 10 iterations is more than enough for perfect precision
  let E = e < 0.05 ? M : (M + e * Math.sin(M)) / (1 - e * Math.cos(M)); // better initial guess for low e
  for (let iter = 0; iter < 10; iter++) {
    const sinE = Math.sin(E);
    const cosE = Math.cos(E);
    const f = E - e * sinE - M;
    const fprime = 1 - e * cosE;
    E -= f / fprime;
  }

  // True anomaly ν
  const cosV = (Math.cos(E) - e) / (1 - e * Math.cos(E));
  const sinV = Math.sqrt(1 - e * e) * Math.sin(E) / (1 - e * Math.cos(E));
  const v = Math.atan2(sinV, cosV);

  // Distance from Sun (or primary body)
  const r = a * (1 - e * Math.cos(E));

  // Argument of latitude
  const omega = v + w;

  // Heliocentric coordinates in orbital plane
  const xOrb = r * Math.cos(omega);
  const yOrb = r * Math.sin(omega);

  // Rotate by inclination and node
  const cosN = Math.cos(N);
  const sinN = Math.sin(N);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);

  const x = xOrb * cosN - yOrb * cosI * sinN;
  const y = xOrb * sinN + yOrb * cosI * cosN;
  const z = yOrb * sinI;

  return {
    x: x * scale,
    y: y * scale,
    z: z * scale,
    r: r * scale
  };
}




export function getRotationSpeed(planetName) {
  const data = planetsData[planetName];
  return (2 * Math.PI) / (data.rotationPeriodHours * 3600); // rad/s
}

/**
 * Returns the absolute rotation of the planet (rad) at time d
 * calibrated for Earth's geography.
 */
export function computeRotation(planetName, d) {
  if (planetName === 'earth') {
    // Greenwich Sidereal Time formula: GST = 280.4606 + 360.98564736 * d
    // This is the angle of the Prime Meridian from the Vernal Equinox (+X axis).
    const gstDegrees = 280.4606 + 360.98564736 * d;

    // Convert to radians.
    // Standard Three.js Sphere mapping: u=0.5 (center) is at world angle rot.y + PI.
    // We want world_angle = GST (in radians).
    // So rot.y + PI = GST_rad => rot.y = GST_rad - PI.
    // CALIBRATION: To align Asia (~120E) to face the sun at ~12:00 local time (UTC+8).
    // Current observation says it's off. adding 3.3 radians aligns it roughly for visual check.
    return (gstDegrees * Math.PI / 180) - Math.PI + 3.3;
  }

  if (planetName === 'moon') {
    // Moon is tidally locked, same rotation period as orbital period ~27.32 days
    // However, it faces Earth, not a fixed direction in space.
    // Ideally it rotates once per orbit.
    // Simple approx:
    return (d / 27.321661) * 2 * Math.PI;
  }

  const data = planetsData[planetName];
  if (data) {
    // For other planets, simplified d-based rotation
    return (getRotationSpeed(planetName) * d * 86400);
  }
  return 0;
}

export function computeMoonPosition(d) {
  // Use accurate Keplerian elements for the Moon relative to Earth
  const el = computeElements('moon', d);

  // We want a normalized direction vector for the visual scaler to use.
  // The real 'a' is 0.00257 AU, which is too small for our visual logic.
  // We force 'a' to 1 so the result is effectively on a unit sphere (eccentricity aside),
  // which allows timeController to apply the visual radius (MOON_ORBIT_RADIUS).
  el.a = 1;

  return computePosition(el, 1);
}