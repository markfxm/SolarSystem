import * as THREE from 'three';

/**
 * Shared unit geometries to reduce memory usage and GPU state changes.
 * All celestial bodies and their spherical effects should use this 1-unit radius geometry
 * and be scaled using mesh.scale.setScalar(radius).
 */
export const unitSphereGeometry = new THREE.SphereGeometry(1, 48, 48);
