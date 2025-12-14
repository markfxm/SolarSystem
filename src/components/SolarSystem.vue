<template>
  <div ref="container" style="width:100vw; height:100vh; background:#000; position:relative; overflow:hidden;">
    <!-- NEW: Speed control panel -->
    <div style="position:absolute; top:20%; left:20px; z-index:100; display:flex; flex-direction:column; gap:12px;">
          <button @click="setRealTime"
              :style="speedMode === 'real' 
                      ? 'background:#1e88e5; transform:scale(1.02);' 
                      : 'background:#222; color:#aaa;'"
              style="padding:9px 16px; font-size:15px; font-weight:600; color:#fff; 
                    border:none; border-radius:8px; cursor:pointer; 
                    min-width:110px; box-shadow:0 3px 10px rgba(0,0,0,0.5);
                    transition:all 0.2s;">
            Real Time
          </button>

          <button @click="setFastSpeed"
              :style="speedMode === 'fast' 
                      ? 'background:#ff6f00; transform:scale(1.02);' 
                      : 'background:#222; color:#aaa;'"
              style="padding:9px 16px; font-size:15px; font-weight:600; color:#fff; 
                    border:none; border-radius:8px; cursor:pointer; 
                    min-width:110px; box-shadow:0 3px 10px rgba(0,0,0,0.5);
                    transition:all 0.2s;">
            ×500000 Speed
          </button>

          <button @click="goHome"
              style="padding:9px 16px; font-size:15px; font-weight:600; color:#fff; 
                    background:#666; border:none; border-radius:8px; cursor:pointer; 
                    min-width:110px; box-shadow:0 3px 10px rgba(0,0,0,0.5);
                    transition:all 0.2s;"
              onmouseover="this.style.background='#888'"
              onmouseout="this.style.background='#666'">
            Home
          </button>
    </div>

    <div style="position:absolute; top:10px; left:10px; color:#fff; background:rgba(0,0,0,0.7); padding:10px 16px; border-radius:8px; font:18px Arial; z-index:10;">
      {{ currentTime }}
    </div>
    
    <div v-if="hoveredPlanetName" style="position:absolute; top:20px; left:50%; transform:translateX(-50%); color:#fff; background:rgba(0,0,0,0.8); padding:12px 24px; border-radius:12px; font:28px Arial; font-weight:bold; z-index:10; pointer-events:none;">
      {{ hoveredPlanetName }}
    </div>

    <!-- NEW: Planet Navigation Panel on the right -->
    <PlanetNavigationPanel
      :selected-body="selectedPlanet?.userData.name || null"
      @select="flyToPlanet"
    />
    
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, shallowRef, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createUnifiedPlanet } from '../utils/Planet.js'
import { createNebula } from '../utils/Nebula.js'
import { computeD, computeElements, computePosition, getRotationSpeed } from '../utils/Astronomy.js'
import { createEllipticalOrbit } from '../utils/EllipticalOrbit.js'
import PlanetNavigationPanel from './PlanetNavigationPanel.vue'

const container = shallowRef(null)
const currentTime = ref(new Date().toLocaleString())
const hoveredPlanetName = ref('')


// NEW: speed control

const speedMode = ref('real')          // 'real' or 'fast'
const speedMultiplier = ref(1)          // 1 = real time, 500000 = fast
let baseD = 0                           // reference Julian day value

// Switch to real-time speed and snap planets to the exact current positions
const setRealTime = () => {
  speedMode.value = 'real'
  speedMultiplier.value = 1
  baseD = computeD(new Date())          // reset time base to now
  updatePlanetPositions(baseD)          // instantly place planets correctly
}

// Switch to ×500000 speed (continues from current positions at the moment of click)
const setFastSpeed = () => {
  speedMode.value = 'fast'
  speedMultiplier.value = 500000
}

// Add this function with your other functions (near setRealTime / setFastSpeed)
const goHome = () => {
  if (selectedPlanet) {
    selectedPlanet.scale.set(1, 1, 1)  // reset zoom effect on previous planet
    selectedPlanet = null
  }
  isTracking = false
  trackingBody = null
  trackingLastPosition = null
  if (trackingPrevControls) {
    controls.enablePan = trackingPrevControls.enablePan
    trackingPrevControls = null
  }
  controls.minDistance = defaultMinDistance
  controls.maxDistance = defaultMaxDistance
  startFlyTo(new THREE.Vector3(0, 300, 1200), new THREE.Vector3(0, 0, 0))
}

const startFlyTo = (cameraPos, lookAtPos, body = null) => {
  flyFromCameraPosition = camera.position.clone()
  flyFromLookAt = controls.target.clone()
  targetCameraPosition = cameraPos
  targetLookAt = lookAtPos
  isFlying = true
  flyTargetBody = body
  flyTargetCameraOffset = body ? cameraPos.clone().sub(body.position) : null
  flyPrevControls = {
    enableRotate: controls.enableRotate,
    enablePan: controls.enablePan,
    enableZoom: controls.enableZoom,
    enableDamping: controls.enableDamping,
  }
  controls.enableRotate = false
  controls.enablePan = false
  controls.enableZoom = false
  controls.enableDamping = false
  flyStartMs = performance.now()
  const dist = flyFromCameraPosition.distanceTo(targetCameraPosition)
  flyDurationMs = Math.min(4500, Math.max(1200, dist * 3))
}

const getFlyToPositions = (body) => {
  const minDistanceFactor = 0.5
  const radius = body?.geometry?.parameters?.radius || 10
  const minDistance = Math.max(0.5, radius * minDistanceFactor)
  const distance = Math.max(radius * 5, minDistance + radius * 2)
  const height = Math.max(radius * 0.7, radius * 2)
  return {
    cameraPos: body.position.clone().add(new THREE.Vector3(0, height, distance)),
    lookAtPos: body.position.clone(),
    minDistance
  }
}

// Helper – move every planet to the position it should have at Julian day d
const updatePlanetPositions = (d) => {
  Object.keys(planetObjects).forEach(name => {
    const el = computeElements(name, d)
    const pos = computePosition(el, orbitScale)
    planetObjects[name].position.set(pos.x, pos.y, pos.z)
  })
}

let scene, camera, renderer, controls, clock, sun
let mercury, venus, earth, mars, jupiter, saturn, uranus, neptune
let raycaster, mouse = new THREE.Vector2()
let planets = []
let targetCameraPosition = null, targetLookAt = null, selectedPlanet = null
let isFlying = false
let flyFromCameraPosition = null
let flyFromLookAt = null
let flyStartMs = 0
let flyDurationMs = 1200
let flyPrevControls = null
let flyTargetBody = null
let flyTargetCameraOffset = null
let defaultMinDistance = 50
let defaultMaxDistance = 10000
let isTracking = false
let trackingBody = null
let trackingLastPosition = null
let trackingPrevControls = null
let initialD = 0
const planetObjects = {}
const planetNames = {
  mercury: 'Mercury', venus: 'Venus', earth: 'Earth', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', sun: 'Sun'
}
// 1. ADD THESE CONSTANTS 
const orbitScale = 45   // controls orbit radius
const sizeScale  = 0.6     // controls planet sizes

const SUN_RADIUS = 10                // Beautiful & doesn’t eat planets

const sizes = {
  sun:     SUN_RADIUS,   // 10
  mercury: 1.8,
  venus:   3.0,
  earth:   3.1,
  mars:    1.8,
  jupiter: 16,
  saturn:  14,
  uranus:  6,
  neptune: 6
}

setInterval(() => currentTime.value = new Date().toLocaleString(), 1000)

const loadTexture = (path) => new Promise(r => new THREE.TextureLoader().load(path, r))

let sunDirection = new THREE.Vector3()
const updateSunPosition = () => {
  const now = new Date()
  const doy = (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(now.getUTCFullYear(), 0, 0)) / 86400000
  const declination = 23.45 * Math.sin(2 * Math.PI * (doy - 81) / 365)
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60
  const longitude = (hours - 12) * 15
  const phi = (90 - declination) * Math.PI / 180
  const theta = longitude * Math.PI / 180
  sunDirection.set(-Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).normalize()
}

onMounted(async () => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000011)

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 20000)
  camera.position.set(0, 300, 1200)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  container.value.appendChild(renderer.domElement)

  // Smooth controls — never gets stuck!
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.rotateSpeed = 0.6
  controls.minDistance = 50
  controls.maxDistance = 10000
  defaultMinDistance = controls.minDistance
  defaultMaxDistance = controls.maxDistance

  const [
    dayTexture, nightTexture, sunTexture,
    mercuryTex, venusTex, marsTex, jupiterTex, saturnTex, uranusTex, neptuneTex
  ] = await Promise.all([
    loadTexture('/earth_day.jpg'), loadTexture('/earth_night.jpg'), loadTexture('/sun.jpg'),
    loadTexture('/mercury.jpg'), loadTexture('/venus.jpg'), loadTexture('/mars.jpg'),
    loadTexture('/jupiter.jpg'), loadTexture('/saturn.jpg'),
    loadTexture('/uranus.jpg'), loadTexture('/neptune.jpg')
  ])

  // Sun
  sun = new THREE.Mesh(
    new THREE.SphereGeometry(sizes.sun, 64, 64),
    new THREE.MeshBasicMaterial({ map: sunTexture })
  )
  sun.userData.name = 'sun'
  scene.add(sun)

  // Glowing selection ring — always faces camera
  // BRIGHT & SHARP planet halo — instantly visible everywhere
  const createPlanetHalo = (radius, color = 0xaaddff) => {
    const geometry = new THREE.RingGeometry(radius * 1.5, radius * 1.75, 64)

    const material = new THREE.MeshBasicMaterial({
      color: color,           // brighter base color
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.9,        // much more visible
      depthWrite: false
    })

    const ring = new THREE.Mesh(geometry, material)

    // Make it a perfect billboard — always faces camera perfectly (very important!)
    ring.rotation.x = -Math.PI / 2
    ring.onBeforeRender = function (renderer, scene, camera) {
      ring.quaternion.copy(camera.quaternion)
    }

    // Optional: make it pulse softly for extra pop (uncomment if you like it)
    // ring.userData.pulse = 0
    // ring.onBeforeRender = function () {
    //   ring.userData.pulse += 0.03
    //   ring.material.opacity = 0.8 + Math.sin(ring.userData.pulse) * 0.2
    //   ring.quaternion.copy(camera.quaternion)
    // }

    return ring
  }

  // Create planet + PURPLE orbit
  // Create planets using unified function + purple orbits
  const createWithOrbit = (size, tex, name, isEarth = false) => {
    // 1. Create the planet (using your unified function)
    const planet = createUnifiedPlanet(size, tex, scene, isEarth)
    planet.userData.name = name

    // ADD HALO TO ALL PLANETS EXCEPT SUN
    if (name !== 'sun') {
      const halo = createPlanetHalo(size, 0x88ccff)   // soft cyan glow
      planet.add(halo)                                // attached to planet → follows perfectly
    }

    // 2. Get real orbital elements (at any time — shape doesn't change)
    const elements = computeElements(name, 0)   // d=0 is fine for orbit shape

    // 3. Create real elliptical orbit (matches planet path exactly)

    const orbit = createEllipticalOrbit(
      elements, 
      orbitScale,       // scale to make it fit our scene
      512,              // smooth curve
      0xd4aaff,         // beautiful bright lavender-purple
      0.92              // very visible
    );
    scene.add(orbit)

    return planet
  }

  // Instantiate planets
  mercury = createWithOrbit(sizes.mercury * sizeScale, mercuryTex, 'mercury')
  venus   = createWithOrbit(sizes.venus * sizeScale,   venusTex,   'venus')
  earth   = createWithOrbit(sizes.earth * sizeScale,   dayTexture, 'earth', true)   // true = atmosphere
  mars    = createWithOrbit(sizes.mars * sizeScale,    marsTex,    'mars')
  jupiter = createWithOrbit(sizes.jupiter * sizeScale, jupiterTex, 'jupiter')
  saturn  = createWithOrbit(sizes.saturn * sizeScale,  saturnTex,  'saturn')
  uranus  = createWithOrbit(sizes.uranus * sizeScale,  uranusTex,  'uranus')
  neptune = createWithOrbit(sizes.neptune * sizeScale, neptuneTex, 'neptune')

  planets = [sun, mercury, venus, earth, mars, jupiter, saturn, uranus, neptune]

  // Astronomy setup
  initialD = computeD(new Date())
  const map = { mercury, venus, earth, mars, jupiter, saturn, uranus, neptune }
  Object.entries(map).forEach(([name, mesh]) => {
    mesh.userData.rotationSpeed = getRotationSpeed(name)
    planetObjects[name] = mesh
  })

    // Initial positions
  Object.keys(planetObjects).forEach(name => {
    const el = computeElements(name, computeD(new Date()))
    const pos = computePosition(el, orbitScale)
    planetObjects[name].position.set(pos.x, pos.y, pos.z)
  })

  console.log('Venus distance:', venus.position.length())
  console.log('Earth distance:', earth.position.length())

  // Stars
  const starGeo = new THREE.BufferGeometry()
  const vertices = []
  for (let i = 0; i < 800; i++) {
    vertices.push(
      (Math.random() - 0.5) * 8000, 
      (Math.random() - 0.5) * 8000, 
      (Math.random() - 0.5) * 8000
    )
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2 })))

  scene.add(createNebula(new THREE.Vector3(0, 0, -1500)))

  scene.add(new THREE.AmbientLight(0x404040, 0.6))

  clock = new THREE.Clock()
  raycaster = new THREE.Raycaster()

  // Hover name
  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObjects(planets)
    hoveredPlanetName.value = hits.length > 0 ? planetNames[hits[0].object.userData.name] || '' : ''
  })

  // Click to fly — SMOOTH arrival!
  window.addEventListener('click', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObjects(planets)

    if (hits.length > 0) {
      const p = hits[0].object
      if (selectedPlanet && selectedPlanet !== p) selectedPlanet.scale.set(1,1,1)
      selectedPlanet = p
      
      const { cameraPos, lookAtPos, minDistance } = getFlyToPositions(p)
      controls.minDistance = minDistance
      controls.maxDistance = defaultMaxDistance
      isTracking = true
      trackingBody = p
      trackingLastPosition = null
      if (!trackingPrevControls) {
        trackingPrevControls = { enablePan: controls.enablePan }
      }
      controls.enablePan = false

      startFlyTo(cameraPos, lookAtPos, p)
    } 
  })

  updateSunPosition()

  const animate = () => {
    requestAnimationFrame(animate)
    const delta = clock.getDelta() // seconds since last frame

    // ────── TIME CALCULATION (JavaScript) ──────
    let d
    if (speedMode.value === 'real') {
      // normal real-time progression
      d = computeD(new Date())
    } else {
      // fast mode – advance time artificially
      if (baseD === 0) baseD = computeD(new Date())   // safety for first frame
      // CORRECT: delta (seconds) × multiplier ÷ seconds-per-day
      baseD += delta * speedMultiplier.value / 86400
      d = baseD
    }
  
    // Real positions
    Object.keys(planetObjects).forEach(name => {
      const mesh = planetObjects[name]
      const el = computeElements(name, d)
      const pos = computePosition(el, orbitScale)
      mesh.position.set(pos.x, pos.y, pos.z)

      // rotation of the planet itself (unchanged)
      mesh.rotation.y += mesh.userData.rotationSpeed * delta
    })
    

    updateSunPosition()
    planets.forEach(p => {
      if (p.material.uniforms?.sunDirection) {
        p.material.uniforms.sunDirection.value.copy(sunDirection);
      }
    });

    // SUPER SMOOTH fly-in (no sudden stop!)
    if (isFlying && targetCameraPosition && flyFromCameraPosition && flyFromLookAt) {
      if (flyTargetBody && flyTargetCameraOffset) {
        targetLookAt = flyTargetBody.position.clone()
        targetCameraPosition = flyTargetBody.position.clone().add(flyTargetCameraOffset)
      }
      const t = Math.min(1, (performance.now() - flyStartMs) / flyDurationMs)
      const eased = 1 - Math.pow(1 - t, 3)

      camera.position.lerpVectors(flyFromCameraPosition, targetCameraPosition, eased)

      if (targetLookAt) {
        const currentLookAt = new THREE.Vector3().lerpVectors(flyFromLookAt, targetLookAt, eased)
        controls.target.copy(currentLookAt)
        controls.update()

        if (t >= 1) {
          camera.position.copy(targetCameraPosition)
          controls.target.copy(targetLookAt)
          if (flyPrevControls) {
            controls.enableRotate = flyPrevControls.enableRotate
            controls.enablePan = flyPrevControls.enablePan
            controls.enableZoom = flyPrevControls.enableZoom
            controls.enableDamping = flyPrevControls.enableDamping
            flyPrevControls = null
          }
          controls.update()
          isFlying = false
          flyFromCameraPosition = null
          flyFromLookAt = null
          flyTargetBody = null
          flyTargetCameraOffset = null
          trackingLastPosition = null
        }
      }
    } else {
      if (isTracking && trackingBody) {
        if (!trackingLastPosition) {
          trackingLastPosition = trackingBody.position.clone()
        }
        const deltaMove = trackingBody.position.clone().sub(trackingLastPosition)
        camera.position.add(deltaMove)
        controls.target.copy(trackingBody.position)
        trackingLastPosition.copy(trackingBody.position)
      }
      controls.update()
    }

    renderer.render(scene, camera)
  }
  animate()

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('click', onClick)
  window.removeEventListener('resize', onResize)
  renderer?.dispose()
})

const flyToPlanet = (planetName) => {
  const target = planets.find(p => p.userData.name === planetName)
  if (!target) return

  // Deselect previous
  if (selectedPlanet && selectedPlanet !== target) {
    selectedPlanet.scale.set(1, 1, 1)
  }

  selectedPlanet = target

  const { cameraPos, lookAtPos, minDistance } = getFlyToPositions(target)
  controls.minDistance = minDistance
  controls.maxDistance = defaultMaxDistance
  isTracking = true
  trackingBody = target
  trackingLastPosition = null
  if (!trackingPrevControls) {
    trackingPrevControls = { enablePan: controls.enablePan }
  }
  controls.enablePan = false
  startFlyTo(cameraPos, lookAtPos, target)
}
</script>