import { BasePlanet } from '../base/BasePlanet.js';

export class Mars extends BasePlanet {
  constructor(radius, scene) {
    super('mars', radius, scene);
  }

  create(dayTexture, nightTexture = null) {
    // Start by creating a standard mesh so the planet is visible immediately
    this.createMesh(dayTexture, nightTexture);

    // Load the 3D model asynchronously to replace the body
    this.loadModel('/models/Mars.glb', dayTexture, nightTexture).catch(err => {
      console.error('Failed to load Mars model, falling back to sphere:', err);
    });

    return this.mesh;
  }

  // Mars specific logic for surface exploration could be initiated here if needed
}
