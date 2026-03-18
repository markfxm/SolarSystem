import * as THREE from 'three';
import { BasePlanet } from '../base/BasePlanet.js';

export class Saturn extends BasePlanet {
  constructor(radius, scene) {
    super('saturn', radius, scene);
  }

  create(texture) {
    const mesh = this.createMesh(texture);
    return mesh;
  }

  async addRings(textureLoader) {
    // Optimized: Use normalized dimensions as it is now a child of a scaled unit-sphere.
    const innerRadius = 1.11;
    const outerRadius = 2.33;

    try {
      const ringAlpha = await new Promise((resolve, reject) => {
        textureLoader.load('/hq/8k_saturn_ring_alpha.png', resolve, undefined, reject);
      });

      const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 128, 8);
      const pos = ringGeo.attributes.position;
      const uv = ringGeo.attributes.uv;
      const v3 = new THREE.Vector3();

      for (let i = 0; i < pos.count; i++) {
        v3.fromBufferAttribute(pos, i);
        const r = v3.length();
        const v = (r - innerRadius) / (outerRadius - innerRadius);
        uv.setXY(i, v, 0);
      }

      const ringMat = new THREE.MeshStandardMaterial({
        map: ringAlpha,
        alphaMap: ringAlpha,
        transparent: true,
        side: THREE.DoubleSide,
        emissive: 0xffffff,
        emissiveIntensity: 0.15,
        roughness: 0.3,
        metalness: 0.0,
      });

      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.userData.isRing = true; // For identification

      if (this.isHolographic) {
        if (!this.holographicMaterial) {
          const { createHolographicMaterial } = await import('../../utils/HolographicMaterial.js');
          this.holographicMaterial = createHolographicMaterial();
        }
        ringMesh.userData.originalMaterial = ringMat;
        ringMesh.material = this.holographicMaterial;
      }

      this.mesh.add(ringMesh);
    } catch (err) {
      console.error("Failed to load Saturn rings:", err);
    }
  }
}
