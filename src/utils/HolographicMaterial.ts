import * as THREE from 'three'

export const HOLOGRAPHIC_COLOR = 0x00FFFF

export interface HolographicOptions extends Partial<THREE.MeshBasicMaterialParameters> {
  opacity?: number
}

const materialCache = new Map<number, THREE.MeshBasicMaterial>()

/**
 * Creates a standard holographic wireframe material.
 * Optimized: Uses a cache to reuse materials with the same opacity.
 */
export function createHolographicMaterial(options: HolographicOptions = {}): THREE.MeshBasicMaterial {
  const opacity = options.opacity || 0.6

  // Only cache if it's a standard holographic material (no extra options)
  const hasExtraOptions = Object.keys(options).length > (options.hasOwnProperty('opacity') ? 1 : 0)

  if (!hasExtraOptions && materialCache.has(opacity)) {
    return materialCache.get(opacity)!
  }

  const material = new THREE.MeshBasicMaterial({
    color: HOLOGRAPHIC_COLOR,
    wireframe: true,
    transparent: true,
    opacity: opacity,
    side: THREE.DoubleSide,
    ...options
  })

  if (!hasExtraOptions) {
    materialCache.set(opacity, material)
  }

  return material
}

/**
 * Creates a holographic line material for orbits.
 */
export function getHolographicLineColor(): number {
  return HOLOGRAPHIC_COLOR
}
