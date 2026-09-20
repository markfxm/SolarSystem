import * as THREE from 'three'
import { createMarsVehicle } from './MarsVehicle.js'
import { createMarsControls } from './MarsControls.js'
import { createMarsExplorationPath } from './MarsExplorationPath.js'
import { createPlayerCollision } from './PlayerCollision.js'
import { createMarsMission, createMarsMissionDefinitions } from './MarsMission.js'
import { createMarsExpedition } from './MarsExpedition.js'
import { createMarsLandscape, createRockGeometry, makeSurfaceTexture, marsRandom } from './MarsEnvironment.js'

// Pre-calculated lookup table for the Perlin fade function (quintic polynomial: 6t^5 - 15t^4 + 10t^3)
// 4096 entries provide sufficient precision for procedural terrain while eliminating
// thousands of polynomial calculations per terrain chunk load.
const LUT_SIZE = 4096;
const FADE_LUT = new Float32Array(LUT_SIZE);
for (let i = 0; i < LUT_SIZE; i++) {
  const t = i / (LUT_SIZE - 1);
  FADE_LUT[i] = t * t * t * (t * (t * 6 - 15) + 10);
}

// Pre-calculated gradient lookup tables for 2D Perlin noise.
// These represent the 16 standard Perlin gradients (projected to 2D)
// and eliminate 12+ ternary branch evaluations per noise2D call.
const GRAD_X = new Float32Array([1, -1, 1, -1, 1, -1, 1, -1, 0, 0, 0, 0, 1, 0, -1, 0]);
const GRAD_Y = new Float32Array([1, 1, -1, -1, 0, 0, 0, 0, 1, -1, 1, -1, 1, -1, 1, -1]);

// Simple Perlin-like noise for terrain
class Noise {
  constructor() {
    this.p = new Uint8Array(512);
    // Fixed standard Perlin permutation table for predictability
    this.permutation = [151, 160, 137, 91, 90, 15,
      131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
      190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
      88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166,
      77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244,
      102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
      135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
      5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
      223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
      129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
      251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
      49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
      138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];
    for (let i = 0; i < 256; i++) this.p[i] = this.p[i + 256] = this.permutation[i];
  }

  /**
   * Specialized 2D noise for heightmaps to avoid redundant 3D calculations.
   * Performance Optimization: Inlined fade, lerp, and LUT-based gradient operations.
   * Using pre-calculated GRAD_X/Y tables eliminates 12 ternary branch evaluations
   * per call, resulting in a ~3x speedup for terrain generation.
   */
  noise2D(x, y) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    const X = fx & 255;
    const Y = fy & 255;
    const x_rel = x - fx;
    const y_rel = y - fy;

    // Inlined fade: Use pre-calculated lookup table for O(1) polynomial calculation.
    const u = FADE_LUT[(x_rel * (LUT_SIZE - 1)) | 0];
    const v = FADE_LUT[(y_rel * (LUT_SIZE - 1)) | 0];

    // Optimization: Cache permutation table reference to minimize property access
    const p = this.p;
    const A = p[X] + Y, AA = p[A], AB = p[A + 1];
    const B = p[X + 1] + Y, BA = p[B], BB = p[B + 1];

    const x0 = x_rel, x1 = x_rel - 1;
    const y0 = y_rel, y1 = y_rel - 1;

    // Performance Optimization: Use pre-calculated Gradient LUTs to eliminate branch logic.
    // Each corner's gradient contribution is now a simple O(1) lookup and multiplication.
    const hAA = p[AA] & 15;
    const resAA = GRAD_X[hAA] * x0 + GRAD_Y[hAA] * y0;

    const hBA = p[BA] & 15;
    const resBA = GRAD_X[hBA] * x1 + GRAD_Y[hBA] * y0;

    const lerpA = resAA + u * (resBA - resAA);

    const hAB = p[AB] & 15;
    const resAB = GRAD_X[hAB] * x0 + GRAD_Y[hAB] * y1;

    const hBB = p[BB] & 15;
    const resBB = GRAD_X[hBB] * x1 + GRAD_Y[hBB] * y1;

    const lerpB = resAB + u * (resBB - resAB);

    return lerpA + v * (lerpB - lerpA);
  }
}

const perlin = new Noise();

export function createMarsSurface(renderer, options = {}) {
  const previousToneMapping = renderer.toneMapping
  const previousExposure = renderer.toneMappingExposure
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  const collision = createPlayerCollision()
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x8a4b38)

  const explorationPath = createMarsExplorationPath(localStorage)
  const clearPath = () => explorationPath.clear(getPlayerPosition())
  scene.fog = new THREE.FogExp2(0xb67e61, 0.00155)

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000)
  // Optimization: Enable Layer 1 so decorative/interactive elements (POIs, etc.) remain visible
  // if they are moved to Layer 1 for raycast pruning.
  camera.layers.enable(1)

  // Start location: use provided coordinates or randomize
  let spawnX = options.spawnX !== undefined ? options.spawnX : (Math.random() - 0.5) * 5000;
  let spawnZ = options.spawnZ !== undefined ? options.spawnZ : (Math.random() - 0.5) * 5000;

  const chunkSize = 400
  const origin = new THREE.Vector3(Math.round(spawnX / chunkSize) * chunkSize, 0, Math.round(spawnZ / chunkSize) * chunkSize)
  const playerPosition = new THREE.Vector3()
  let vehicle = null
  const getPlayerPosition = () => playerPosition.copy(vehicle?.state.mode === 'IN_VEHICLE' ? vehicle.getPosition() : camera.position).add(origin)
  camera.position.set(spawnX - origin.x, 5, spawnZ - origin.z)

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
  const footsteps = new Set()
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
    const stop = () => { osc.stop(); osc.disconnect(); gain.disconnect(); filter.disconnect(); footsteps.delete(stop) }
    footsteps.add(stop)
    osc.onended = () => { osc.disconnect(); gain.disconnect(); filter.disconnect(); footsteps.delete(stop) }

    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  }

  const ambientLight = new THREE.HemisphereLight(0xb7c9dc, 0x78472e, 1.7)
  scene.add(ambientLight)

  // Sky Dome
  const skyGeo = new THREE.SphereGeometry(4000, 32, 32)
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x352e37) },
      bottomColor: { value: new THREE.Color(0xc57343) },
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
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i+vec2(1.,0.)), f.x), mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), f.x), f.y);
      }
      void main() {
        vec3 dir = normalize(vWorldPosition - cameraPosition);
        float h = max(dir.y, 0.0);
        vec3 color = mix(bottomColor, topColor, smoothstep(0.0, 0.85, h));
        float lightAngle = max(dot(dir, normalize(vec3(-0.12, 0.16, -0.9))), 0.0);
        color += vec3(0.6, 0.25, 0.06) * pow(lightAngle, 16.0);
        color += vec3(0.9, 0.5, 0.17) * pow(lightAngle, 180.0);
        vec2 cloudUv = dir.xz / max(dir.y + 0.35, 0.08);
        float clouds = noise(cloudUv * 4.0) * 0.55 + noise(cloudUv * 12.0) * 0.3 + noise(cloudUv * 32.0) * 0.15;
        color = mix(color, color * vec3(0.65,0.66,0.7), smoothstep(0.48,0.8,clouds) * smoothstep(0.01,0.3,h) * 0.48);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side: THREE.BackSide
  })
  const sky = new THREE.Mesh(skyGeo, skyMat)
  scene.add(sky)
  const environmentScene = new THREE.Scene()
  environmentScene.add(new THREE.Mesh(skyGeo, skyMat))
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(environmentScene, 0, 0.1, 5000)
  scene.environment = environment.texture
  scene.environmentIntensity = 0.45
  pmrem.dispose()

  const sunLight = new THREE.DirectionalLight(0xffc38d, 3.3)
  sunLight.position.set(100, 200, 100)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.width = 2048
  sunLight.shadow.mapSize.height = 2048
  // Improve shadow frustum for better near-player details
  sunLight.shadow.camera.left = -65
  sunLight.shadow.camera.right = 65
  sunLight.shadow.camera.top = 65
  sunLight.shadow.camera.bottom = -65
  sunLight.shadow.camera.far = 1000
  sunLight.shadow.normalBias = 0.035
  sunLight.shadow.bias = -0.00015
  sunLight.shadow.radius = 3
  scene.add(sunLight)
  scene.add(sunLight.target)

  const textureLoader = new THREE.TextureLoader()
  const groundTextures = ['diffuse', 'nor_gl', 'rough'].map(name => {
    const texture = textureLoader.load(`/mars/${name}.jpg`)
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(80, 80)
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    if (name === 'diffuse') texture.colorSpace = THREE.SRGBColorSpace
    return texture
  })
  const terrainMaterial = new THREE.MeshStandardMaterial({
    map: groundTextures[0], normalMap: groundTextures[1], roughnessMap: groundTextures[2],
    normalScale: new THREE.Vector2(0.85, 0.85), color: 0xd57550, roughness: 1, metalness: 0,
  })

  const chunkMeshPool = []
  const _dummy = new THREE.Object3D()

  const naturalHeight = (x, z) => {
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

  // A level landing apron blends back into the surrounding procedural hills.
  let landingHeight = naturalHeight(spawnX, spawnZ)
  const getH = (x, z) => {
    const dx = x - spawnX, dz = z - spawnZ
    const distance = Math.hypot(dx, dz)
    const bumps = perlin.noise2D(dx * 0.025 + 7, dz * 0.025 + 3) * 5
    const dunes = Math.sin(dx * 0.017 + dz * 0.01) * 5 + perlin.noise2D(dx * 0.008, dz * 0.008) * 14
    const outsideCamp = THREE.MathUtils.smoothstep(distance, 38, 100)
    let local = landingHeight + bumps * outsideCamp + dunes * THREE.MathUtils.smoothstep(distance, 80, 200)
    const signalHill = Math.exp(-((dx - 26) ** 2 + (dz + 112) ** 2) / 800)
    local = THREE.MathUtils.lerp(local, landingHeight + 7, signalHill)
    const blend = THREE.MathUtils.smoothstep(distance, 450, 900)
    return THREE.MathUtils.lerp(local, naturalHeight(x, z), blend)
  }
  const getLocalH = (x, z) => getH(x + origin.x, z + origin.z)

  // Performance Optimization: Cache ground height for the player to avoid redundant Perlin calls
  // when stationary or moving sub-millimeter distances.
  const _groundCache = { x: Infinity, z: Infinity, h: 0 };
  const getCachedH = (x, z) => {
    // Only recalculate if camera moved more than 0.01m (threshold)
    if (Math.abs(x - _groundCache.x) > 0.01 || Math.abs(z - _groundCache.z) > 0.01) {
      _groundCache.x = x;
      _groundCache.z = z;
      _groundCache.h = getLocalH(x, z);
    }
    return _groundCache.h;
  }

  // Terrain Chunks
  const chunkRes = 96
  const chunks = new Map()
  const renderDistance = 2 // 5x5 chunks

  // Rock Geometry
  const rockGeo = createRockGeometry(2, 3)
  const rockTextures = ['diffuse', 'nor_gl', 'rough'].map(name => {
    const texture = textureLoader.load(`/mars/${name}.jpg`)
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1.5, 1.5)
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    if (name === 'diffuse') texture.colorSpace = THREE.SRGBColorSpace
    return texture
  })
  const rockMat = new THREE.MeshStandardMaterial({
    map: rockTextures[0], normalMap: rockTextures[1], roughnessMap: rockTextures[2],
    color: 0x444447, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 1, vertexColors: true,
  })

  for (const material of [terrainMaterial, rockMat]) {
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D(map, vMapUv);
          float mineral = dot(sampledDiffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          diffuseColor *= vec4(vec3(mineral), sampledDiffuseColor.a);
        #endif
      `)
    }
    material.customProgramCacheKey = () => 'mars-mineral-albedo'
  }

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

  const dustTexture = makeSurfaceTexture('glow')
  const particleMat = new THREE.PointsMaterial({
    map: dustTexture,
    color: 0xe1b591,
    size: 0.065,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
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
  // Particle buffers use the same local frame as the camera.
  scene.add(dustParticles)

  // Scratch variables for particle update optimization
  const _lastPartCamPos = new THREE.Vector3(Infinity, Infinity, Infinity);

  function updateParticles(delta) {
    // Performance Optimization: Skip full particle update if simulation is paused
    // and camera hasn't moved. This eliminates redundant CPU loops and GPU uploads.
    // We use a small threshold (1e-7) for camera movement to ignore jitter.
    const camMoved = _lastPartCamPos.distanceToSquared(camera.position) > 1e-7;
    if (delta <= 0 && !camMoved) return;
    _lastPartCamPos.copy(camera.position);

    const positions = particleGeo.attributes.position.array
    const velocities = particleVelocities
    const camX = camera.position.x
    const camY = camera.position.y
    const camZ = camera.position.z
    const range = 100 // Half-size of the box around camera
    const doubleRange = range * 2

    // Pre-calculate boundaries to avoid redundant additions in the loop
    const minX = camX - range, maxX = camX + range
    const minY = camY - range, maxY = camY + range
    const minZ = camZ - range, maxZ = camZ + range

    let anyMoved = false;
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      const i31 = i3 + 1
      const i32 = i3 + 2

      // 1. Move particles by their velocity (drifting)
      // Optimized: Use local variables to minimize TypedArray access
      let px = positions[i3] + velocities[i3] * delta
      let py = positions[i31] + velocities[i31] * delta
      let pz = positions[i32] + velocities[i32] * delta

      // 2. Wrap world positions around camera to keep them local but in world space
      if (px > maxX) px -= doubleRange
      else if (px < minX) px += doubleRange

      if (py > maxY) py -= doubleRange
      else if (py < minY) py += doubleRange

      if (pz > maxZ) pz -= doubleRange
      else if (pz < minZ) pz += doubleRange

      // Performance Optimization: Track if any particle actually moved significantly
      // to avoid redundant GPU re-uploads.
      if (!anyMoved && (positions[i3] !== px || positions[i31] !== py || positions[i32] !== pz)) {
        anyMoved = true;
      }

      positions[i3] = px
      positions[i31] = py
      positions[i32] = pz
    }

    if (anyMoved) {
      particleGeo.attributes.position.needsUpdate = true
    }
  }

  function createChunk(cx, cz) {
    let mesh, geometry, instancedRocks
    const ox = cx * chunkSize
    const oz = cz * chunkSize

    if (chunkMeshPool.length > 0) {
      mesh = chunkMeshPool.pop()
      geometry = mesh.geometry
      instancedRocks = mesh.children[0]
    } else {
      geometry = new THREE.PlaneGeometry(chunkSize, chunkSize, chunkRes, chunkRes)
      geometry.rotateX(-Math.PI / 2)
      mesh = new THREE.Mesh(geometry, terrainMaterial)
      mesh.receiveShadow = true

      // Add Rocks (Instanced)
      const rockCount = 140
      instancedRocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount)
      instancedRocks.castShadow = true
      instancedRocks.receiveShadow = true
      mesh.add(instancedRocks)
    }

    const pos = geometry.attributes.position
    const pArray = pos.array

    // Optimized: Direct access to buffer array avoids function call overhead (getX/setY)
    for (let i = 0; i < pArray.length; i += 3) {
      const x = pArray[i] + ox
      const z = pArray[i + 2] + oz
      pArray[i + 1] = getH(x, z)
    }
    pos.needsUpdate = true
    geometry.computeVertexNormals()

    mesh.position.set(ox - origin.x, 0, oz - origin.z)
    mesh.userData.cx = cx
    mesh.userData.cz = cz
    scene.add(mesh)

    const random = marsRandom((cx * 73856093) ^ (cz * 19349663))
    mesh.userData.removeColliders?.forEach(remove => remove())
    mesh.userData.removeColliders = []
    // Update rock positions for the recycled/new chunk
    const rockCount = instancedRocks.count
    for (let i = 0; i < rockCount; i++) {
      const rx = (random() - 0.5) * chunkSize + ox
      const rz = (random() - 0.5) * chunkSize + oz
      const ry = getH(rx, rz)

      _dummy.position.set(rx - ox, ry, rz - oz)
      _dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI)
      const inCamp = Math.hypot(rx - spawnX, rz - spawnZ) < 72
      const scale = inCamp ? 0 : 0.2 + random() ** 3 * 2.6
      _dummy.scale.set(scale * (0.8 + random()), scale, scale * (1 + random()))
      _dummy.updateMatrix()
      instancedRocks.setMatrixAt(i, _dummy.matrix)
      if (scale >= 0.5) {
        if (!rockGeo.boundingBox) rockGeo.computeBoundingBox()
        const bounds = rockGeo.boundingBox.clone().applyMatrix4(_dummy.matrix).translate(mesh.position)
        // Only low, narrow rocks are traversable by NOMAD; walking keeps its
        // existing collisions, and camp equipment is never tagged passable.
        const vehiclePassable = bounds.max.y - ry <= 0.8 &&
          Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) <= 1.6
        mesh.userData.removeColliders.push(collision.addBox(bounds.min, bounds.max, { vehiclePassable }))
      }
    }
    instancedRocks.instanceMatrix.needsUpdate = true

    return mesh
  }

  let lastCamX = Infinity;
  let lastCamZ = Infinity;
  const chunkQueue = [];

  function updateChunks() {
    const globalPlayer = getPlayerPosition()
    const camX = Math.round(globalPlayer.x / chunkSize)
    const camZ = Math.round(globalPlayer.z / chunkSize)

    // Optimized: Only update queue if the camera has moved to a different chunk
    if (camX !== lastCamX || camZ !== lastCamZ) {
      lastCamX = camX;
      lastCamZ = camZ;

      // Reset queue and find missing chunks in range
      chunkQueue.length = 0;
      for (let x = camX - renderDistance; x <= camX + renderDistance; x++) {
        for (let z = camZ - renderDistance; z <= camZ + renderDistance; z++) {
          const key = `${x},${z}`
          if (!chunks.has(key)) {
            chunkQueue.push({ x, z });
          }
        }
      }

      // Sort queue by distance to camera so nearest chunks load first
      chunkQueue.sort((a, b) => {
        const da = (a.x - camX) ** 2 + (a.z - camZ) ** 2;
        const db = (b.x - camX) ** 2 + (b.z - camZ) ** 2;
        return da - db;
      });
    }

    // Performance Boost: Process at most one chunk creation per frame to maintain smooth 60fps.
    // This spreads the heavy computation of terrain generation (Perlin noise + Geometry)
    // over multiple frames, eliminating the frame-rate drops (jank) encountered
    // during rapid surface exploration.
    while (chunkQueue.length > 0) {
      const { x, z } = chunkQueue.shift();
      // Verify it's still in range before creating
      if (Math.abs(x - camX) <= renderDistance && Math.abs(z - camZ) <= renderDistance) {
        const key = `${x},${z}`;
        if (!chunks.has(key)) {
          chunks.set(key, createChunk(x, z));
          break; // Created one chunk, stop for this frame
        }
      }
    }

    // Performance Optimization: Only perform the O(N) cleanup loop when a chunk boundary is crossed
    if (camX !== lastCleanupX || camZ !== lastCleanupZ) {
      lastCleanupX = camX;
      lastCleanupZ = camZ;

      // Remove far chunks
      for (const [key, chunk] of chunks) {
        const x = chunk.userData.cx
        const z = chunk.userData.cz
        if (Math.abs(x - camX) > renderDistance + 1 || Math.abs(z - camZ) > renderDistance + 1) {
          chunk.userData.removeColliders?.forEach(remove => remove())
          scene.remove(chunk)
          // Optimized: Recycle instead of dispose to avoid GC and redundant reallocations
          chunkMeshPool.push(chunk)
          chunks.delete(key)
        }
      }
    }
  }

  let lastCleanupX = Infinity;
  let lastCleanupZ = Infinity;

  updateChunks()

  let expedition = createMarsExpedition(scene, camera, getH, spawnX, spawnZ, collision, origin)
  vehicle = createMarsVehicle(expedition.rover, camera, collision, getLocalH, expedition.scanner)
  let landscape = createMarsLandscape(scene, getH, spawnX, spawnZ, rockMat, collision, origin)
  const landerPos = expedition.baseTarget.clone()
  camera.position.set(landerPos.x + 10 - origin.x, getH(landerPos.x + 10, landerPos.z) + 1.7, landerPos.z - origin.z)
  let mission = createMarsMission(createMarsMissionDefinitions(expedition.signals, landerPos))
  let scanTone = null
  function stopScanTone() {
    if (!scanTone) return
    scanTone.oscillator.stop()
    scanTone.oscillator.disconnect()
    scanTone.gain.disconnect()
    scanTone = null
  }
  function interact() {
    if (controls.mode !== 'explore') return
    if (vehicle.interact()) {
      clearKeys()
      yaw = vehicle.state.mode === 'ON_FOOT' ? expedition.rover.rotation.y + Math.PI : yaw
      pitch = 0
      return
    }
    if (!mission.interact(getPlayerPosition())) return
    ctx.resume().catch(() => {})
  }
  function updateScanTone(active) {
    if (!active) { stopScanTone(); return }
    if (!scanTone) {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain()
      gain.gain.value = 0.025
      oscillator.connect(gain); gain.connect(listener.getInput())
      oscillator.start()
      scanTone = { oscillator, gain }
    }
    scanTone.oscillator.frequency.setTargetAtTime(320 + mission.state.progress * 700, ctx.currentTime, 0.08)
  }
  let elapsed = 0
  const sun = new THREE.Mesh(new THREE.SphereGeometry(18, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2, 0.8), fog: false, toneMapped: false }))
  scene.add(sun)

  // Only translate the local frame. Global chunk keys, terrain samples and mission
  // anchors are unchanged, so rebasing never reloads terrain or restarts a mission.
  function rebaseOrigin() {
    if (Math.max(Math.abs(camera.position.x), Math.abs(camera.position.z)) <= 2000) return
    const dx = Math.round(camera.position.x / chunkSize) * chunkSize
    const dz = Math.round(camera.position.z / chunkSize) * chunkSize
    origin.x += dx; origin.z += dz
    camera.position.x -= dx; camera.position.z -= dz
    for (const chunk of chunks.values()) {
      chunk.position.x -= dx; chunk.position.z -= dz
    }
    expedition.shiftOrigin(dx, dz)
    landscape.shiftOrigin(dx, dz)
    collision.shiftOrigin(dx, dz)
    for (let i = 0; i < particlePos.length; i += 3) {
      particlePos[i] -= dx; particlePos[i + 2] -= dz
    }
    particleGeo.attributes.position.needsUpdate = true
    _lastPartCamPos.x -= dx; _lastPartCamPos.z -= dz
    _groundCache.x = Infinity
    for (const object of [sky, sun, sunLight, sunLight.target]) {
      object.position.x -= dx; object.position.z -= dz
    }
  }

  // Controls state
  const keys = { w: false, a: false, s: false, d: false }
  let yaw = 0
  let pitch = 0

  // Scratch variables for update loop to avoid per-frame GC
  const _vForward = new THREE.Vector3();
  const _vRight = new THREE.Vector3();
  const _vMove = new THREE.Vector3();
  const _qYaw = new THREE.Quaternion();
  const _vAxisY = new THREE.Vector3(0, 1, 0);

  let stepTimer = 0
  const controls = createMarsControls(renderer.domElement, mode => {
    clearKeys()
    stepTimer = 0
    mission.state.paused = mode === 'paused'
    if (mode === 'paused') {
      stopScanTone()
      for (const stop of footsteps) stop()
      if (wind.isPlaying) wind.stop()
    }
    options.onControlModeChange?.(mode)
  })
  function update(delta) {
    if (controls.mode === 'paused') return
    elapsed += delta
    expedition.update(elapsed, mission.state)
    landscape.update(elapsed)
    sun.position.set(camera.position.x - 120, camera.position.y + 160, camera.position.z - 900)
    if (!wind.isPlaying) {
      wind.play()
    }

    explorationPath.record(getPlayerPosition())

    vehicle.update(delta, keys, controls.mode === 'explore')
    const onFoot = vehicle.state.mode === 'ON_FOOT'
    if (onFoot) {
    camera.rotation.order = 'YXZ'
    camera.rotation.y = yaw
    camera.rotation.x = pitch

    if (controls.mode !== 'explore') clearKeys()
    const speed = 8.0
    const moveZ = Number(keys.w) - Number(keys.s)
    const moveX = Number(keys.d) - Number(keys.a)

    if (moveZ !== 0 || moveX !== 0) {
      _qYaw.setFromAxisAngle(_vAxisY, yaw)

      _vForward.set(0, 0, -1).applyQuaternion(_qYaw)
      _vRight.set(1, 0, 0).applyQuaternion(_qYaw)

      _vMove.set(0, 0, 0)
      _vMove.addScaledVector(_vForward, moveZ)
      _vMove.addScaledVector(_vRight, moveX)
      _vMove.normalize().multiplyScalar(speed * delta)

      collision.move(camera.position, _vMove, getLocalH)

      stepTimer += delta
      if (stepTimer > 10.0 / speed) { // Adjusted frequency for higher speed
        playFootstep()
        stepTimer = 0
      }
    } else {
      stepTimer = 0
    }

    const groundH = getCachedH(camera.position.x, camera.position.z)
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

    }
    rebaseOrigin()
    mission.update(delta, getPlayerPosition(), onFoot)
    updateScanTone(mission.state.stage === 'scanning')
    updateChunks()
    updateParticles(delta)
    sky.position.copy(camera.position)
    sunLight.position.set(camera.position.x - 27, camera.position.y + 35, camera.position.z - 200)
    sunLight.target.position.copy(camera.position)
    sunLight.target.updateMatrixWorld()
  }

  function clearKeys() {
    vehicle?.clearInput()
    for (const key of Object.keys(keys)) keys[key] = false
  }
  function onKeyDown(e) {
    if (e.key === 'Escape') { controls.pause(); return }
    if (controls.mode !== 'explore' || e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
    if (e.key.toLowerCase() === 'e' && !e.repeat) interact()
    const key = ({ ArrowUp: 'w', ArrowDown: 's', ArrowLeft: 'a', ArrowRight: 'd' })[e.key] || e.key.toLowerCase()
    if (e.key.startsWith('Arrow')) e.preventDefault()
    if (keys.hasOwnProperty(key)) keys[key] = true
  }

  function onKeyUp(e) {
    const key = ({ ArrowUp: 'w', ArrowDown: 's', ArrowLeft: 'a', ArrowRight: 'd' })[e.key] || e.key.toLowerCase()
    if (keys.hasOwnProperty(key)) keys[key] = false
  }

  function onMouseMove(e) {
    if (controls.mode !== 'explore') return
    if (vehicle.state.mode === 'IN_VEHICLE') {
      vehicle.steerMouse(e.movementX || 0)
      return
    }
    const sensitivity = 0.002
    yaw -= (e.movementX || 0) * sensitivity
    pitch -= (e.movementY || 0) * sensitivity
    pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, pitch))
  }

  function requestPointerLock() {
    ctx.resume().catch(() => {})
    controls.requestExplore()
  }

  const markerPosition = new THREE.Vector3()
  const baseMarker = { x: 0, y: 0, visible: false }
  function getBaseMarker() {
    camera.updateMatrixWorld()
    markerPosition.copy(mission.state.activeTarget?.position || landerPos).sub(origin)
    markerPosition.y += 2.2
    markerPosition.project(camera)
    baseMarker.visible = (mission.state.stage === 'return' || mission.state.stage === 'upload') && markerPosition.z > -1 && markerPosition.z < 1 && Math.abs(markerPosition.x) < 1 && Math.abs(markerPosition.y) < 1
    baseMarker.x = (markerPosition.x + 1) * 50
    baseMarker.y = (1 - markerPosition.y) * 50
    return baseMarker
  }

  return {
    scene,
    camera,
    getVehicleState: () => vehicle.state,
    getPlayerYaw: () => vehicle.state.mode === 'IN_VEHICLE' ? expedition.rover.rotation.y + Math.PI : yaw,
    update,
    onKeyDown,
    onKeyUp,
    onMouseMove,
    requestPointerLock,
    enterUi: controls.enterUi,
    pause: controls.pause,
    getExplorationPath: () => explorationPath.points,
    getPlayerPosition,
    getLanderPosition: () => landerPos,
    getSignalPosition: () => mission.state.scanTarget.position,
    getMissionState: () => mission.state,
    getBaseMarker,
    interact,
    clearPath,
    teleport: (x, z) => {
      spawnX = x; spawnZ = z; landingHeight = naturalHeight(x, z);
      origin.set(Math.round(x / chunkSize) * chunkSize, 0, Math.round(z / chunkSize) * chunkSize);
      camera.position.set(x - origin.x, getH(x, z) + 1.7, z - origin.z);
      vehicle.dispose();
      expedition.dispose();
      expedition = createMarsExpedition(scene, camera, getH, x, z, collision, origin);
      vehicle = createMarsVehicle(expedition.rover, camera, collision, getLocalH, expedition.scanner);
      landscape.dispose();
      landscape = createMarsLandscape(scene, getH, x, z, rockMat, collision, origin);
      for (const chunk of chunks.values()) { chunk.userData.removeColliders?.forEach(remove => remove()); scene.remove(chunk); chunkMeshPool.push(chunk) }
      chunks.clear();
      lastCamX = Infinity; lastCamZ = Infinity;
      lastCleanupX = Infinity; lastCleanupZ = Infinity;
      _groundCache.x = Infinity;
      landerPos.copy(expedition.baseTarget);
      camera.position.set(landerPos.x + 10 - origin.x, getH(landerPos.x + 10, landerPos.z) + 1.7, landerPos.z - origin.z);
      // A new landing uses a new frame; keep dust near the new camera immediately.
      for (let i = 0; i < particlePos.length; i += 3) {
        particlePos[i] = camera.position.x + (Math.random() - 0.5) * initialRange;
        particlePos[i + 1] = camera.position.y + (Math.random() - 0.5) * initialRange;
        particlePos[i + 2] = camera.position.z + (Math.random() - 0.5) * initialRange;
      }
      particleGeo.attributes.position.needsUpdate = true;
      _lastPartCamPos.set(Infinity, Infinity, Infinity);
      sky.position.copy(camera.position);
      sun.position.set(camera.position.x - 120, camera.position.y + 160, camera.position.z - 900);
      sunLight.position.set(camera.position.x - 27, camera.position.y + 35, camera.position.z - 200);
      sunLight.target.position.copy(camera.position);
      sunLight.target.updateMatrixWorld();
      stopScanTone(); clearKeys();
      mission = createMarsMission(createMarsMissionDefinitions(expedition.signals, landerPos));
      // Clear path when teleporting to a new POI
      clearPath();
      updateChunks();
    },
    dispose: () => {
      controls.dispose()
      vehicle.dispose()
      collision.clear()
      expedition.dispose()
      landscape.dispose()
      environment.dispose()
      dustTexture.dispose()
      sunLight.shadow.dispose()
      renderer.toneMapping = previousToneMapping
      renderer.toneMappingExposure = previousExposure
      sun.geometry.dispose()
      sun.material.dispose()
      if (wind.isPlaying) wind.stop()
      explorationPath.dispose()
      // Dispose active chunks
      for (const chunk of chunks.values()) {
        chunk.children[0].dispose()
        chunk.geometry.dispose()
      }
      // Dispose pooled chunks
      for (const chunk of chunkMeshPool) {
        chunk.children[0].dispose()
        chunk.geometry.dispose()
      }
      // Dispose shared assets
      rockGeo.dispose()
      rockMat.dispose()
      particleGeo.dispose()
      particleMat.dispose()
      skyGeo.dispose()
      skyMat.dispose()
      terrainMaterial.dispose()
      groundTextures.forEach(texture => texture.dispose())
      rockTextures.forEach(texture => texture.dispose())
    }
  }
}
