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
const MOON_ORBIT_RADIUS = 14; // Keep this constant as it was already defined
const ZODIAC_RADIUS = orbitScale * 35; // Define ZODIAC_RADIUS based on existing orbitScale

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

const loadTexture = (path) =>
  new Promise(resolve => new THREE.TextureLoader().load(path, resolve))

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

export async function createSolarSystem(scene, zodiacNames = []) {
  const [
    dayTexture, nightTexture, sunTexture,
    mercuryTex, venusTex, marsTex,
    jupiterTex, saturnTex, uranusTex, neptuneTex
  ] = await Promise.all([
    loadTexture('/hq/8k_earth_daymap.jpg'),
    loadTexture('/hq/8k_earth_nightmap.jpg'),
    loadTexture('/hq/8k_sun.jpg'),
    loadTexture('/hq/8k_mercury.jpg'),
    loadTexture('/hq/8k_venus.jpg'),
    loadTexture('/hq/8k_mars.jpg'),
    loadTexture('/hq/8k_jupiter.jpg'),
    loadTexture('/hq/8k_saturn.jpg'),
    loadTexture('/hq/2k_uranus.jpg'),
    loadTexture('/hq/2k_neptune.jpg')
  ])

  // Sun
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(sizes.sun, 64, 64),
    new THREE.MeshBasicMaterial({ map: sunTexture })
  )
  sun.userData.name = 'sun'
  sun.name = 'sun'
  sun.userData.isSun = true
  // Fix Sun Orientation: Align local Y (spin axis) with Orbit Normal (Z)
  sun.rotation.x = Math.PI / 2;

  // realistic solar rotation (approx. 25.38 days -> hours)
  // rotation speed in rad/s = 2π / (hours * 3600)
  const SUN_ROTATION_HOURS = 25.38 * 24 // ~25.38 days
  sun.userData.rotationSpeed = (2 * Math.PI) / (SUN_ROTATION_HOURS * 3600)

  scene.add(sun)

  // Planet factory
  const createPlanet = (size, tex, name, isEarth = false, extraTex = null) => {
    const planet = createUnifiedPlanet(size, tex, scene, isEarth, extraTex)
    planet.userData.name = name
    planet.userData.isPlanet = true

    // FIX ORINETATION:
    // Textures map (0,0) to left/center. SphereGeometry wraps it nicely.
    // By default Three.js spheres have poles on Y axis.
    // Our orbit is XY plane. We want North Pole to be +Z direction.
    // So we rotate +90 degrees around X.
    planet.rotation.x = Math.PI / 2;

    if (isEarth) {
      // Earth Axial Tilt: ~23.5 degrees
      // We are now +Z up. We want to tilt 23.5 degrees away.
      // Subtracting rotates "back" towards +Y (assuming X axis is Right).
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
  const earth = createPlanet(sizes.earth * sizeScale, dayTexture, 'earth', true, nightTexture)
  const mars = createPlanet(sizes.mars * sizeScale, marsTex, 'mars')
  const jupiter = createPlanet(sizes.jupiter * sizeScale, jupiterTex, 'jupiter')
  const saturn = createPlanet(sizes.saturn * sizeScale, saturnTex, 'saturn')
  const uranus = createPlanet(sizes.uranus * sizeScale, uranusTex, 'uranus')
  const neptune = createPlanet(sizes.neptune * sizeScale, neptuneTex, 'neptune')

  await createSaturnRing(saturn)

  const planets = [
    sun, mercury, venus, earth, mars, jupiter, saturn, uranus, neptune
  ]

  const planetObjects = {
    sun, mercury, venus, earth, mars,
    jupiter, saturn, uranus, neptune
  }

  Object.entries(planetObjects).forEach(([name, mesh]) => {
    mesh.userData.rotationSpeed = getRotationSpeed(name)
  })

  // Initial positions
  Object.keys(planetObjects).forEach(name => {
    if (name === 'sun') return; // Skip sun as it is at (0,0,0)
    const el = computeElements(name, computeD(new Date()))
    const pos = computePosition(el, orbitScale)
    planetObjects[name].position.set(pos.x, pos.y, pos.z)
  })

  // Stars
  const starGeo = new THREE.BufferGeometry()
  const vertices = []
  for (let i = 0; i < 15000; i++) {
    vertices.push(
      (Math.random() - 0.5) * 200000,
      (Math.random() - 0.5) * 200000,
      (Math.random() - 0.5) * 200000
    )
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  const starPoints = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 2 })
  )
  starPoints.userData.isStarfield = true
  scene.add(starPoints)

  const nebula = createNebula(new THREE.Vector3(0, 0, -1500))
  nebula.userData.isNebula = true
  scene.add(nebula)
  scene.add(new THREE.AmbientLight(0x404040, 0.6))

  // Zodiac Ring (at the edge of the system)
  const zodiacRing = createZodiacRing(ZODIAC_RADIUS, zodiacNames); // Larger than Neptune
  zodiacRing.visible = false; // Hide by default
  scene.add(zodiacRing);


  // Moon
  const moonTex = await loadTexture('/hq/8k_moon.jpg');
  const moon = createUnifiedPlanet(sizes.earth * sizeScale * 0.27, moonTex, scene);
  moon.userData.name = 'moon';
  moon.userData.isMoon = true;
  moon.rotation.x = Math.PI / 2; // consistent with other planets

  // Moon orbit visualization
  // Use createEllipticalOrbit to match other planets style (Line2, thickness, etc.)
  // We need to pass the Moon's elements. Since the Moon's orbit precesses efficiently,
  // we compute elements for the CURRENT date so the initial orbit is accurate.
  const currentD = computeD(new Date());
  const moonEl = computeElements('moon', currentD);

  // Override 'a' with our visual radius because createEllipticalOrbit uses 'a' from elements for size
  // We need it to be 1 * MOON_ORBIT_RADIUS effectively
  const visualMoonEl = { ...moonEl, a: 1 };

  const moonOrbit = createEllipticalOrbit(
    visualMoonEl,
    MOON_ORBIT_RADIUS, // Scale factor
    128,               // Segments
    0x888888,          // Color (Greyish)
    0.5                // Opacity
  );
  moonOrbit.userData.isOrbit = true;
  scene.add(moonOrbit);

  // 5. Aspects Manager
  const aspectsManager = new AspectLinesManager(scene, planetObjects);

  // 6. Aura Manager
  const auraManager = new AuraManager(scene, planetObjects);

  // Return moon and moonOrbit
  return {
    scene,
    planets,
    planetObjects,
    sun,
    moon,
    moonOrbit,
    MOON_ORBIT_RADIUS,
    orbitScale, // Use the existing orbitScale constant
    zodiacRing,
    aspectsManager,
    auraManager
  };
}
