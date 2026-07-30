import * as THREE from 'three'

export function createStarfield(scene: THREE.Scene): void {
  const numStars = 5000 // Increased for more star lights
  const starsGeometry = new THREE.BufferGeometry()
  const positions = new Float32Array(numStars * 3)
  const starColors = new Float32Array(numStars * 3)

  // Performance Optimization: Pre-allocate a single THREE.Color object outside the loop
  // to avoid allocating 5,000 separate THREE.Color objects on initialization,
  // dramatically reducing garbage collection overhead and load/render-start time.
  const tempColor = new THREE.Color()

  for (let i = 0; i < numStars * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 5000
    positions[i + 1] = (Math.random() - 0.5) * 5000
    positions[i + 2] = (Math.random() - 0.5) * 5000

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
  scene.add(starField)
}
