import * as THREE from 'three';

/**
 * Creates a nebula effect using a point cloud.
 * Optimized: Merged loops, reused trigonometric results, and removed unused attributes.
 */
export function createNebula(position) {
  const numParticles = 12000;
  const geometry = new THREE.BufferGeometry();
  const nebulaPositions = new Float32Array(numParticles * 3);
  const nebulaColors = new Float32Array(numParticles * 3);

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

    // 2. Color calculation (Merged from second loop)
    tempColor.setHSL(0.75 + Math.random() * 0.1, 0.8, 0.5);
    nebulaColors[idx3] = tempColor.r;
    nebulaColors[idx3 + 1] = tempColor.g;
    nebulaColors[idx3 + 2] = tempColor.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(nebulaPositions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(nebulaColors, 3));

  // Performance Optimization: Removed unused 'size' attribute. Standard PointsMaterial
  // uses its own 'size' uniform, saving memory and redundant loop math.
  const material = new THREE.PointsMaterial({
    vertexColors: true,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.5,
    size: 600 // Base size for nebula particles
  });

  const nebula = new THREE.Points(geometry, material);
  // Optimization: Nebula is not interactive, disable raycasting to save CPU
  nebula.raycast = () => {};
  nebula.position.copy(position);

  // Performance Optimization: The nebula is a static background element.
  // Disabling matrixAutoUpdate and frustumCulled reduces per-frame scene graph overhead.
  nebula.matrixAutoUpdate = false;
  nebula.updateMatrix();
  nebula.frustumCulled = false;

  return nebula;
}
