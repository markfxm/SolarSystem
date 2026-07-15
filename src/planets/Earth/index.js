import * as THREE from 'three';
import { BasePlanet } from '../base/BasePlanet.js';
import { unitSphereGeometry } from '../../three/geometries.js';
import { createEarthAtmosphereMaterial, createEarthCloudMaterial } from './EarthMaterials.js';

export class Earth extends BasePlanet {
  constructor(radius, scene) {
    super('earth', radius, scene);
  }

  create(dayTexture, nightTexture) {
    const mesh = this.createMesh(dayTexture, nightTexture);

    const atmosphere = this.createLayer('earthAtmosphere', 1.05, createEarthAtmosphereMaterial());
    this.cloudMaterial = createEarthCloudMaterial();
    const clouds = this.createLayer('earthClouds', 1.012, this.cloudMaterial);
    mesh.add(atmosphere, clouds);

    return mesh;
  }

  createLayer(name, scale, material) {
    const layer = new THREE.Mesh(unitSphereGeometry, material);
    layer.name = name;
    layer.scale.setScalar(scale);
    layer.layers.set(1);
    layer.raycast = () => {};
    layer.matrixAutoUpdate = false;
    layer.updateMatrix();
    return layer;
  }

  updateVisuals(deltaSeconds) {
    if (this.cloudMaterial) {
      this.cloudMaterial.uniforms.time.value += deltaSeconds;
    }
  }
}
