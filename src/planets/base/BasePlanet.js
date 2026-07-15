import * as THREE from 'three';
import { createLatLonGrid } from '../../utils/Grid.js';
import { createPOIMarkers } from '../../utils/POI.js';
import { createHolographicMaterial } from '../../utils/HolographicMaterial.ts';
import { unitSphereGeometry } from '../../three/geometries.js';
import { createPlanetSurfaceMaterial } from '../materials/PlanetSurfaceMaterial.js';

export class BasePlanet {
  constructor(name, radius, scene) {
    this.name = name;
    this.radius = radius;
    this.scene = scene;
    this.mesh = null;
    this.originalMaterial = null;
    this.holographicMaterial = null;
    this.isHolographic = false;
  }

  createMesh(dayTexture, nightTexture = null) {
    // Optimized: Use shared unit geometry and scale the mesh by this.radius
    const material = createPlanetSurfaceMaterial(this.name, dayTexture, nightTexture);

    this.originalMaterial = material;
    this.mesh = new THREE.Mesh(unitSphereGeometry, material);
    this.mesh.scale.setScalar(this.radius);
    // Optimization: Disable per-frame matrix updates for planets as their movement
    // is manually handled and throttled in the simulation loops.
    this.mesh.matrixAutoUpdate = false;
    this.mesh.updateMatrix();

    this.mesh.userData.name = this.name;
    this.mesh.userData.originalRadius = this.radius;
    this.mesh.userData.isPlanet = true;

    this.scene.add(this.mesh);

    // Add common features
    this.addGrid();
    this.addPOIs();

    return this.mesh;
  }

  addGrid() {
    // Pass 1.0 since it's added as a child of the scaled planet mesh
    const grid = createLatLonGrid(1.0);
    // Optimization: Grid is decorative, disable raycasting to save CPU during planet raycasting
    grid.raycast = () => {};
    this.mesh.add(grid);
    this.mesh.userData.grid = grid;
  }

  addPOIs() {
    // Pass 1.0 since it's added as a child of the scaled planet mesh
    const pois = createPOIMarkers(this.name, 1.0);
    if (pois) {
      // Optimization: POIs are interactive but handled separately via specialized raycasting
      // in interactions.js. Disable recursive raycasting on the group to save CPU.
      pois.raycast = () => {};
      this.mesh.add(pois);
      this.mesh.userData.pois = pois;
    }
  }

  updateHQ(hqTexture, isNight = false) {
    if (!this.mesh || !this.mesh.material || !this.mesh.material.uniforms) return;

    const target = isNight ? 'nightTexture' : 'dayTexture';
    const oldTex = this.mesh.material.uniforms[target].value;
    this.mesh.material.uniforms[target].value = hqTexture;
    if (oldTex && oldTex !== hqTexture) oldTex.dispose();
  }

  setHolographic(enabled) {
    this.isHolographic = enabled;
    if (!this.mesh) return;

    if (enabled) {
      if (!this.holographicMaterial) {
        this.holographicMaterial = createHolographicMaterial();
      }

      if (!this.mesh.userData.originalMaterial) {
        this.mesh.userData.originalMaterial = this.mesh.material;
      }
      this.mesh.material = this.holographicMaterial;
    } else {
      if (this.mesh.userData.originalMaterial) {
        this.mesh.material = this.mesh.userData.originalMaterial;
      }
    }
  }
}
