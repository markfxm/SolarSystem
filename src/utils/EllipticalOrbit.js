// src/utils/EllipticalOrbit.js
import * as THREE from 'three';

/**
 * Creates a realistic elliptical orbit line that exactly matches the planet's true path
 * @param {number} a        Semi-major axis in AU
 * @param {number} e        Eccentricity (0 = circle, 0.0167 = Earth, 0.093 = Mars, etc.)
 * @param {number} scale    Your global scale (220 in your app)
 * @param {number} segments Number of points (256–512 = smooth, 128 = fast)
 * @param {number} color    Orbit color (default: your beautiful purple)
 * @param {number} opacity  Opacity 0–1
 */
export function createEllipticalOrbit(a, e, scale, iDeg, NDeg, wDeg, segments = 384, color = 0xcc88ff, opacity = 0.85) {
  const points = [];

  const i = iDeg * Math.PI / 180;
  const N = NDeg * Math.PI / 180;
  const w = wDeg * Math.PI / 180;

  const cosN = Math.cos(N), sinN = Math.sin(N);
  const cosI = Math.cos(i), sinI = Math.sin(i);

  for (let k = 0; k <= segments; k++) {
    const M = (k / segments) * Math.PI * 2;
    let E = M;

    for (let j = 0; j < 5; j++) {
      E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }

    const xOrb = a * (Math.cos(E) - e);
    const yOrb = a * Math.sqrt(1 - e * e) * Math.sin(E);

    // ⬇ EXACT SAME ROTATION AS computePosition()
    const x = xOrb * cosN - yOrb * cosI * sinN;
    const y = xOrb * sinN + yOrb * cosI * cosN;
    const z = yOrb * sinI;

    points.push(new THREE.Vector3(x * scale, y * scale, z * scale));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });

  return new THREE.Line(geometry, material);
}
