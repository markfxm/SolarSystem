import * as THREE from 'three'
import { PlanetClasses } from '../planets/registry.js'
import { createNebula } from '../utils/Nebula.js'
import { computeElements, computePosition, computeD, computePlanetQuaternion } from '../utils/Astronomy.js'
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
  moon: '/mercury.jpg'
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

export async function createSolarSystem(scene, zodiacNames = [], onProgress = () => {}) {
  // 1. Initial Load: Load all low-res textures
  const keys = Object.keys(lowResMaps);
  const totalSteps = keys.length;
  let loadedSteps = 0;

  const lowResTextures = {};

  const loadLowRes = async (key) => {
    try {
      const tex = await loadTexture(lowResMaps[key]);
      loadedSteps++;
      onProgress((loadedSteps / totalSteps) * 100);
      lowResTextures[key] = tex;
      return tex;
    } catch (e) {
      console.error(`Failed to load texture: ${key}`, e);
      // Fallback to a tiny procedural texture to prevent crashes
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 2;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#333';
      ctx.fillRect(0,0,2,2);
      const fallback = new THREE.CanvasTexture(canvas);
      lowResTextures[key] = fallback;
      return fallback;
    }
  }

  // Start loading everything in parallel
  const allLoadingPromises = keys.map(key => loadLowRes(key));

  // Wait for ALL textures to resolve before proceeding to render
  await Promise.all(allLoadingPromises);

  const planetInstances = {};
  const planetObjects = {};

  // Factory function to create planet via classes
  const initPlanet = (name, radius, ...createArgs) => {
    const PlanetClass = PlanetClasses[name];
    const instance = new PlanetClass(radius, scene);

    // If textures are missing (still loading), pass nulls - BasePlanet should handle or we update later
    const mesh = instance.create(...createArgs);
    planetInstances[name] = instance;
    planetObjects[name] = mesh;

    if (name !== 'sun' && name !== 'moon') {
      const elements = computeElements(name, 0);
      const orbit = createEllipticalOrbit(elements, orbitScale, 512, 0xd4aaff, 0.92);
      orbit.userData.isOrbit = true;
      scene.add(orbit);
    }
    return mesh;
  }

  // Instantiate all - use loaded textures if available, or wait for them if critical
  initPlanet('sun', sizes.sun, lowResTextures.sun);
  initPlanet('mercury', sizes.mercury * sizeScale, lowResTextures.mercury);
  initPlanet('venus', sizes.venus * sizeScale, lowResTextures.venus);
  initPlanet('earth', sizes.earth * sizeScale, lowResTextures.earth_day, lowResTextures.earth_night);
  initPlanet('mars', sizes.mars * sizeScale, lowResTextures.mars);
  initPlanet('jupiter', sizes.jupiter * sizeScale, lowResTextures.jupiter);
  initPlanet('saturn', sizes.saturn * sizeScale, lowResTextures.saturn);
  initPlanet('uranus', sizes.uranus * sizeScale, lowResTextures.uranus);
  initPlanet('neptune', sizes.neptune * sizeScale, lowResTextures.neptune);

  // Saturn Rings
  planetInstances.saturn.addRings(textureLoader).catch(console.error);

  // Moon
  const moonInstance = new PlanetClasses.moon(sizes.earth * sizeScale * 0.27, scene);
  const moon = moonInstance.create(lowResTextures.moon);
  moon.userData.isMoon = true;
  planetInstances.moon = moonInstance;
  planetObjects.moon = moon;

  const currentD = computeD(new Date());
  const moonEl = computeElements('moon', currentD);
  const visualMoonEl = { ...moonEl, a: 1 };
  const moonOrbit = createEllipticalOrbit(visualMoonEl, MOON_ORBIT_RADIUS, 128, 0x888888, 0.5);
  moonOrbit.userData.isOrbit = true;
  scene.add(moonOrbit);

  const planets = Object.values(planetObjects);

  planets.forEach(mesh => {
    if (mesh.geometry) mesh.geometry.computeBoundingSphere();
  });

  // Initial positions & orientations
  const startD = computeD(new Date());
  Object.keys(planetObjects).forEach(name => {
    const el = computeElements(name, startD)
    const pos = computePosition(el, orbitScale)
    if (name !== 'sun') {
      planetObjects[name].position.set(pos.x, pos.y, pos.z)
    }
    planetObjects[name].setRotationFromQuaternion(computePlanetQuaternion(name, startD));
  })

  // Environment
  const starGeo = new THREE.BufferGeometry()
  const starCount = 15000;
  const starVertices = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i++) {
    starVertices[i] = (Math.random() - 0.5) * 200000;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starVertices, 3))
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

  const aspectsManager = new AspectLinesManager(scene, planetObjects);
  const auraManager = new AuraManager(scene, planetObjects);

  const hqStatus = {};

  const loadHQ = async (planetName, key) => {
    if (hqStatus[key]) return;
    hqStatus[key] = 'loading';

    try {
      const hqTex = await loadTexture(highResMaps[key]);
      const instance = planetInstances[planetName];
      if (instance) {
        const isNight = key.includes('night');
        instance.updateHQ(hqTex, isNight);
        hqStatus[key] = 'loaded';
        console.log(`🚀 HQ Texture loaded for ${planetName} (${key})`);
      }
    } catch (e) {
      delete hqStatus[key];
      console.warn(`Failed to load HQ texture for ${planetName}`, e);
    }
  }

  return {
    scene,
    planets,
    planetObjects,
    sun: planetObjects.sun,
    moon,
    moonOrbit,
    MOON_ORBIT_RADIUS,
    orbitScale,
    zodiacRing,
    aspectsManager,
    auraManager,
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
