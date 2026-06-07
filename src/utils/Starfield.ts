import * as THREE from 'three'

// Module-level scratch color to eliminate thousands of object allocations during initialization
const _tempColor = new THREE.Color();

/**
 * Creates a high-performance starfield using a point cloud.
 * Optimized: Uses a shared scratch color, removes unused attributes, and
 * implements scene-graph pruning for better frame-time stability.
 */
export function createStarfield(
  numStars: number = 15000,
  range: number = 200000
): THREE.Points {
  const starsGeometry = new THREE.BufferGeometry()
  const positions = new Float32Array(numStars * 3)
  const starColors = new Float32Array(numStars * 3)

  for (let i = 0; i < numStars; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * range
    positions[i3 + 1] = (Math.random() - 0.5) * range
    positions[i3 + 2] = (Math.random() - 0.5) * range

    // Optimization: Reuse module-level color object to avoid GC pressure
    _tempColor.setHSL(Math.random() * 0.1 + 0.55, 0.15, 0.8 + Math.random() * 0.2);
    starColors[i3] = _tempColor.r
    starColors[i3 + 1] = _tempColor.g
    starColors[i3 + 2] = _tempColor.b
  }

  starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  starsGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3))

  // Performance Optimization: Removed unused 'size' attribute. Standard PointsMaterial
  // uses the 'size' uniform for all points, saving ~60KB of memory and redundant math.
  const starsMaterial = new THREE.PointsMaterial({
    vertexColors: true,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    size: 2.0,
    transparent: true,
    opacity: 0.8
  })

  const starField = new THREE.Points(starsGeometry, starsMaterial)
  starField.userData.isStarfield = true

  // Performance Optimization: The starfield is not interactive and surrounds the scene.
  // Disabling raycasting, frustum culling, and matrix updates reduces per-frame overhead.
  starField.raycast = () => {}
  starField.matrixAutoUpdate = false
  starField.updateMatrix()
  starField.frustumCulled = false

  return starField
}
