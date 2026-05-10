import * as THREE from 'three';

/**
 * Shared unit geometries to reduce memory usage and GPU state changes.
 * All celestial bodies and their spherical effects should use this 1-unit radius geometry
 * and be scaled using mesh.scale.setScalar(radius).
 */
export const unitSphereGeometry = new THREE.SphereGeometry(1, 48, 48);

// Optimization: Pre-calculate the bounding sphere for the shared unit geometry once.
// This avoids redundant O(N) vertex traversals when 9+ planets and their atmospheres
// are initialized or when computeBoundingSphere is called elsewhere.
unitSphereGeometry.computeBoundingSphere();
