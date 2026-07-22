import * as THREE from 'three';

// Pre-calculated HSL-to-RGB color Lookup Tables (LUTs) at module scope.
// By caching 512 pre-calculated RGB values with Hue in the range [0.75, 0.85],
// Saturation 0.8, and Lightness 0.5, we completely avoid 12,000 setHSL allocations
// and conversions during initialization.
const NEBULA_COLOR_LUT_SIZE = 512;
const MIN_HUE = 0.75;
const MAX_HUE = 0.85;
const HUE_RANGE = MAX_HUE - MIN_HUE;
const SATURATION = 0.8;
const LIGHTNESS = 0.5;
const NEBULA_COLOR_LUT = new Float32Array(NEBULA_COLOR_LUT_SIZE * 3);

(function initNebulaColorLUT() {
  const tempColor = new THREE.Color();
  for (let i = 0; i < NEBULA_COLOR_LUT_SIZE; i++) {
    const h = MIN_HUE + (i / (NEBULA_COLOR_LUT_SIZE - 1)) * HUE_RANGE;
    tempColor.setHSL(h, SATURATION, LIGHTNESS);
    const idx = i * 3;
    NEBULA_COLOR_LUT[idx] = tempColor.r;
    NEBULA_COLOR_LUT[idx + 1] = tempColor.g;
    NEBULA_COLOR_LUT[idx + 2] = tempColor.b;
  }
})();
export function createNebula(position) {
  const numParticles = 12000;
  const geometry = new THREE.BufferGeometry();
  const nebulaPositions = new Float32Array(numParticles * 3);
  const nebulaColors = new Float32Array(numParticles * 3);
  const nebulaSizes = new Float32Array(numParticles);

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
    // Use the pre-calculated HSL-to-RGB color LUT to avoid 12,000 setHSL conversions and GC pressure.
    const colorIdx = ((Math.random() * NEBULA_COLOR_LUT_SIZE) | 0) * 3;
    nebulaColors[idx3] = NEBULA_COLOR_LUT[colorIdx];
    nebulaColors[idx3 + 1] = NEBULA_COLOR_LUT[colorIdx + 1];
    nebulaColors[idx3 + 2] = NEBULA_COLOR_LUT[colorIdx + 2];

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
