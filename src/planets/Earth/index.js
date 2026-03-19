import * as THREE from 'three';
import { BasePlanet } from '../base/BasePlanet.js';

export class Earth extends BasePlanet {
  constructor(radius, scene) {
    super('earth', radius, scene);
  }

  create(dayTexture, nightTexture) {
    const mesh = this.createMesh(dayTexture, nightTexture);

    // Earth Atmosphere
    const atmos = new THREE.Mesh(
      // Optimized: Use normalized radius (1.05) as it is a child of the scaled planet mesh
      new THREE.SphereGeometry(1.05, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.25,
        side: THREE.BackSide
      })
    );
    mesh.add(atmos);

    return mesh;
  }
}
