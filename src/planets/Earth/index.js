import * as THREE from 'three';
import { BasePlanet } from '../base/BasePlanet.js';
import { unitSphereGeometry } from '../../three/geometries.js';

export class Earth extends BasePlanet {
  constructor(radius, scene) {
    super('earth', radius, scene);
  }

  create(dayTexture, nightTexture) {
    const mesh = this.createMesh(dayTexture, nightTexture);

    // Earth Atmosphere
    const atmos = new THREE.Mesh(
      // Optimized: Reuse shared unit geometry and apply scale.
      unitSphereGeometry,
      new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.25,
        side: THREE.BackSide
      })
    );
    atmos.scale.setScalar(1.05);
    // Optimization: Set to Layer 1 to prune from standard recursive raycast passes (Layer 0).
    atmos.layers.set(1);
    // Optimization: Atmosphere is decorative, disable raycasting to save CPU
    atmos.raycast = () => {};
    // Optimization: Atmosphere is static relative to Earth, disable per-frame matrix updates.
    atmos.matrixAutoUpdate = false;
    atmos.updateMatrix();
    mesh.add(atmos);

    return mesh;
  }
}
