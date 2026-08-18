import * as THREE from 'three'
import { PlanetClasses } from '../planets/registry.js'
import { createNebula } from '../utils/Nebula.js'
import { computeElements, computePosition, computeD, computePlanetQuaternion } from '../utils/Astronomy.js'
import { createEllipticalOrbit } from '../utils/EllipticalOrbit'
import { createStarfield } from '../utils/Starfield';
import { createZodiacRing } from '../utils/ZodiacRing.js';
import { AspectLinesManager } from '../utils/AspectLines.js';
import { AuraManager } from '../utils/AuraManager.js';
import { getHolographicLineColor } from '../utils/HolographicMaterial';
import {
  LOW_RES_PLANET_MAPS,
  HIGH_RES_PLANET_MAPS,
  configureColorTexture
} from './planetTextures.js'
import { createPlanetDetailController } from './planetDetail.js'
import { createPlanetTextureController } from './planetTextureController.js'

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

const textureLoader = new THREE.TextureLoader()

const loadTexture = (path, renderer) =>
  new Promise((resolve, reject) => {
    textureLoader.load(
      path,
      texture => resolve(configureColorTexture(texture, renderer)),
      undefined,
      reject
    )
  })

export async function createSolarSystem(scene, renderer, zodiacNames = [], onProgress = () => {}) {
  // Performance Optimization: Track orbits and resolution-dependent objects in dedicated arrays
  // to avoid expensive O(N) scene traversals during resizing or mode toggling.
  const orbits = [];
  const resDependent = [];

  // 1. Initial Load: Load all low-res textures
  const keys = Object.keys(LOW_RES_PLANET_MAPS);
  const totalSteps = keys.length;
  let loadedSteps = 0;

  const lowResTextures = {};

  const loadLowRes = async (key) => {
    try {
      const tex = await loadTexture(LOW_RES_PLANET_MAPS[key], renderer);
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
      configureColorTexture(fallback, renderer);
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
      const elements = computeElements(name, 0, null, orbitScale);
      const orbit = createEllipticalOrbit(elements, 512, 0xd4aaff, 0.92);
      orbit.userData.isOrbit = true;
      orbits.push(orbit);
      if (orbit.material && orbit.material.resolution) {
        resDependent.push(orbit);
      }
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
  planetInstances.saturn.addRings(textureLoader, renderer).catch(console.error);

  // Moon
  const moonInstance = new PlanetClasses.moon(sizes.earth * sizeScale * 0.27, scene);
  const moon = moonInstance.create(lowResTextures.moon);
  moon.userData.isMoon = true;
  planetInstances.moon = moonInstance;
  planetObjects.moon = moon;

  const currentD = computeD(new Date());
  const moonEl = computeElements('moon', currentD, null, MOON_ORBIT_RADIUS);
  const moonOrbit = createEllipticalOrbit(moonEl, 128, 0x888888, 0.5);
  moonOrbit.userData.isOrbit = true;
  orbits.push(moonOrbit);
  if (moonOrbit.material && moonOrbit.material.resolution) {
    resDependent.push(moonOrbit);
  }
  scene.add(moonOrbit);

  const planets = Object.values(planetObjects);
  const detailController = createPlanetDetailController(planetObjects);

  // Initial positions & orientations
  const startD = computeD(new Date());
  const planetNamesKeys = Object.keys(planetObjects);
  for (let i = 0; i < planetNamesKeys.length; i++) {
    const name = planetNamesKeys[i];
    // Moon position is handled geocentrically in timeController's update loop,
    // and Sun stays at the origin. Skip initial placement for them here.
    if (name === 'sun' || name === 'moon') {
      planetObjects[name].setRotationFromQuaternion(computePlanetQuaternion(name, startD));
      continue;
    }

    const el = computeElements(name, startD, null, orbitScale);
    const pos = computePosition(el);
    planetObjects[name].position.set(pos.x, pos.y, pos.z);
    planetObjects[name].setRotationFromQuaternion(computePlanetQuaternion(name, startD));
  }

  // Environment
  const starPoints = createStarfield(scene)

  const nebula = createNebula(new THREE.Vector3(0, 0, -1500))
  nebula.userData.isNebula = true
  scene.add(nebula)
  scene.add(new THREE.AmbientLight(0x404040, 0.6))

  const zodiacRing = createZodiacRing(ZODIAC_RADIUS, zodiacNames);
  zodiacRing.visible = false;
  // Collect resolution-dependent children from the ring (Line2, LineSegments2, etc)
  if (zodiacRing.children) {
    for (let i = 0; i < zodiacRing.children.length; i++) {
      const child = zodiacRing.children[i];
      if (child.material && child.material.resolution) {
        resDependent.push(child);
      }
    }
  }
  scene.add(zodiacRing);

  const aspectsManager = new AspectLinesManager(scene, planetObjects);
  const auraManager = new AuraManager(scene, planetObjects);

  const textureController = createPlanetTextureController({
    maps: HIGH_RES_PLANET_MAPS,
    loadTexture: path => loadTexture(path, renderer),
    planetInstances,
    detailController,
    onLoaded: (planetName, key) => {
      console.log(`Detail texture prepared for ${planetName} (${key})`);
    },
    onError: (planetName, key, error) => {
      console.warn(`Failed to load detail texture for ${planetName} (${key})`, error);
    }
  });

  return {
    scene,
    planets,
    planetObjects,
    sun: planetObjects.sun,
    moon,
    moonOrbit,
    MOON_ORBIT_RADIUS,
    orbitScale,
    orbits,
    resDependent,
    zodiacRing,
    aspectsManager,
    auraManager,
    updateVisuals: (deltaSeconds) => {
      planetInstances.earth.updateVisuals?.(deltaSeconds);
      planetInstances.sun.updateVisuals?.(deltaSeconds);
    },
    preloadHQ: name => textureController.preload(name),
    applyPreparedHQ: name => textureController.apply(name),
    prioritizeHQ: name => textureController.prioritize(name),
    setHolographic: (enabled) => {
      // 1. Toggle Planets
      const instances = Object.values(planetInstances);
      for (let i = 0; i < instances.length; i++) {
        const instance = instances[i];
        if (instance.setHolographic) instance.setHolographic(enabled);
      }

      // 2. Toggle Orbits
      // Optimized: Iterate over pre-collected orbits array instead of full scene traversal.
      for (let i = 0; i < orbits.length; i++) {
        const obj = orbits[i];
        if (obj.material) {
          if (enabled) {
            if (!obj.userData.originalColor) {
              obj.userData.originalColor = obj.material.color.clone();
            }
            obj.material.color.set(getHolographicLineColor());
          } else if (obj.userData.originalColor) {
            obj.material.color.copy(obj.userData.originalColor);
          }
        }
      }

      // 3. Environment Adjustments
      // Removed: Keep natural environment visible in holographic mode for better contrast

      // 4. Update Grid visibility if active
      // (This will be handled by the UI toggle in SolarSystem.vue if needed)
    }
  };
}
