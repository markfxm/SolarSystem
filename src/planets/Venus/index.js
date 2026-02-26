import { BasePlanet } from '../base/BasePlanet.js';
export class Venus extends BasePlanet {
  constructor(radius, scene) { super('venus', radius, scene); }
  create(tex) { return this.createMesh(tex); }
}
