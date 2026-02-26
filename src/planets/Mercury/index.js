import { BasePlanet } from '../base/BasePlanet.js';
export class Mercury extends BasePlanet {
  constructor(radius, scene) { super('mercury', radius, scene); }
  create(tex) { return this.createMesh(tex); }
}
