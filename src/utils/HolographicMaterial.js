import * as THREE from 'three';

export const HOLOGRAPHIC_COLOR = 0x00FFFF;

/**
 * Creates a standard holographic wireframe material.
 */
export function createHolographicMaterial(options = {}) {
  return new THREE.MeshBasicMaterial({
    color: HOLOGRAPHIC_COLOR,
    wireframe: true,
    transparent: true,
    opacity: options.opacity || 0.6,
    side: THREE.DoubleSide,
    ...options
  });
}

/**
 * Creates a holographic line material for orbits.
 */
export function getHolographicLineColor() {
  return HOLOGRAPHIC_COLOR;
}
