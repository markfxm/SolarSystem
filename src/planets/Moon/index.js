import { BasePlanet } from '../base/BasePlanet.js';
export class Moon extends BasePlanet {
  constructor(radius, scene) { super('moon', radius, scene); }
  create(tex) { return this.createMesh(tex); }
}
