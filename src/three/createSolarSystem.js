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

function createSaturnRing(saturn) {
  const baseRadius = sizes.saturn * sizeScale;

  // Real Saturn ring ratios (relative to planet radius):
  // Inner D Ring start: 1.11
  // Outer F Ring end: 2.33
  const innerRadius = baseRadius * 1.11;
  const outerRadius = baseRadius * 2.33;

  const canvas = document.createElement('canvas');
  canvas.width = 2048; // Significantly increased for fine ringlets
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 2048, 0);

  // Gradient Stops Calculation (normalized 0..1 for range 1.11 - 2.33):
  // D-Ring (1.11 - 1.235): 0.0 - 0.10
  // C-Ring (1.235 - 1.525): 0.10 - 0.34
  // B-Ring (1.525 - 1.95): 0.34 - 0.69
  // Cassini (1.95 - 1.98): 0.69 - 0.71
  // A-Ring (1.98 - 2.27): 0.71 - 0.95 (Encke Gap at ~0.90)
  // F-Ring (2.27 - 2.33): 0.95 - 1.00

  // D Ring
  gradient.addColorStop(0.0, 'rgba(40, 40, 40, 0.0)');
  gradient.addColorStop(0.1, 'rgba(60, 60, 60, 0.15)');

  // C Ring
  gradient.addColorStop(0.1, 'rgba(70, 70, 70, 0.25)');
  gradient.addColorStop(0.34, 'rgba(120, 115, 105, 0.4)');

  // B Ring (Dense & Icy)
  gradient.addColorStop(0.34, 'rgba(210, 200, 180, 0.85)');
  gradient.addColorStop(0.5, 'rgba(255, 253, 245, 1.0)');
  gradient.addColorStop(0.69, 'rgba(210, 200, 180, 0.95)');

  // Cassini Division
  gradient.addColorStop(0.69, 'rgba(0, 0, 0, 0.0)');
  gradient.addColorStop(0.71, 'rgba(0, 0, 0, 0.0)');

  // A Ring with Encke Gap
  gradient.addColorStop(0.71, 'rgba(180, 170, 150, 0.85)');
  gradient.addColorStop(0.89, 'rgba(190, 180, 160, 0.8)');
  gradient.addColorStop(0.90, 'rgba(0, 0, 0, 0.0)'); // Encke Gap start
  gradient.addColorStop(0.91, 'rgba(0, 0, 0, 0.0)'); // Encke Gap end
  gradient.addColorStop(0.92, 'rgba(170, 160, 140, 0.75)');
  gradient.addColorStop(0.95, 'rgba(130, 120, 110, 0.45)');

  // Gap to F Ring
  gradient.addColorStop(0.95, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.97, 'rgba(0,0,0,0)');

  // F Ring
  gradient.addColorStop(0.98, 'rgba(180, 180, 180, 0.4)');
  gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2048, 1);

  // --- RINGLET SIMULATION ---
  // Apply high-frequency procedural noise over the gradient to create the look of thousands of ringlets
  const imgData = ctx.getImageData(0, 0, 2048, 1);
  const data = imgData.data;
  for (let i = 0; i < 2048; i++) {
    // Basic ringlet modulation: 
    // Uses sine wave + random noise to create varying density bands
    const noise = 0.85 + Math.random() * 0.15; // Random flicker
    const ringletPattern = 0.9 + 0.1 * Math.sin(i * 0.5); // Finer bands
    const microPattern = 0.95 + 0.05 * Math.sin(i * 5.0); // Micro bands

    const factor = noise * ringletPattern * microPattern;

    data[i * 4 + 0] *= factor; // R
    data[i * 4 + 1] *= factor; // G
    data[i * 4 + 2] *= factor; // B
    data[i * 4 + 3] *= factor; // A (also modulates transparency for better depth)
  }
  ctx.putImageData(imgData, 0, 0);

  const ringTex = new THREE.CanvasTexture(canvas);
  // Important: RingGeometry UVs map 'r' to 'y' and 'theta' to 'x' usually?
  // Actually, standard RingGeometry maps inner-to-outer to the V coordinate (y) 
  // and circumference to U coordinate (x).
  // I'll adjust the canvas orientation or mapping.

  // Create geometry
  const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 128);

  // Correct UV mapping for RingGeometry:
  // v = (r - inner) / (outer - inner)
  // We want the texture gradient to be mapped to the radial distance.
  const pos = ringGeo.attributes.position;
  const uv = ringGeo.attributes.uv;
  const v3 = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    const r = v3.length();
    const v = (r - innerRadius) / (outerRadius - innerRadius);
    uv.setXY(i, v, 0); // Map radial distance to U (since our canvas is 512x1)
  }

  const ringMat = new THREE.MeshStandardMaterial({
    map: ringTex,
    emissive: 0xffffff,
    emissiveMap: ringTex,
    emissiveIntensity: 0.15, // Slight glow to simulate ice reflectivity
    transparent: true,
    side: THREE.DoubleSide,
    roughness: 0.3, // Smoother for more specular-like highlight
    metalness: 0.0,
  });

  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  // Orientation Fix:
  // Planet geometry has poles on Y axis.
  // RingGeometry is created in XY plane (Normal = Z).
  // We want the ring to lie on the Planet's Equator (XZ plane).
  // Therefore, we must rotate the Ring 90 degrees around X to align its Normal with the Planet's Y axis.
  ringMesh.rotation.x = -Math.PI / 2;

  saturn.add(ringMesh);
}

export async function createSolarSystem(scene) {
  const [
    dayTexture, sunTexture,
    mercuryTex, venusTex, marsTex,
    jupiterTex, saturnTex, uranusTex, neptuneTex
  ] = await Promise.all([
    loadTexture('/earth_day.jpg'),
    loadTexture('/sun.jpg'),
    loadTexture('/mercury.jpg'),
    loadTexture('/venus.jpg'),
    loadTexture('/mars.jpg'),
    loadTexture('/jupiter.jpg'),
    loadTexture('/saturn.jpg'),
    loadTexture('/uranus.jpg'),
    loadTexture('/neptune.jpg')
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
  const createPlanet = (size, tex, name, isEarth = false) => {
    const planet = createUnifiedPlanet(size, tex, scene, isEarth)
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
  const earth = createPlanet(sizes.earth * sizeScale, dayTexture, 'earth', true)
  const mars = createPlanet(sizes.mars * sizeScale, marsTex, 'mars')
  const jupiter = createPlanet(sizes.jupiter * sizeScale, jupiterTex, 'jupiter')
  const saturn = createPlanet(sizes.saturn * sizeScale, saturnTex, 'saturn')
  const uranus = createPlanet(sizes.uranus * sizeScale, uranusTex, 'uranus')
  const neptune = createPlanet(sizes.neptune * sizeScale, neptuneTex, 'neptune')

  createSaturnRing(saturn)

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
