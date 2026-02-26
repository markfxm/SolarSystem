import { BasePlanet } from '../base/BasePlanet.js';
export class Neptune extends BasePlanet {
  constructor(radius, scene) { super('neptune', radius, scene); }
  create(tex) { return this.createMesh(tex); }
}
