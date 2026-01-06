import * as THREE from 'three'
import { createUnifiedPlanet } from '../utils/Planet.js'
import { createNebula } from '../utils/Nebula.js'
import { computeElements, computePosition, getRotationSpeed } from '../utils/Astronomy.js'
import { createEllipticalOrbit } from '../utils/EllipticalOrbit.js'

const orbitScale = 45
const sizeScale = 0.6
const SUN_RADIUS = 10

const sizes = {
  sun: SUN_RADIUS,
  mercury: 1.8,
  venus: 3.0,
  earth: 3.1,
  mars: 1.8,
  jupiter: 16,
  saturn: 14,
  uranus: 6,
  neptune: 6
}

const loadTexture = (path) =>
  new Promise(resolve => new THREE.TextureLoader().load(path, resolve))

function createSaturnRing(saturn, ringTexture) {
    const ringGroup = new THREE.Group();
    const baseRadius = sizes.saturn * sizeScale;

    const ringSegments = [
        { inner: baseRadius + 2, outer: baseRadius + 5, particles: 20000 },
        { inner: baseRadius + 6, outer: baseRadius + 10, particles: 30000 },
        { inner: baseRadius + 11, outer: baseRadius + 12, particles: 10000 }
    ];

    ringSegments.forEach(segment => {
        const ringGeo = new THREE.BufferGeometry();
        const vertices = [];

        for (let i = 0; i < segment.particles; i++) {
            const theta = Math.random() * 2 * Math.PI;
            const r = segment.inner + Math.random() * (segment.outer - segment.inner);
            const x = r * Math.cos(theta);
            const z = r * Math.sin(theta);
            const y = (Math.random() - 0.5) * 0.4; // Make the ring thinner
            vertices.push(x, y, z);
        }

        ringGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const ringMat = new THREE.PointsMaterial({
            size: 0.3, 
            transparent: true,
            opacity: 0.8,
            map: ringTexture,
            blending: THREE.AdditiveBlending
        });

        const ring = new THREE.Points(ringGeo, ringMat);
        ringGroup.add(ring);
    });

    ringGroup.rotation.x = -0.4 * Math.PI;
    saturn.add(ringGroup);
}

export async function createSolarSystem(scene) {
  const [
    dayTexture, sunTexture,
    mercuryTex, venusTex, marsTex,
    jupiterTex, saturnTex, uranusTex, neptuneTex,
    ringTex
  ] = await Promise.all([
    loadTexture('/earth_day.jpg'),
    loadTexture('/sun.jpg'),
    loadTexture('/mercury.jpg'),
    loadTexture('/venus.jpg'),
    loadTexture('/mars.jpg'),
    loadTexture('/jupiter.jpg'),
    loadTexture('/saturn.jpg'),
    loadTexture('/uranus.jpg'),
    loadTexture('/neptune.jpg'),
    loadTexture('/earth_bump.png')
  ])

  // Sun
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(sizes.sun, 64, 64),
    new THREE.MeshBasicMaterial({ map: sunTexture })
  )
  sun.userData.name = 'sun'

  // realistic solar rotation (approx. 25.38 days -> hours)
  // rotation speed in rad/s = 2π / (hours * 3600)
  const SUN_ROTATION_HOURS = 25.38 * 24 // ~25.38 days
  sun.userData.rotationSpeed = (2 * Math.PI) / (SUN_ROTATION_HOURS * 3600)

  scene.add(sun)

  // Planet factory
  const createPlanet = (size, tex, name, isEarth = false) => {
    const planet = createUnifiedPlanet(size, tex, scene, isEarth)
    planet.userData.name = name

    const elements = computeElements(name, 0)
    const orbit = createEllipticalOrbit(elements, orbitScale, 512, 0xd4aaff, 0.92)
    scene.add(orbit)

    return planet
  }

  // Planets
  const mercury = createPlanet(sizes.mercury * sizeScale, mercuryTex, 'mercury')
  const venus   = createPlanet(sizes.venus   * sizeScale, venusTex,   'venus')
  const earth   = createPlanet(sizes.earth   * sizeScale, dayTexture, 'earth', true)
  const mars    = createPlanet(sizes.mars    * sizeScale, marsTex,    'mars')
  const jupiter = createPlanet(sizes.jupiter * sizeScale, jupiterTex, 'jupiter')
  const saturn  = createPlanet(sizes.saturn  * sizeScale, saturnTex,  'saturn')
  const uranus  = createPlanet(sizes.uranus  * sizeScale, uranusTex,  'uranus')
  const neptune = createPlanet(sizes.neptune * sizeScale, neptuneTex, 'neptune')

  createSaturnRing(saturn, ringTex)

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
  for (let i = 0; i < 800; i++) {
    vertices.push(
      (Math.random() - 0.5) * 8000,
      (Math.random() - 0.5) * 8000,
      (Math.random() - 0.5) * 8000
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
