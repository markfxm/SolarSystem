import * as THREE from 'three'

// Simple Perlin-like noise for terrain
class Noise {
  constructor() {
    this.p = new Uint8Array(512);
    // Fixed standard Perlin permutation table for predictability
    this.permutation = [151,160,137,91,90,15,
      131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
      190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
      88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
      77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
      102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
      135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
      5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
      223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
      129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
      251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
      49,192,214,31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
      138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
    for (let i = 0; i < 256; i++) this.p[i] = this.p[i + 256] = this.permutation[i];
  }

  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(t, a, b) { return a + t * (b - a); }
  grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x, y, z = 0) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    const fz = Math.floor(z);
    const X = fx & 255;
    const Y = fy & 255;
    const Z = fz & 255;
    x -= fx;
    y -= fy;
    z -= fz;
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    const A = this.p[X] + Y, AA = this.p[A] + Z, AB = this.p[A + 1] + Z;
    const B = this.p[X + 1] + Y, BA = this.p[B] + Z, BB = this.p[B + 1] + Z;

    return this.lerp(w, this.lerp(v, this.lerp(u, this.grad(this.p[AA], x, y, z),
      this.grad(this.p[BA], x - 1, y, z)),
      this.lerp(u, this.grad(this.p[AB], x, y - 1, z),
        this.grad(this.p[BB], x - 1, y - 1, z))),
      this.lerp(v, this.lerp(u, this.grad(this.p[AA + 1], x, y, z - 1),
        this.grad(this.p[BA + 1], x - 1, y, z - 1)),
        this.lerp(u, this.grad(this.p[AB + 1], x, y - 1, z - 1),
          this.grad(this.p[BB + 1], x - 1, y - 1, z - 1))));
  }

  /**
   * Specialized 2D noise for heightmaps to avoid redundant 3D calculations.
   */
  noise2D(x, y) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    const X = fx & 255;
    const Y = fy & 255;
    x -= fx;
    y -= fy;
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.p[X] + Y, AA = this.p[A], AB = this.p[A + 1];
    const B = this.p[X + 1] + Y, BA = this.p[B], BB = this.p[B + 1];

    return this.lerp(v, this.lerp(u, this.grad(this.p[AA], x, y, 0),
      this.grad(this.p[BA], x - 1, y, 0)),
      this.lerp(u, this.grad(this.p[AB], x, y - 1, 0),
        this.grad(this.p[BB], x - 1, y - 1, 0)));
  }
}

const perlin = new Noise();

export function createMarsSurface(renderer, options = {}) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x8a4b38)

  // Path persistence
  const STORAGE_KEY = 'mars_exploration_path'
  let explorationPath = []
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) explorationPath = JSON.parse(saved)
  } catch (e) {
    console.warn('Failed to load exploration path', e)
  }

  const lastPosition = new THREE.Vector3()
  if (explorationPath.length > 0) {
    const last = explorationPath[explorationPath.length - 1]
    lastPosition.set(last.x, 0, last.z)
  }

  let saveTimeout = null
  const saveToStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(explorationPath))
    } catch (e) {
      console.warn('Failed to save exploration path', e)
    }
    saveTimeout = null
  }

  const recordPoint = (pos) => {
    explorationPath.push({ x: Math.round(pos.x), z: Math.round(pos.z) })
    lastPosition.set(pos.x, 0, pos.z)

    // Throttled localStorage writes (every 2 seconds or on trailing edge)
    if (!saveTimeout) {
      saveTimeout = setTimeout(saveToStorage, 2000)
    }
  }

  const clearPath = () => {
    explorationPath = []
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      saveTimeout = null
    }
    localStorage.removeItem(STORAGE_KEY)
    lastPosition.set(camera.position.x, 0, camera.position.z)
  }
  scene.fog = new THREE.FogExp2(0x8a4b38, 0.01)

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000)

  // Start location: use provided coordinates or randomize
  let spawnX = options.spawnX !== undefined ? options.spawnX : (Math.random() - 0.5) * 5000;
  let spawnZ = options.spawnZ !== undefined ? options.spawnZ : (Math.random() - 0.5) * 5000;

  camera.position.set(spawnX, 5, spawnZ)

  // Audio
  const listener = new THREE.AudioListener()
  camera.add(listener)

  // Procedural Wind (Brownian Noise)
  const ctx = THREE.AudioContext.getContext()
  const bufferSize = 2 * ctx.sampleRate
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const output = noiseBuffer.getChannelData(0)
  let lastOut = 0.0
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1
    output[i] = (lastOut + (0.02 * white)) / 1.02
    lastOut = output[i]
    output[i] *= 1.5 // Adjust volume
  }
  const wind = new THREE.Audio(listener)
  wind.setBuffer(noiseBuffer)
  wind.setLoop(true)
  wind.setVolume(0.1)

  // Muffle the wind to simulate thin atmosphere
  const windFilter = ctx.createBiquadFilter()
  windFilter.type = 'lowpass'
  windFilter.frequency.setValueAtTime(400, ctx.currentTime)
  wind.setFilter(windFilter)

  // Footsteps (Simple procedural "thump")
  function playFootstep() {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(120, ctx.currentTime) // Lower starting frequency
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1)

    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(200, ctx.currentTime) // Muffled footstep

    osc.connect(gain)
    gain.connect(filter)
    filter.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  }

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
  scene.add(ambientLight)

  // Sky Dome
  const skyGeo = new THREE.SphereGeometry(4000, 32, 32)
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x8a4b38) },
      bottomColor: { value: new THREE.Color(0xffccaa) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        float mixValue = clamp((h + 0.2) * 1.5, 0.0, 1.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, mixValue), 1.0);
      }
    `,
    side: THREE.BackSide
  })
  const sky = new THREE.Mesh(skyGeo, skyMat)
  scene.add(sky)

  const sunLight = new THREE.DirectionalLight(0xffccaa, 1.5)
  sunLight.position.set(100, 200, 100)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.width = 2048
  sunLight.shadow.mapSize.height = 2048
  // Improve shadow frustum for better near-player details
  sunLight.shadow.camera.left = -200
  sunLight.shadow.camera.right = 200
  sunLight.shadow.camera.top = 200
  sunLight.shadow.camera.bottom = -200
  sunLight.shadow.camera.far = 1000
  scene.add(sunLight)

  const textureLoader = new THREE.TextureLoader()
  const marsTex = textureLoader.load('/hq/8k_mars.jpg')
  marsTex.wrapS = marsTex.wrapT = THREE.RepeatWrapping
  marsTex.repeat.set(10, 10) // Tile slightly for more detail per chunk
  marsTex.anisotropy = renderer.capabilities.getMaxAnisotropy()

  const getH = (x, z) => {
    // Apply global offsets for a better starting location (high and open)
    const ox = x + 2500;
    const oz = z + 2500;

    let h = 0;
    // Massive features (Olympus Mons style)
    h += perlin.noise2D(ox * 0.0001, oz * 0.0001) * 300;
    // Canyons (Valles Marineris style)
    // Offset canyon noise to avoid being in one at the start
    const canyon = Math.abs(perlin.noise2D(ox * 0.0005 + 123.45, oz * 0.0005 + 123.45));
    if (canyon < 0.1) {
       h -= (0.1 - canyon) * 1000;
    }
    // Hills
    h += perlin.noise2D(ox * 0.005, oz * 0.005) * 30;
    // Bumps
    h += perlin.noise2D(ox * 0.05, oz * 0.05) * 2;
    return h;
  }

  // Terrain Chunks
  const chunkSize = 400
  const chunkRes = 64
  const chunks = new Map()
  const renderDistance = 2 // 5x5 chunks

  // Rock Geometry
  const rockGeo = new THREE.DodecahedronGeometry(1, 0)
  const rockMat = new THREE.MeshStandardMaterial({
    map: marsTex, // Reuse texture
    color: 0x888888,
    roughness: 1.0,
  })

  // Dust Particles
  const particleCount = 1000
  const particleGeo = new THREE.BufferGeometry()
  const particlePos = new Float32Array(particleCount * 3)
  // Initialize particles in a volume around the starting camera position
  const initialRange = 200
  for (let i = 0; i < particleCount; i++) {
    particlePos[i * 3] = camera.position.x + (Math.random() - 0.5) * initialRange
    particlePos[i * 3 + 1] = camera.position.y + (Math.random() - 0.5) * initialRange
    particlePos[i * 3 + 2] = camera.position.z + (Math.random() - 0.5) * initialRange
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3))

  const particleMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.2,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true
  })
  const particleVelocities = new Float32Array(particleCount * 3)
  for (let i = 0; i < particleCount; i++) {
    particleVelocities[i * 3] = (Math.random() - 0.5) * 1.5 // x
    particleVelocities[i * 3 + 1] = -Math.random() * 0.4 // y (drifting down)
    particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 1.5 // z
  }

  const dustParticles = new THREE.Points(particleGeo, particleMat)
  // Prevent particles from disappearing when moving far from the origin
  dustParticles.frustumCulled = false
  // Keep the points object at world origin so particles are in world space
  scene.add(dustParticles)

  function updateParticles(delta) {
    const positions = particleGeo.attributes.position.array
    const camX = camera.position.x
    const camY = camera.position.y
    const camZ = camera.position.z
    const range = 100 // Half-size of the box around camera

    for (let i = 0; i < particleCount; i++) {
      // 1. Move particles by their velocity (drifting)
      positions[i * 3] += particleVelocities[i * 3] * delta
      positions[i * 3 + 1] += particleVelocities[i * 3 + 1] * delta
      positions[i * 3 + 2] += particleVelocities[i * 3 + 2] * delta

      // 2. Wrap world positions around camera to keep them local but in world space
      if (positions[i * 3] > camX + range) positions[i * 3] -= range * 2
      else if (positions[i * 3] < camX - range) positions[i * 3] += range * 2

      if (positions[i * 3 + 1] > camY + range) positions[i * 3 + 1] -= range * 2
      else if (positions[i * 3 + 1] < camY - range) positions[i * 3 + 1] += range * 2

      if (positions[i * 3 + 2] > camZ + range) positions[i * 3 + 2] -= range * 2
      else if (positions[i * 3 + 2] < camZ - range) positions[i * 3 + 2] += range * 2
    }
    particleGeo.attributes.position.needsUpdate = true
  }

  function createChunk(cx, cz) {
    const geometry = new THREE.PlaneGeometry(chunkSize, chunkSize, chunkRes, chunkRes)
    geometry.rotateX(-Math.PI / 2)

    const pos = geometry.attributes.position
    const pArray = pos.array
    const ox = cx * chunkSize
    const oz = cz * chunkSize

    // Optimized: Direct access to buffer array avoids function call overhead (getX/setY)
    for (let i = 0; i < pArray.length; i += 3) {
      const x = pArray[i] + ox
      const z = pArray[i + 2] + oz
      pArray[i + 1] = getH(x, z)
    }
    pos.needsUpdate = true
    geometry.computeVertexNormals()

    const material = new THREE.MeshStandardMaterial({
      map: marsTex,
      roughness: 0.8,
      metalness: 0.1,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(cx * chunkSize, 0, cz * chunkSize)
    mesh.receiveShadow = true
    scene.add(mesh)

    // Add Rocks
    const rockCount = 50
    const instancedRocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount)
    const dummy = new THREE.Object3D()
    for (let i = 0; i < rockCount; i++) {
      const rx = (Math.random() - 0.5) * chunkSize + cx * chunkSize
      const rz = (Math.random() - 0.5) * chunkSize + cz * chunkSize
      const ry = getH(rx, rz)

      dummy.position.set(rx - cx * chunkSize, ry, rz - cz * chunkSize)
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      const scale = 0.5 + Math.random() * 2
      dummy.scale.set(scale, scale, scale)
      dummy.updateMatrix()
      instancedRocks.setMatrixAt(i, dummy.matrix)
    }
    instancedRocks.castShadow = true
    instancedRocks.receiveShadow = true
    mesh.add(instancedRocks)

    return mesh
  }

  function updateChunks() {
    const camX = Math.round(camera.position.x / chunkSize)
    const camZ = Math.round(camera.position.z / chunkSize)

    for (let x = camX - renderDistance; x <= camX + renderDistance; x++) {
      for (let z = camZ - renderDistance; z <= camZ + renderDistance; z++) {
        const key = `${x},${z}`
        if (!chunks.has(key)) {
          chunks.set(key, createChunk(x, z))
        }
      }
    }

    // Remove far chunks
    for (const [key, chunk] of chunks) {
      const [x, z] = key.split(',').map(Number)
      if (Math.abs(x - camX) > renderDistance + 1 || Math.abs(z - camZ) > renderDistance + 1) {
        scene.remove(chunk)
        chunk.geometry.dispose()
        chunk.material.dispose()
        chunks.delete(key)
      }
    }
  }

  updateChunks()

  // Lander
  const landerPos = { x: camera.position.x, z: camera.position.z - 10 }
  function createLander() {
    const group = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 2, 2, 6),
      new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.2 })
    )
    body.position.y = 2
    body.castShadow = true
    group.add(body)

    const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 3)
    const legMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 })
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(legGeo, legMat)
      const angle = (i / 4) * Math.PI * 2
      leg.position.set(Math.cos(angle) * 2, 1, Math.sin(angle) * 2)
      leg.rotation.x = Math.sin(angle) * 0.5
      leg.rotation.z = -Math.cos(angle) * 0.5
      leg.castShadow = true
      group.add(leg)
    }

    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    )
    dish.position.set(0, 3, 0)
    dish.rotation.x = -Math.PI / 4
    dish.castShadow = true
    group.add(dish)

    const lx = landerPos.x
    const lz = landerPos.z
    group.position.set(lx, getH(lx, lz), lz)
    scene.add(group)
    return group
  }
  const lander = createLander()

  // Controls state
  const keys = { w: false, a: false, s: false, d: false }
  let yaw = 0
  let pitch = 0

  let stepTimer = 0
  function update(delta) {
    if (!wind.isPlaying) {
      wind.play()
    }

    // Path recording
    const dist = camera.position.distanceTo(lastPosition)
    if (dist > 5) {
      recordPoint(camera.position)
    }

    camera.rotation.order = 'YXZ'
    camera.rotation.y = yaw
    camera.rotation.x = pitch

    const speed = 20.0
    const moveZ = Number(keys.w) - Number(keys.s)
    const moveX = Number(keys.d) - Number(keys.a)

    if (moveZ !== 0 || moveX !== 0) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw))
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw))

      const moveVec = new THREE.Vector3()
      moveVec.addScaledVector(forward, moveZ)
      moveVec.addScaledVector(right, moveX)
      moveVec.normalize().multiplyScalar(speed * delta)

      camera.position.add(moveVec)

      stepTimer += delta
      if (stepTimer > 10.0 / speed) { // Adjusted frequency for higher speed
        playFootstep()
        stepTimer = 0
      }
    } else {
      stepTimer = 0
    }

    const groundH = getH(camera.position.x, camera.position.z)
    const targetY = groundH + 1.7

    // Snappier height adjustment (increased from 0.2 to 0.8)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.8)

    // Safety check: Ensure camera never drops below ground level even during rapid movement
    const minHeight = groundH + 0.5
    if (camera.position.y < minHeight) {
      camera.position.y = minHeight
    }

    // Apply head bobbing AFTER lerp and safety check
    if (moveZ !== 0 || moveX !== 0) {
      camera.position.y += Math.sin(Date.now() * 0.01) * 0.05
    }

    updateChunks()
    updateParticles(delta)
    sky.position.copy(camera.position)
    sunLight.position.set(camera.position.x + 100, camera.position.y + 200, camera.position.z + 100)
    sunLight.target.position.copy(camera.position)
    sunLight.target.updateMatrixWorld()
  }

  function onKeyDown(e) {
    const key = e.key.toLowerCase()
    if (keys.hasOwnProperty(key)) keys[key] = true
  }

  function onKeyUp(e) {
    const key = e.key.toLowerCase()
    if (keys.hasOwnProperty(key)) keys[key] = false
  }

  function onMouseMove(e) {
    const sensitivity = 0.002
    yaw -= (e.movementX || 0) * sensitivity
    pitch -= (e.movementY || 0) * sensitivity
    pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, pitch))
  }

  function requestPointerLock() {
    renderer.domElement.requestPointerLock()
  }

  return {
    scene,
    camera,
    update,
    onKeyDown,
    onKeyUp,
    onMouseMove,
    requestPointerLock,
    getExplorationPath: () => explorationPath,
    getLanderPosition: () => landerPos,
    clearPath,
    teleport: (x, z) => {
      camera.position.set(x, 5, z);
      landerPos.x = x;
      landerPos.z = z - 10;
      lander.position.set(landerPos.x, getH(landerPos.x, landerPos.z), landerPos.z);
      // Clear path when teleporting to a new POI
      explorationPath = [];
      localStorage.removeItem(STORAGE_KEY);
      lastPosition.set(x, 0, z);
      updateChunks();
    },
    dispose: () => {
      if (wind.isPlaying) wind.stop()
      if (saveTimeout) {
        clearTimeout(saveTimeout)
        saveToStorage() // Final save on dispose
      }
      for (const chunk of chunks.values()) {
        chunk.geometry.dispose()
        chunk.material.dispose()
      }
      marsTex.dispose()
    }
  }
}
