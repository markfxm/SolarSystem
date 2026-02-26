import { BasePlanet } from '../base/BasePlanet.js';
export class Jupiter extends BasePlanet {
  constructor(radius, scene) { super('jupiter', radius, scene); }
  create(tex) { return this.createMesh(tex); }
}
