import * as THREE from 'three';

export function createNebula(position) {
  const numParticles = 2000;
  const geometry = new THREE.BufferGeometry();
  const nebulaPositions = new Float32Array(numParticles * 3);
  const nebulaColors = new Float32Array(numParticles * 3);
  const nebulaSizes = new Float32Array(numParticles);
  for (let i = 0; i < numParticles * 3; i += 3) {
    const radius = 400 * Math.random(); // Increased for bigger nebula
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    nebulaPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
    nebulaPositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
    nebulaPositions[i + 2] = radius * Math.cos(phi);
    
    const color = new THREE.Color().setHSL(0.75 + Math.random() * 0.1, 0.8, 0.5);
    nebulaColors[i] = color.r;
    nebulaColors[i + 1] = color.g;
    nebulaColors[i + 2] = color.b;
    
    nebulaSizes[i / 3] = 5 + Math.random() * 10;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(nebulaPositions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(nebulaColors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(nebulaSizes, 1));
  const material = new THREE.PointsMaterial({
    vertexColors: true,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.5
  });
  const nebula = new THREE.Points(geometry, material);
  nebula.position.copy(position);
  return nebula;
}