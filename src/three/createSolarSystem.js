import * as THREE from 'three'
import { createUnifiedPlanet } from '../utils/Planet.js'
import { createNebula } from '../utils/Nebula.js'
import { computeElements, computePosition, getRotationSpeed, computeD } from '../utils/Astronomy.js'
import { createEllipticalOrbit } from '../utils/EllipticalOrbit.js'
import { createZodiacRing } from '../utils/ZodiacRing.js';
import { AspectLinesManager } from '../utils/AspectLines.js';
import { AuraManager } from '../utils/AuraManager.js';

const orbitScale = 260
const sizeScale = 1.2
const SUN_RADIUS = 70
const MOON_ORBIT_RADIUS = 14;
const ZODIAC_RADIUS = orbitScale * 35;

const sizes = {
  sun: SUN_RADIUS,
  mercury: 1.19,
  venus: 2.94,
  earth: 3.1,
  mars: 1.65,
  jupiter: 34.75,
  saturn: 29.30,
  uranus: 12.43,
  neptune: 12.03
}

const lowResMaps = {
  sun: '/sun.jpg',
  mercury: '/mercury.jpg',
  venus: '/venus.jpg',
  earth_day: '/2k_earth_daymap.jpg',
  earth_night: '/2k_earth_nightmap.jpg',
  mars: '/mars.jpg',
  jupiter: '/jupiter.jpg',
  saturn: '/saturn.jpg',
  uranus: '/uranus.jpg',
  neptune: '/neptune.jpg',
  moon: '/mercury.jpg' // Placeholder for moon
}

const highResMaps = {
  sun: '/hq/8k_sun.jpg',
  mercury: '/hq/8k_mercury.jpg',
  venus: '/hq/8k_venus.jpg',
  earth_day: '/hq/8k_earth_daymap.jpg',
  earth_night: '/hq/8k_earth_nightmap.jpg',
  mars: '/hq/8k_mars.jpg',
  jupiter: '/hq/8k_jupiter.jpg',
  saturn: '/hq/8k_saturn.jpg',
  uranus: '/hq/2k_uranus.jpg',
  neptune: '/hq/2k_neptune.jpg',
  moon: '/hq/8k_moon.jpg'
}

const textureLoader = new THREE.TextureLoader()

const loadTexture = (path) =>
  new Promise((resolve, reject) => {
    textureLoader.load(path, resolve, undefined, reject)
  })

async function createSaturnRing(saturn) {
  const baseRadius = sizes.saturn * sizeScale;
  const innerRadius = baseRadius * 1.11;
  const outerRadius = baseRadius * 2.33;

  const ringAlpha = await loadTexture('/hq/8k_saturn_ring_alpha.png');

  const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 128);
  const pos = ringGeo.attributes.position;
  const uv = ringGeo.attributes.uv;
  const v3 = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    const r = v3.length();
    const v = (r - innerRadius) / (outerRadius - innerRadius);
    uv.setXY(i, v, 0);
  }

  const ringMat = new THREE.MeshStandardMaterial({
    map: ringAlpha,
    alphaMap: ringAlpha,
    transparent: true,
    side: THREE.DoubleSide,
    emissive: 0xffffff,
    emissiveIntensity: 0.15,
    roughness: 0.3,
    metalness: 0.0,
  });

  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  saturn.add(ringMesh);
}

export async function createSolarSystem(scene, zodiacNames = [], onProgress = () => {}) {
  // 1. Initial Load: Load all low-res textures
  const totalSteps = Object.keys(lowResMaps).length;
  let loadedSteps = 0;

  const loadLowRes = async (key) => {
    const tex = await loadTexture(lowResMaps[key]);
    loadedSteps++;
    onProgress((loadedSteps / totalSteps) * 100);
    return tex;
  }

  // Sequential loading of initial textures to avoid CPU/Network spikes on weaker devices
  const lowResTextures = {};
  const keys = Object.keys(lowResMaps);
  for (const key of keys) {
    lowResTextures[key] = await loadLowRes(key);
    // Tiny delay between each load to yield main thread
    await new Promise(r => setTimeout(r, 20));
  }

  const {
    sun: sunTex, mercury: mercuryTex, venus: venusTex,
    earth_day: earthDayTex, earth_night: earthNightTex, mars: marsTex,
    jupiter: jupiterTex, saturn: saturnTex, uranus: uranusTex, neptune: neptuneTex, moon: moonTex
  } = lowResTextures;

  // Sun
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(sizes.sun, 48, 48), // Reduced detail
    new THREE.MeshBasicMaterial({ map: sunTex })
  )
  sun.userData.name = 'sun'
  sun.name = 'sun'
  sun.userData.isSun = true
  sun.rotation.x = Math.PI / 2;
  const SUN_ROTATION_HOURS = 25.38 * 24
  sun.userData.rotationSpeed = (2 * Math.PI) / (SUN_ROTATION_HOURS * 3600)
  scene.add(sun)

  // Planet factory
  const createPlanet = (size, tex, name, isEarth = false, extraTex = null) => {
    const planet = createUnifiedPlanet(size, tex, scene, isEarth, extraTex)
    planet.userData.name = name
    planet.userData.isPlanet = true
    planet.rotation.x = Math.PI / 2;

    if (isEarth) {
      planet.rotation.x -= (23.5 * Math.PI / 180);
    }
    if (name === 'saturn') {
      planet.rotation.x -= (26.73 * Math.PI / 180);
    }

    const elements = computeElements(name, 0)
    const orbit = createEllipticalOrbit(elements, orbitScale, 512, 0xd4aaff, 0.92)
    orbit.userData.isOrbit = true
    scene.add(orbit)

    return planet
  }

  // Planets
  const mercury = createPlanet(sizes.mercury * sizeScale, mercuryTex, 'mercury')
  const venus = createPlanet(sizes.venus * sizeScale, venusTex, 'venus')
  const earth = createPlanet(sizes.earth * sizeScale, earthDayTex, 'earth', true, earthNightTex)
  const mars = createPlanet(sizes.mars * sizeScale, marsTex, 'mars')
  const jupiter = createPlanet(sizes.jupiter * sizeScale, jupiterTex, 'jupiter')
  const saturn = createPlanet(sizes.saturn * sizeScale, saturnTex, 'saturn')
  const uranus = createPlanet(sizes.uranus * sizeScale, uranusTex, 'uranus')
  const neptune = createPlanet(sizes.neptune * sizeScale, neptuneTex, 'neptune')

  // Load Saturn rings asynchronously to avoid blocking initial scene visibility
  createSaturnRing(saturn).catch(err => console.error("Failed to load Saturn rings:", err));

  const planets = [sun, mercury, venus, earth, mars, jupiter, saturn, uranus, neptune]
  const planetObjects = { sun, mercury, venus, earth, mars, jupiter, saturn, uranus, neptune }

  Object.entries(planetObjects).forEach(([name, mesh]) => {
    mesh.userData.rotationSpeed = getRotationSpeed(name)
    // Pre-compute bounding sphere for faster raycasting interaction
    if (mesh.geometry) {
      mesh.geometry.computeBoundingSphere();
    }
  })

  // Initial positions
  Object.keys(planetObjects).forEach(name => {
    if (name === 'sun') return;
    const el = computeElements(name, computeD(new Date()))
    const pos = computePosition(el, orbitScale)
    planetObjects[name].position.set(pos.x, pos.y, pos.z)
  })

  // Environment
  const starGeo = new THREE.BufferGeometry()
  const vertices = []
  for (let i = 0; i < 15000; i++) {
    vertices.push((Math.random() - 0.5) * 200000, (Math.random() - 0.5) * 200000, (Math.random() - 0.5) * 200000)
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  const starPoints = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2 }))
  starPoints.userData.isStarfield = true
  scene.add(starPoints)

  const nebula = createNebula(new THREE.Vector3(0, 0, -1500))
  nebula.userData.isNebula = true
  scene.add(nebula)
  scene.add(new THREE.AmbientLight(0x404040, 0.6))

  const zodiacRing = createZodiacRing(ZODIAC_RADIUS, zodiacNames);
  zodiacRing.visible = false;
  scene.add(zodiacRing);

  // Moon
  const moon = createUnifiedPlanet(sizes.earth * sizeScale * 0.27, moonTex, scene);
  moon.userData.name = 'moon';
  moon.userData.isMoon = true;
  moon.rotation.x = Math.PI / 2;

  const currentD = computeD(new Date());
  const moonEl = computeElements('moon', currentD);
  const visualMoonEl = { ...moonEl, a: 1 };
  const moonOrbit = createEllipticalOrbit(visualMoonEl, MOON_ORBIT_RADIUS, 128, 0x888888, 0.5);
  moonOrbit.userData.isOrbit = true;
  scene.add(moonOrbit);

  const aspectsManager = new AspectLinesManager(scene, planetObjects);
  const auraManager = new AuraManager(scene, planetObjects);

  // Track HQ texture status to avoid redundant loads
  const hqStatus = {}; // { [key]: 'loading' | 'loaded' }

  // --- Background HQ Loading ---
  const loadHQ = async (planetName, key, isEarth = false) => {
    if (hqStatus[key]) return;
    hqStatus[key] = 'loading';

    try {
      const hqTex = await loadTexture(highResMaps[key]);
      const mesh = planetName === 'moon' ? moon : planetObjects[planetName];
      if (mesh) {
        if (mesh.material.uniforms) {
          // ShaderMaterial (Planets)
          if (key.includes('night')) {
             const oldTex = mesh.material.uniforms.nightTexture.value;
             mesh.material.uniforms.nightTexture.value = hqTex;
             if (oldTex && oldTex !== hqTex) oldTex.dispose();
          } else {
             const oldTex = mesh.material.uniforms.dayTexture.value;
             mesh.material.uniforms.dayTexture.value = hqTex;
             if (oldTex && oldTex !== hqTex) oldTex.dispose();
          }
        } else {
          // MeshBasicMaterial (Sun)
          const oldTex = mesh.material.map;
          mesh.material.map = hqTex;
          mesh.material.needsUpdate = true;
          if (oldTex && oldTex !== hqTex) oldTex.dispose();
        }
        hqStatus[key] = 'loaded';
        console.log(`🚀 HQ Texture loaded for ${planetName} (${key})`);
      }
    } catch (e) {
      delete hqStatus[key]; // Allow retry on failure
      console.warn(`Failed to load HQ texture for ${planetName}`, e);
    }
  }

  // Sequentially load HQ textures in background.
  // We only load the most critical ones (Sun, Earth) automatically to save performance.
  const startBackgroundLoading = async () => {
    // Initial delay to let the app settle
    await new Promise(r => setTimeout(r, 2000));

    // Priority 1: Sun and Earth (the most visible bodies)
    // We load them one by one instead of Promise.all to reduce peak CPU/GPU spikes
    await loadHQ('sun', 'sun');
    await new Promise(r => setTimeout(r, 1500));
    await loadHQ('earth', 'earth_day');
    await new Promise(r => setTimeout(r, 1000));
    await loadHQ('earth', 'earth_night');

    // For other planets, we load them much more slowly in the background
    // to avoid impacting interaction performance.
    await new Promise(r => setTimeout(r, 8000));
    const others = ['mars', 'jupiter', 'saturn', 'venus', 'mercury', 'moon', 'uranus', 'neptune'];
    for (const p of others) {
      // If user hasn't already triggered HQ for this planet via interaction
      if (!hqStatus[p]) {
        await loadHQ(p, p);
        await new Promise(r => setTimeout(r, 3000)); // Large gap between each planet
      }
    }
  }

  // Start background loading after a short delay
  // DEACTIVATED: User prefers not to load HQ textures automatically at startup to avoid lag.
  // HQ textures will be loaded on-demand via prioritizeHQ() when a planet is selected or focused.
  // setTimeout(startBackgroundLoading, 500);

  return {
    scene,
    planets: [...planets, moon],
    planetObjects,
    sun,
    moon,
    moonOrbit,
    MOON_ORBIT_RADIUS,
    orbitScale,
    zodiacRing,
    aspectsManager,
    auraManager,
    // Provide a method to prioritize a planet's HQ load
    prioritizeHQ: (name) => {
       if (name === 'earth') {
         loadHQ('earth', 'earth_day');
         loadHQ('earth', 'earth_night');
       } else if (highResMaps[name]) {
         loadHQ(name, name);
       }
    }
  };
}
