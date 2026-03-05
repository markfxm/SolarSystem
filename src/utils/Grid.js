import * as THREE from 'three';

// Module-level caches to reuse assets across all planets
const textureCache = new Map();
const materialCache = new Map();

// Shared material for all grid lines
const sharedLineMaterial = new THREE.LineBasicMaterial({
  color: 0xaaaaaa, // Light gray instead of pure white to appear thinner
  transparent: true,
  opacity: 0.6,
  depthTest: true
});

/**
 * Creates a longitude and latitude grid for a planet.
 * @param {number} radius - The radius of the planet.
 * @returns {THREE.Group} The grid group.
 */
export function createLatLonGrid(radius) {
  const group = new THREE.Group();
  group.name = 'LatLonGrid';
  group.userData.isGrid = true;

  // Offset slightly to avoid Z-fighting with the planet surface
  // Increased from 1.005 to 1.02 to prevent labels from clipping into the sphere
  const gridRadius = radius * 1.02;

  // Scale labels relative to planet size
  const labelScale = radius * 0.08; // Reduced size

  const allPoints = [];

  // Latitudes (-90 to 90, every 30 degrees)
  for (let lat = -90; lat <= 90; lat += 30) {
    if (Math.abs(lat) === 90) {
      // Points at poles - add a label
      const y = gridRadius * 1.005 * Math.sin(THREE.MathUtils.degToRad(lat));
      const labelText = lat === 90 ? '90°N' : '90°S';
      const sprite = createTextSprite(labelText, labelScale);
      sprite.position.set(0, y, 0);
      group.add(sprite);
      continue;
    }

    const phi = THREE.MathUtils.degToRad(lat);
    const y = gridRadius * Math.sin(phi);
    const r = gridRadius * Math.cos(phi);

    const segments = 128; // High resolution circles
    for (let i = 0; i < segments; i++) {
      const theta1 = (i / segments) * Math.PI * 2;
      const theta2 = ((i + 1) / segments) * Math.PI * 2;

      allPoints.push(
        r * Math.cos(theta1), y, r * Math.sin(theta1),
        r * Math.cos(theta2), y, r * Math.sin(theta2)
      );
    }

    // Latitude Label placed on the "Prime Meridian" of the sphere (x=r, z=0)
    const labelText = lat === 0 ? '0°' : `${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`;
    const sprite = createTextSprite(labelText, labelScale);
    // Add a tiny extra offset for labels to stay clear of lines
    const labelRadius = r * 1.005;
    sprite.position.set(labelRadius, y * 1.005, 0);
    group.add(sprite);
  }

  // Longitudes (0 to 330, every 30 degrees)
  for (let lon = 0; lon < 360; lon += 30) {
    // Negative longitude to match Three.js SphereGeometry UV mapping (East is negative theta)
    const theta = THREE.MathUtils.degToRad(-lon);
    const segments = 64;
    for (let i = 0; i < segments; i++) {
      const phi1 = (i / segments) * Math.PI - Math.PI / 2;
      const phi2 = ((i + 1) / segments) * Math.PI - Math.PI / 2;

      const x1 = gridRadius * Math.cos(phi1) * Math.cos(theta);
      const y1 = gridRadius * Math.sin(phi1);
      const z1 = gridRadius * Math.cos(phi1) * Math.sin(theta);

      const x2 = gridRadius * Math.cos(phi2) * Math.cos(theta);
      const y2 = gridRadius * Math.sin(phi2);
      const z2 = gridRadius * Math.cos(phi2) * Math.sin(theta);

      allPoints.push(x1, y1, z1, x2, y2, z2);
    }

    // Longitude Label (placed on Equator)
    // Avoid redundant label at (lat 0, lon 0)
    if (lon !== 0) {
      const sprite = createTextSprite(`${lon}°`, labelScale);
      const labelR = gridRadius * 1.005;
      sprite.position.set(labelR * Math.cos(theta), 0, labelR * Math.sin(theta));
      group.add(sprite);
    }
  }

  // Optimized: Create one LineSegments object instead of many individual Lines
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(allPoints, 3));
  // Optimized: Use shared material
  const segmentsMesh = new THREE.LineSegments(geometry, sharedLineMaterial);
  group.add(segmentsMesh);

  // Initially hidden
  group.visible = false;
  return group;
}

/**
 * Creates a sprite with text drawn on a canvas.
 * Optimized: Uses module-level caches to reuse textures and materials.
 */
function createTextSprite(text, scale) {
  let material = materialCache.get(text);

  if (!material) {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Use a smaller, regular weight font
    ctx.font = '32px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add a semi-transparent black stroke for better readability against various planetary backgrounds
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 6;
    ctx.strokeText(text, size / 2, size / 2);
    ctx.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter; // Avoid pixelation

    material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      sizeAttenuation: true
    });

    textureCache.set(text, texture);
    materialCache.set(text, material);
  }

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale, scale, 1);
  return sprite;
}
