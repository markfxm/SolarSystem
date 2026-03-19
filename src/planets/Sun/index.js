import * as THREE from 'three';
import { createHolographicMaterial } from '../../utils/HolographicMaterial';

// Optimized: Reuse the same sphere segments as planets for consistency and memory savings
const unitSphereGeometry = new THREE.SphereGeometry(1, 48, 48);

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
    // Optimized: Use shared unit geometry and scale the mesh
    const material = new THREE.MeshBasicMaterial({ map: texture });
    this.originalMaterial = material;

    this.mesh = new THREE.Mesh(unitSphereGeometry, material);
    this.mesh.scale.setScalar(this.radius);

    this.mesh.userData.name = this.name;
    this.mesh.userData.originalRadius = this.radius;
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
        // Optimized: Use material from the holographic cache
        this.holographicMaterial = createHolographicMaterial({ opacity: 0.8 });
      }
      this.mesh.material = this.holographicMaterial;
    } else {
      this.mesh.material = this.originalMaterial;
    }
  }
}
