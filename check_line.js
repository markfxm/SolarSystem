import * as THREE from 'three';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';

const geo = new LineGeometry();
geo.setPositions([0,0,0, 1,1,1]);
const attr = geo.getAttribute('instanceStart');
console.log('Attribute type:', attr.constructor.name);
if (attr.isInterleavedBufferAttribute) {
    console.log('Buffer type:', attr.data.constructor.name);
    console.log('Buffer array type:', attr.data.array.constructor.name);
    console.log('Buffer array length:', attr.data.array.length);
}
