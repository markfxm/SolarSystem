import * as THREE from 'three';

// Module-level caches to reuse assets across all planets
const textureCache = new Map();
const materialCache = new Map();
let unitGridCache = null;

// Shared material for all grid lines to reduce draw state changes
const sharedLineMaterial = new THREE.LineBasicMaterial({
  color: 0xaaaaaa, // Light gray
  transparent: true,
  opacity: 0.6,
  depthTest: true
});

/**
 * Creates a longitude and latitude grid for a planet.
 * Optimized: Uses shared unit geometries, pre-calculated trig, and caches radius=1.0 result.
 * @param {number} radius - The radius of the planet (use 1.0 for unit-scaled planets).
 * @returns {THREE.Group} The grid group.
 */
export function createLatLonGrid(radius) {
  // Optimization: If radius is 1.0 (standard for all planets in this app),
  // return a clone of the cached unit grid. This avoids regenerating the same 8k points 9+ times.
  if (radius === 1.0 && unitGridCache) {
    return unitGridCache.clone();
  }

  const group = new THREE.Group();
  group.name = 'LatLonGrid';
  group.userData.isGrid = true;

  // Offset slightly to avoid Z-fighting with the planet surface
  const gridRadius = radius * 1.02;
  const labelScale = radius * 0.08;

  // Optimized: Use a fixed-size Float32Array to avoid dynamic Array growth/allocations
  // 5 latitude circles (excluding poles) * 128 segments * 2 points * 3 floats = 3840
  // 12 longitude lines * 64 segments * 2 points * 3 floats = 4608
  // Total = 8448 floats
  const allPoints = new Float32Array(8448);
  let pIdx = 0;

  // Pre-calculate trig for latitude circles
  const latSegments = 128;
  const latTrig = new Float32Array((latSegments + 1) * 2);
  for (let i = 0; i <= latSegments; i++) {
    const theta = (i / latSegments) * Math.PI * 2;
    latTrig[i * 2] = Math.cos(theta);
    latTrig[i * 2 + 1] = Math.sin(theta);
  }

  // Latitudes (-90 to 90, every 30 degrees)
  for (let lat = -90; lat <= 90; lat += 30) {
    if (Math.abs(lat) === 90) {
      // Points at poles - add a label
      const y = gridRadius * 1.005 * Math.sin(lat * Math.PI / 180);
      const labelText = lat === 90 ? '90°N' : '90°S';
      const sprite = createTextSprite(labelText, labelScale);
      sprite.position.set(0, y, 0);
      group.add(sprite);
      continue;
    }

    const phi = lat * Math.PI / 180;
    const y = gridRadius * Math.sin(phi);
    const r = gridRadius * Math.cos(phi);

    for (let i = 0; i < latSegments; i++) {
      const c1 = latTrig[i * 2], s1 = latTrig[i * 2 + 1];
      const c2 = latTrig[(i + 1) * 2], s2 = latTrig[(i + 1) * 2 + 1];

      allPoints[pIdx++] = r * c1; allPoints[pIdx++] = y; allPoints[pIdx++] = r * s1;
      allPoints[pIdx++] = r * c2; allPoints[pIdx++] = y; allPoints[pIdx++] = r * s2;
    }

    // Latitude Label
    const labelText = lat === 0 ? '0°' : `${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`;
    const sprite = createTextSprite(labelText, labelScale);
    const labelRadius = r * 1.005;
    sprite.position.set(labelRadius, y * 1.005, 0);
    group.add(sprite);
  }

  // Pre-calculate trig for longitude segments
  const lonSegments = 64;
  const lonTrig = new Float32Array((lonSegments + 1) * 2);
  for (let i = 0; i <= lonSegments; i++) {
    const phi = (i / lonSegments) * Math.PI - Math.PI / 2;
    lonTrig[i * 2] = Math.cos(phi);
    lonTrig[i * 2 + 1] = Math.sin(phi);
  }

  // Longitudes (0 to 330, every 30 degrees)
  for (let lon = 0; lon < 360; lon += 30) {
    const theta = -lon * Math.PI / 180;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    for (let i = 0; i < lonSegments; i++) {
      const c1 = lonTrig[i * 2], s1 = lonTrig[i * 2 + 1];
      const c2 = lonTrig[(i + 1) * 2], s2 = lonTrig[(i + 1) * 2 + 1];

      allPoints[pIdx++] = gridRadius * c1 * cosTheta;
      allPoints[pIdx++] = gridRadius * s1;
      allPoints[pIdx++] = gridRadius * c1 * sinTheta;

      allPoints[pIdx++] = gridRadius * c2 * cosTheta;
      allPoints[pIdx++] = gridRadius * s2;
      allPoints[pIdx++] = gridRadius * c2 * sinTheta;
    }

    // Longitude Label
    if (lon !== 0) {
      const sprite = createTextSprite(`${lon}°`, labelScale);
      const labelR = gridRadius * 1.005;
      sprite.position.set(labelR * cosTheta, 0, labelR * sinTheta);
      group.add(sprite);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(allPoints, 3));
  const segmentsMesh = new THREE.LineSegments(geometry, sharedLineMaterial);
  group.add(segmentsMesh);

  group.visible = false;

  // Cache if unit radius
  if (radius === 1.0) {
    unitGridCache = group;
    return group.clone();
  }

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

    ctx.font = '32px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 6;
    ctx.strokeText(text, size / 2, size / 2);
    ctx.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

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
