import * as THREE from 'three';
import { BasePlanet } from '../base/BasePlanet.js';

export class Earth extends BasePlanet {
  constructor(radius, scene) {
    super('earth', radius, scene);
  }

  create(dayTexture, nightTexture) {
    // To use a Blender model, uncomment the line below and provide the correct path:
    // this.loadModel('/models/earth.glb', dayTexture, nightTexture);

    const mesh = this.createMesh(dayTexture, nightTexture);

    // Earth Atmosphere
    const atmos = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius * 1.05, 64, 64),
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
