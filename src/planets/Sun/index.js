import * as THREE from 'three';
import { createHolographicMaterial } from '../../utils/HolographicMaterial.js';

export class Sun {
  constructor(radius, scene) {
    this.name = 'sun';
    this.radius = radius;
    this.scene = scene;
    this.mesh = null;
    this.originalMaterial = null;
    this.holographicMaterial = null;
  }

  create(texture) {
    const geometry = new THREE.SphereGeometry(this.radius, 48, 48);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    this.originalMaterial = material;

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.userData.name = this.name;
    this.mesh.userData.isSun = true;
    this.mesh.userData.isPlanet = true; // For interaction consistency
    this.mesh.name = 'sun';

    this.scene.add(this.mesh);
    return this.mesh;
  }

  updateHQ(hqTexture) {
    if (!this.mesh) return;
    const oldTex = this.originalMaterial.map;
    this.originalMaterial.map = hqTexture;
    this.originalMaterial.needsUpdate = true;
    if (oldTex && oldTex !== hqTexture) oldTex.dispose();
  }

  setHolographic(enabled) {
    if (!this.mesh) return;
    if (enabled) {
      if (!this.holographicMaterial) {
        this.holographicMaterial = createHolographicMaterial({ opacity: 0.8 });
      }
      this.mesh.material = this.holographicMaterial;
    } else {
      this.mesh.material = this.originalMaterial;
    }
  }
}
