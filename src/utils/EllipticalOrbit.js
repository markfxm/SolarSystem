// src/utils/EllipticalOrbit.js
import * as THREE from 'three';

/**
 * Creates a perfect elliptical orbit line that EXACTLY matches your computePosition() function
 * Uses the same rotation order, same Kepler solver, same coordinate conventions
 */
export function createEllipticalOrbit(elements, scale, segments = 512, color = 0xd4aaff, opacity = 0.88) {
  const points = [];

  const a = elements.a;
  const e = elements.e;
  const i_deg = elements.i;
  const N_deg = elements.N;        // longitude of ascending node Ω
  const w_deg = elements.w;        // argument of perihelion ω
  const M0_deg = elements.M;       // mean anomaly at d=0 (we will sweep full circle)

  // Pre-compute constants in radians (same as in computePosition)
  const i = i_deg * Math.PI / 180;
  const N = N_deg * Math.PI / 180;
  const w = w_deg * Math.PI / 180;

  const cosN = Math.cos(N);
  const sinN = Math.sin(N);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);

  for (let k = 0; k <= segments; k++) {
    // Sweep mean anomaly from 0° to 360°
    const M_deg = (k / segments) * 360;
    let M = M_deg * Math.PI / 180;

    // Optional: keep M in [-π, π]
    M = M - Math.floor(M / (2 * Math.PI) + 0.5) * 2 * Math.PI;

    // Solve Kepler's equation — identical to your computePosition()
    let E = e < 0.05
      ? M
      : (M + e * Math.sin(M)) / (1 - e * Math.cos(M));

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

    // Distance from Sun
    const r = a * (1 - e * Math.cos(E));

    // Argument of latitude: ω + ν
    const omega = v + w;

    // Position in orbital plane
    const xOrb = r * Math.cos(omega);
    const yOrb = r * Math.sin(omega);

    // Apply node and inclination — EXACT SAME MATRIX AS computePosition()
    const x = xOrb * cosN - yOrb * cosI * sinN;
    const y = xOrb * sinN + yOrb * cosI * cosN;
    const z = yOrb * sinI;

    points.push(new THREE.Vector3(x * scale, y * scale, z * scale));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false // prevents z-fighting with planets
  });

  const orbitLine = new THREE.Line(geometry, material);
  orbitLine.userData.isOrbit = true;
  return orbitLine;
}