import * as THREE from 'three'

export const HOLOGRAPHIC_COLOR = 0x00FFFF

export interface HolographicOptions extends Partial<THREE.MeshBasicMaterialParameters> {
  opacity?: number
}

/**
 * Creates a standard holographic wireframe material.
 */
export function createHolographicMaterial(options: HolographicOptions = {}): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: HOLOGRAPHIC_COLOR,
    wireframe: true,
    transparent: true,
    opacity: options.opacity || 0.6,
    side: THREE.DoubleSide,
    ...options
  })
}

/**
 * Creates a holographic line material for orbits.
 */
export function getHolographicLineColor(): number {
  return HOLOGRAPHIC_COLOR
}
