import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { TWO_PI } from './Astronomy.js'

// Module-level cache for static trigonometric lookup tables (cosE, sinE) keyed by segment count.
// Optimization: Pre-calculating cos(E) and sin(E) for common orbit segment counts (e.g. 512, 128)
// eliminates ~1,026 Math.cos/Math.sin calls per 512-segment orbit line initialization.
const TRIG_TABLE_CACHE = new Map<number, Float32Array>()

function getTrigTable(segments: number): Float32Array {
  let table = TRIG_TABLE_CACHE.get(segments)
  if (!table) {
    // Interleaved Float32Array storing [cos(E_0), sin(E_0), cos(E_1), sin(E_1), ...]
    table = new Float32Array((segments + 1) * 2)
    const step = TWO_PI / segments
    for (let k = 0; k <= segments; k++) {
      const E = k * step
      table[k * 2] = Math.cos(E)
      table[k * 2 + 1] = Math.sin(E)
    }
    TRIG_TABLE_CACHE.set(segments, table)
  }
  return table
}

export interface OrbitalElements {
  a: number // semi-major axis
  e: number // eccentricity
  i: number // inclination
  N: number // longitude of ascending node
  w: number // argument of perihelion
  // Pre-calculated Gaussian constants from Astronomy.js (already pre-multiplied by scale)
  PxA: number
  PyA: number
  PzA: number
  QxAS: number
  QyAS: number
  QzAS: number
}

/**
 * Creates a perfect elliptical orbit line.
 * Optimized: Sweeps Eccentric Anomaly (E) directly instead of Mean Anomaly (M)
 * to eliminate the iterative Kepler solver. Uses pre-scaled Gaussian constants for
 * coordinate transformation, matching the high-performance logic in Astronomy.js.
 */
export function createEllipticalOrbit(
  elements: OrbitalElements,
  segments: number = 512,
  color: number = 0xd4aaff,
  opacity: number = 0.88
): Line2 {
  // Use Float32Array for better memory efficiency and performance with LineGeometry
  const points = new Float32Array((segments + 1) * 3)

  const { e, PxA, PyA, PzA, QxAS, QyAS, QzAS } = elements
  // Optimization: Read pre-calculated cos(E) and sin(E) from static Float32Array lookup table,
  // bypassing ~1,026 Math.cos/Math.sin function calls per orbit creation.
  const trigTable = getTrigTable(segments)

  for (let k = 0; k <= segments; k++) {
    const cosE = trigTable[k * 2]
    const sinE = trigTable[k * 2 + 1]

    // Transform directly to World space using pre-calculated combined coefficients
    // Optimized: Factored formula pos = PxA * (cosE - e) + QxAS * sinE.
    // Gaussian constants (PxA, QxAS, etc.) are already pre-multiplied by scale AND
    // pre-swapped into World space (X_world = X_ecl, Y_world = Z_ecl, Z_world = -Y_ecl) in Astronomy.js.
    const cosEmE = cosE - e
    const idx = k * 3
    points[idx] = PxA * cosEmE + QxAS * sinE
    points[idx + 1] = PyA * cosEmE + QyAS * sinE
    points[idx + 2] = PzA * cosEmE + QzAS * sinE
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
  if (typeof window !== 'undefined') {
    material.resolution.set(window.innerWidth, window.innerHeight)
  }

  const orbitLine = new Line2(geometry, material)
  // Optimization: Orbit lines are not interactive, disable raycasting to save CPU during mouse movement
  orbitLine.raycast = () => {}
  // Optimization: Orbit lines are static relative to the solar system, disable per-frame matrix updates.
  orbitLine.matrixAutoUpdate = false
  orbitLine.updateMatrix()
  orbitLine.computeLineDistances()
  orbitLine.userData.isOrbit = true

  return orbitLine
}
