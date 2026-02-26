import * as THREE from 'three';

export class Sun {
  constructor(radius, scene) {
    this.name = 'sun';
    this.radius = radius;
    this.scene = scene;
    this.mesh = null;
  }

  create(texture) {
    const geometry = new THREE.SphereGeometry(this.radius, 48, 48);
    const material = new THREE.MeshBasicMaterial({ map: texture });

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
    const oldTex = this.mesh.material.map;
    this.mesh.material.map = hqTexture;
    this.mesh.material.needsUpdate = true;
    if (oldTex && oldTex !== hqTexture) oldTex.dispose();
  }
}
