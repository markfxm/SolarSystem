import { BasePlanet } from '../base/BasePlanet.js';
export class Uranus extends BasePlanet {
  constructor(radius, scene) { super('uranus', radius, scene); }
  create(tex) { return this.createMesh(tex); }
}
