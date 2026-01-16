import * as THREE from 'three'
import { createUnifiedPlanet } from '../utils/Planet.js'
import { createNebula } from '../utils/Nebula.js'
import { computeElements, computePosition, getRotationSpeed } from '../utils/Astronomy.js'
import { createEllipticalOrbit } from '../utils/EllipticalOrbit.js'

const orbitScale = 260
const sizeScale = 0.6
const SUN_RADIUS = 70

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

export async function createSolarSystem(scene) {
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
    mercury, venus, earth, mars,
    jupiter, saturn, uranus, neptune
  }

  Object.entries(planetObjects).forEach(([name, mesh]) => {
    mesh.userData.rotationSpeed = getRotationSpeed(name)
  })

  // Initial positions
  Object.keys(planetObjects).forEach(name => {
    const el = computeElements(name, new Date())
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
  scene.add(new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 2 })
  ))

  scene.add(createNebula(new THREE.Vector3(0, 0, -1500)))
  scene.add(new THREE.AmbientLight(0x404040, 0.6))

  return { sun, planets, planetObjects, orbitScale }
}
