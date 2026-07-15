import * as THREE from 'three';
import { createHolographicMaterial } from '../../utils/HolographicMaterial.ts';
import { unitSphereGeometry } from '../../three/geometries.js';
import { createSunSurfaceMaterial, createSunCoronaMaterial } from './SunMaterials.js';

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
    const material = createSunSurfaceMaterial(texture);
    this.originalMaterial = material;

    this.mesh = new THREE.Mesh(unitSphereGeometry, material);
    this.mesh.scale.setScalar(this.radius);
    // Optimization: Disable per-frame matrix updates for the Sun as its
    // orientation is manually handled in the simulation loop.
    this.mesh.matrixAutoUpdate = false;
    this.mesh.updateMatrix();

    this.mesh.userData.name = this.name;
    this.mesh.userData.originalRadius = this.radius;
    this.mesh.userData.isSun = true;
    this.mesh.userData.isPlanet = true; // For interaction consistency
    this.mesh.name = 'sun';

    this.scene.add(this.mesh);

    this.coronaMaterial = createSunCoronaMaterial();
    const corona = new THREE.Mesh(unitSphereGeometry, this.coronaMaterial);
    corona.name = 'sunCorona';
    corona.scale.setScalar(1.08);
    corona.raycast = () => {};
    corona.matrixAutoUpdate = false;
    corona.updateMatrix();
    this.mesh.add(corona);

    return this.mesh;
  }

  updateHQ(hqTexture) {
    if (!this.mesh) return;
    const oldTex = this.originalMaterial.uniforms.map.value;
    this.originalMaterial.uniforms.map.value = hqTexture;
    if (oldTex && oldTex !== hqTexture) oldTex.dispose();
  }

  updateVisuals(deltaSeconds) {
    if (this.originalMaterial) {
      this.originalMaterial.uniforms.time.value += deltaSeconds;
    }
    if (this.coronaMaterial) {
      this.coronaMaterial.uniforms.time.value += deltaSeconds;
    }
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
