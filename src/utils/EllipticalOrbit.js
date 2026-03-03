// src/utils/EllipticalOrbit.js
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

/**
 * Creates a perfect elliptical orbit line that EXACTLY matches your computePosition() function
 * Uses the same rotation order, same Kepler solver, same coordinate conventions
 * Optimized: Input elements are now in radians.
 */
export function createEllipticalOrbit(elements, scale, segments = 512, color = 0xd4aaff, opacity = 0.88) {
  const points = [];

  const a = elements.a;
  const e = elements.e;
  const i = elements.i; // Already in radians
  const N = elements.N; // Already in radians
  const w = elements.w; // Already in radians

  const cosN = Math.cos(N);
  const sinN = Math.sin(N);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);

  // Pre-calculate constant trig for angle addition outside the loop
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);

  // Fast-path for planets with zero inclination (e.g. Earth)
  const isZeroInclination = (i === 0 && N === 0);

  for (let k = 0; k <= segments; k++) {
    // Sweep mean anomaly from 0 to 2π
    let M = (k / segments) * 2 * Math.PI;

    // Optional: keep M in [-π, π]
    M = M - Math.floor(M / (2 * Math.PI) + 0.5) * 2 * Math.PI;

    // Solve Kepler's equation — identical to your computePosition()
    let E = e < 0.05
      ? M
      : (M + e * Math.sin(M)) / (1 - e * Math.cos(M));

    let sinE, cosE;
    for (let iter = 0; iter < 6; iter++) { // Synced to 6 iterations
      sinE = Math.sin(E);
      cosE = Math.cos(E);
      E -= (E - e * sinE - M) / (1 - e * cosE);
    }

    sinE = Math.sin(E);
    cosE = Math.cos(E);
    const denom = 1 - e * cosE;

    // True anomaly components
    const cosV = (cosE - e) / denom;
    const sinV = Math.sqrt(1 - e * e) * sinE / denom;

    // Distance from Sun
    const r = a * denom;

    // Orbit plane coordinates using angle addition formulas (optimized trig)
    const xOrb = r * (cosV * cosW - sinV * sinW);
    const yOrb = r * (sinV * cosW + cosV * sinW);

    let x, y, z;
    if (isZeroInclination) {
      x = xOrb;
      y = yOrb;
      z = 0;
    } else {
      x = xOrb * cosN - yOrb * cosI * sinN;
      y = xOrb * sinN + yOrb * cosI * cosN;
      z = yOrb * sinI;
    }

    // Transform Ecliptic (XY-plane, Z-up) to World (XZ-plane, Y-up)
    points.push(x * scale, z * scale, -y * scale);
  }

  const geometry = new LineGeometry();
  geometry.setPositions(points);

  const material = new LineMaterial({
    color: new THREE.Color(color).getHex(),
    linewidth: 1.2, // pixels
    transparent: true,
    opacity: opacity,
    dashed: false,
    alphaToCoverage: true,
    depthWrite: false,
    worldUnits: false // important for constant pixel width
  });

  // Set resolution later in SolarSystem.vue
  material.resolution.set(window.innerWidth, window.innerHeight);

  const orbitLine = new Line2(geometry, material);
  orbitLine.computeLineDistances();
  orbitLine.userData.isOrbit = true;

  return orbitLine;
}
