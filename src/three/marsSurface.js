import * as THREE from 'three'

export function createMarsSurface(renderer) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x8a4b38) // Mars atmosphere color

  // Fog for atmosphere
  scene.fog = new THREE.FogExp2(0x8a4b38, 0.005)

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000)
  camera.position.set(0, 5, 0) // Start slightly above ground

  // Light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
  scene.add(ambientLight)

  const sunLight = new THREE.DirectionalLight(0xffccaa, 1.0)
  sunLight.position.set(100, 100, 50)
  scene.add(sunLight)

  // Skybox/Dome (optional, but reddish background is enough for now)

  // Terrain
  const textureLoader = new THREE.TextureLoader()
  const marsTex = textureLoader.load('/hq/8k_mars.jpg')
  marsTex.wrapS = marsTex.wrapT = THREE.RepeatWrapping
  marsTex.repeat.set(50, 50) // Tiling for detail

  const terrainSize = 2000
  const terrainSegments = 256
  const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments)
  geometry.rotateX(-Math.PI / 2)

  // Procedural Height
  const pos = geometry.attributes.position
  const getH = (x, z) => {
    // Combination of sine waves to simulate uneven terrain
    return (
      Math.sin(x * 0.02) * Math.cos(z * 0.02) * 5 +
      Math.sin(x * 0.05) * Math.sin(z * 0.05) * 2 +
      Math.cos(x * 0.1) * 0.5
    )
  }

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    pos.setY(i, getH(x, z))
  }
  geometry.computeVertexNormals()

  const material = new THREE.MeshStandardMaterial({
    map: marsTex,
    roughness: 0.9,
    metalness: 0.0,
  })

  const terrain = new THREE.Mesh(geometry, material)
  scene.add(terrain)

  // Controls state
  const keys = { w: false, a: false, s: false, d: false }

  let yaw = 0
  let pitch = 0

  const velocity = new THREE.Vector3()
  const direction = new THREE.Vector3()

  function update(delta) {
    // Update camera rotation
    camera.rotation.order = 'YXZ'
    camera.rotation.y = yaw
    camera.rotation.x = pitch

    // Movement
    const speed = 20
    const moveZ = Number(keys.w) - Number(keys.s)
    const moveX = Number(keys.d) - Number(keys.a)

    if (moveZ !== 0 || moveX !== 0) {
      direction.set(moveX, 0, -moveZ).normalize()

      // We want to move in the direction the camera is facing (yaw)
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw))
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw))

      const moveVec = new THREE.Vector3()
      moveVec.addScaledVector(forward, moveZ)
      moveVec.addScaledVector(right, moveX)
      moveVec.normalize().multiplyScalar(speed * delta)

      camera.position.add(moveVec)
    }

    // Ground follow
    const groundH = getH(camera.position.x, camera.position.z)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, groundH + 1.7, 0.1) // 1.7m eye level
  }

  function onKeyDown(e) {
    const key = e.key.toLowerCase()
    if (keys.hasOwnProperty(key)) keys[key] = true
  }

  function onKeyUp(e) {
    const key = e.key.toLowerCase()
    if (keys.hasOwnProperty(key)) keys[key] = false
  }

  let lastMouseX = null
  let lastMouseY = null

  function onMouseMove(e) {
    const sensitivity = 0.002

    let deltaX = e.movementX
    let deltaY = e.movementY

    if (deltaX === undefined && lastMouseX !== null) {
      deltaX = e.clientX - lastMouseX
      deltaY = e.clientY - lastMouseY
    }

    lastMouseX = e.clientX
    lastMouseY = e.clientY

    if (deltaX !== undefined) {
      yaw -= deltaX * sensitivity
      pitch -= deltaY * sensitivity
      pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, pitch))
    }
  }

  return {
    scene,
    camera,
    update,
    onKeyDown,
    onKeyUp,
    onMouseMove,
    dispose: () => {
      geometry.dispose()
      material.dispose()
      marsTex.dispose()
    }
  }
}
