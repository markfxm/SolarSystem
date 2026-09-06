import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export function createEngine(container) {
  // Scene
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x020307)

  // Camera
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    500000
  )
  // Enable Layer 1 so POIs and other interactive overlays are visible
  camera.layers.enable(1)
  // Initial far position for fly-in animation
  camera.position.set(0, 20000, 40000)

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  // Optimization: Disable shadow map by default for the main Solar System scene.
  // We dynamically enable it only for sub-scenes (like Mars Surface) that require it.
  renderer.shadowMap.enabled = false
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  // Limit pixel ratio to 1.25 for better performance on average office laptops and high-DPI screens
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
  container.appendChild(renderer.domElement)

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.rotateSpeed = 0.6
  controls.minDistance = 50
  controls.maxDistance = 25000

  const defaultMinDistance = controls.minDistance
  const defaultMaxDistance = controls.maxDistance

  // Resize
  const onResize = () => {
    activeCamera.aspect = window.innerWidth / window.innerHeight
    activeCamera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', onResize)

  // Clock
  const clock = new THREE.Clock()

  let activeScene = scene
  let activeCamera = camera

  // Animation loop
  function start(update) {
    function animate() {
      requestAnimationFrame(animate)
      const delta = clock.getDelta()
      update(delta)
      if (activeCamera === camera) {
        controls.update()
      }
      renderer.render(activeScene, activeCamera)
    }
    animate()
  }

  function dispose() {
    window.removeEventListener('resize', onResize)
    renderer.dispose()
  }

  return {
    scene,
    camera,
    renderer,
    controls,
    clock,
    start,
    dispose,
    defaultMinDistance,
    defaultMaxDistance,
    setActiveScene: (s, c) => {
      activeScene = s || scene
      activeCamera = c || camera

      // Performance Optimization: Only enable shadow maps for sub-scenes (like Mars Surface)
      // that actually use them. The main Solar System scene does not use shadow casting,
      // so disabling it here saves significant GPU/CPU overhead in the primary view.
      renderer.shadowMap.enabled = !!s;

      // Update aspect ratio for the new camera
      activeCamera.aspect = window.innerWidth / window.innerHeight
      activeCamera.updateProjectionMatrix()
    }
  }
}
