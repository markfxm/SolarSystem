import * as THREE from 'three';

/**
 * Creates a nebula effect using a point cloud.
 * Optimized: Merged loops and reused trigonometric results for better performance.
 */
export function createNebula(position) {
  const numParticles = 12000;
  const geometry = new THREE.BufferGeometry();
  const nebulaPositions = new Float32Array(numParticles * 3);
  const nebulaColors = new Float32Array(numParticles * 3);
  const nebulaSizes = new Float32Array(numParticles);

  // Pre-allocated color object to avoid 12,000 allocations
  const tempColor = new THREE.Color();

  for (let i = 0; i < numParticles; i++) {
    // 1. Position calculation
    const radius = 40000 + Math.random() * 80000; // Shell distribution: 40k to 120k
    const theta = Math.random() * Math.PI * 2;

    // Optimized: Use direct spherical coordinate math to avoid Math.acos, Math.sin, and Math.cos
    const cosPhi = 2 * Math.random() - 1;
    const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
    const rSinPhi = radius * sinPhi;

    const idx3 = i * 3;
    nebulaPositions[idx3] = rSinPhi * Math.cos(theta);
    nebulaPositions[idx3 + 1] = rSinPhi * Math.sin(theta);
    nebulaPositions[idx3 + 2] = radius * cosPhi;

    // 2. Color and Size calculation (Merged from second loop)
    tempColor.setHSL(0.75 + Math.random() * 0.1, 0.8, 0.5);
    nebulaColors[idx3] = tempColor.r;
    nebulaColors[idx3 + 1] = tempColor.g;
    nebulaColors[idx3 + 2] = tempColor.b;

    nebulaSizes[i] = 400 + Math.random() * 800;
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
