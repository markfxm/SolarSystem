import { BasePlanet } from '../base/BasePlanet.js';

export class Mars extends BasePlanet {
  constructor(radius, scene) {
    super('mars', radius, scene);
  }

  create(texture) {
    // To use a Blender model, uncomment the line below and provide the correct path:
    // this.loadModel('/models/mars.glb', texture);

    return this.createMesh(texture);
  }

  // Mars specific logic for surface exploration could be initiated here if needed
}
