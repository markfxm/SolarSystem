import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

export interface OrbitalElements {
  a: number // semi-major axis
  e: number // eccentricity
  i: number // inclination
  N: number // longitude of ascending node
  w: number // argument of perihelion
}

/**
 * Creates a perfect elliptical orbit line that EXACTLY matches your computePosition() function
 * Uses the same rotation order, same Kepler solver, same coordinate conventions
 * Optimized: Input elements are now in radians.
 */
export function createEllipticalOrbit(
  elements: OrbitalElements,
  scale: number,
  segments: number = 512,
  color: number = 0xd4aaff,
  opacity: number = 0.88
): Line2 {
  // Use Float32Array for better memory efficiency and performance with LineGeometry
  const points = new Float32Array((segments + 1) * 3)

  const a = elements.a
  const e = elements.e
  const i = elements.i // Already in radians
  const N = elements.N // Already in radians
  const w = elements.w // Already in radians

  const cosN = Math.cos(N)
  const sinN = Math.sin(N)
  const cosI = Math.cos(i)
  const sinI = Math.sin(i)

  // Pre-calculate constants outside the loop
  const cosW = Math.cos(w)
  const sinW = Math.sin(w)
  const sqrtEE = Math.sqrt(1 - e * e)
  const aSqrtEE = a * sqrtEE
  const TWO_PI = Math.PI * 2
  const step = TWO_PI / segments

  // Fast-path for planets with zero inclination (e.g. Earth)
  const isZeroInclination = (i === 0 && N === 0)

  for (let k = 0; k <= segments; k++) {
    // Sweep mean anomaly from 0 to 2π
    let M = k * step

    // Keep M in [-π, π]
    M = M - Math.floor(M / TWO_PI + 0.5) * TWO_PI

    // Solve Kepler's equation with early exit for low eccentricity
    let E = M
    let sinE = 0
    let cosE = 0
    let denom = 0
    for (let iter = 0; iter < 6; iter++) {
      sinE = Math.sin(E)
      cosE = Math.cos(E)
      denom = 1 - e * cosE
      const error = E - e * sinE - M
      if (Math.abs(error) < 1e-6) break
      E -= error / denom
    }

    // Optimized orbital plane coordinates using substitution:
    // r*cos(v) = a * (cosE - e)
    // r*sin(v) = a * sqrt(1 - e^2) * sinE
    // This eliminates ~1000 divisions and redundant trig calls per orbit.
    const rCosV = a * (cosE - e)
    const rSinV = aSqrtEE * sinE

    const xOrb = rCosV * cosW - rSinV * sinW
    const yOrb = rSinV * cosW + rCosV * sinW

    let x, y, z
    if (isZeroInclination) {
      x = xOrb
      y = yOrb
      z = 0
    } else {
      const yOrbCosI = yOrb * cosI
      x = xOrb * cosN - yOrbCosI * sinN
      y = xOrb * sinN + yOrbCosI * cosN
      z = yOrb * sinI
    }

    // Transform Ecliptic (XY-plane, Z-up) to World (XZ-plane, Y-up)
    const idx = k * 3
    points[idx] = x * scale
    points[idx + 1] = z * scale
    points[idx + 2] = -y * scale
  }

  const geometry = new LineGeometry()
  geometry.setPositions(points)

  const material = new LineMaterial({
    color: new THREE.Color(color).getHex(),
    linewidth: 1.2, // pixels
    transparent: true,
    opacity: opacity,
    dashed: false,
    alphaToCoverage: true,
    depthWrite: false,
    worldUnits: false // important for constant pixel width
  })

  // Set resolution later in SolarSystem.vue
  material.resolution.set(window.innerWidth, window.innerHeight)

  const orbitLine = new Line2(geometry, material)
  orbitLine.computeLineDistances()
  orbitLine.userData.isOrbit = true

  return orbitLine
}
