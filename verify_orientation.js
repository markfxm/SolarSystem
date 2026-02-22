
import * as THREE from 'three';
import { computeD, computePlanetQuaternion, ORIENTATION_CONSTANTS } from './src/utils/Astronomy.js';

const date = new Date('2024-02-05T00:00:00Z');
const d = computeD(date);

console.log(`Date: ${date.toISOString()} (d = ${d})`);

function testPlanet(name) {
    const q = computePlanetQuaternion(name, d);
    const euler = new THREE.Euler().setFromQuaternion(q);

    // Direction of the North Pole (local Y in world space)
    const northPole = new THREE.Vector3(0, 1, 0).applyQuaternion(q);

    // Obliquity to Ecliptic: Angle between northPole and Ecliptic North (0, 0, 1)
    const eclNorth = new THREE.Vector3(0, 0, 1);
    const obliquity = northPole.angleTo(eclNorth) * 180 / Math.PI;

    console.log(`--- ${name.toUpperCase()} ---`);
    console.log(`Obliquity to Ecliptic: ${obliquity.toFixed(2)}°`);
    console.log(`North Pole Vector: [${northPole.x.toFixed(4)}, ${northPole.y.toFixed(4)}, ${northPole.z.toFixed(4)}]`);
}

testPlanet('earth');
testPlanet('mars');
testPlanet('venus');
testPlanet('uranus');
