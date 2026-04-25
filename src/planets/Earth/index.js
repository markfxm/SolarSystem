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
    // Optimization: Atmosphere is decorative, disable raycasting to save CPU
    atmos.raycast = () => {};
    mesh.add(atmos);

    return mesh;
  }
}
