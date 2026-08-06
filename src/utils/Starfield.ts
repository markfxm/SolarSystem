import * as THREE from 'three'

/**
 * Creates a high-performance, color-varied starfield.
 * Optimized: Uses single-allocated THREE.Color, disabled raycasting, disabled frustum culling,
 * disabled matrix updates, and correct 200,000 unit bounds matching the solar system scale.
 */
export function createStarfield(scene: THREE.Scene): THREE.Points {
  const numStars = 5000 // High-quality star count
  const starsGeometry = new THREE.BufferGeometry()
  const positions = new Float32Array(numStars * 3)
  const starColors = new Float32Array(numStars * 3)

  // Performance Optimization: Pre-allocate a single THREE.Color object outside the loop
  // to avoid allocating 5,000 separate THREE.Color objects on initialization,
  // dramatically reducing garbage collection overhead and load/render-start time.
  const tempColor = new THREE.Color()

  for (let i = 0; i < numStars * 3; i += 3) {
    // Corrected & Optimized: Distribute stars uniformly on a sphere of 200,000 units
    // instead of a box. This completely prevents any stars from floating inside the
    // planetary orbits or near the camera, while using highly efficient direct spherical math.
    const theta = Math.random() * Math.PI * 2
    const cosPhi = (Math.random() * 2) - 1
    const sinPhi = Math.sqrt(1 - cosPhi * cosPhi)
    const radius = 200000

    positions[i] = radius * sinPhi * Math.cos(theta)
    positions[i + 1] = radius * sinPhi * Math.sin(theta)
    positions[i + 2] = radius * cosPhi

    tempColor.setHSL(Math.random() * 0.1 + 0.5, 0.2, 0.8 + Math.random() * 0.2)
    starColors[i] = tempColor.r
    starColors[i + 1] = tempColor.g
    starColors[i + 2] = tempColor.b
  }

  starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  starsGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3))

  const starsMaterial = new THREE.PointsMaterial({
    size: 1.5,
    vertexColors: true,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending
  })

  const starField = new THREE.Points(starsGeometry, starsMaterial)

  // Performance Optimization: Disable raycasting for non-interactive background elements.
  starField.raycast = () => {}
  starField.userData.isStarfield = true

  // Performance Optimization: Starfield is static, disable per-frame matrix auto updates.
  starField.matrixAutoUpdate = false
  starField.updateMatrix()

  // Performance Optimization: Starfield surrounds the camera, disable frustum culling to skip redundant checks.
  starField.frustumCulled = false

  scene.add(starField)
  return starField
}
