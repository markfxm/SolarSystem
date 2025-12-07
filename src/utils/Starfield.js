import * as THREE from 'three';

export function createStarfield(scene) {
  const numStars = 5000; // Increased for more star lights
  const starsGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(numStars * 3);
  const starColors = new Float32Array(numStars * 3);
  const starSizes = new Float32Array(numStars);
  for (let i = 0; i < numStars * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 5000;
    positions[i + 1] = (Math.random() - 0.5) * 5000;
    positions[i + 2] = (Math.random() - 0.5) * 5000;
    
    const color = new THREE.Color().setHSL(Math.random() * 0.1 + 0.5, 0.2, 0.8 + Math.random() * 0.2);
    starColors[i] = color.r;
    starColors[i + 1] = color.g;
    starColors[i + 2] = color.b;
    
    starSizes[i / 3] = 0.5 + Math.random() * 1.5;
  }
  starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starsGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  starsGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
  const starsMaterial = new THREE.PointsMaterial({
    vertexColors: true,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending
  });
  const starField = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(starField);
}
