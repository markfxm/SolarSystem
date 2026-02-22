import * as THREE from 'three';

/**
 * Creates a longitude and latitude grid for a planet.
 * @param {number} radius - The radius of the planet.
 * @returns {THREE.Group} The grid group.
 */
export function createLatLonGrid(radius) {
  const group = new THREE.Group();
  group.name = 'LatLonGrid';

  // Offset slightly to avoid Z-fighting with the planet surface
  // Increased from 1.005 to 1.02 to prevent labels from clipping into the sphere
  const gridRadius = radius * 1.02;

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xaaaaaa, // Light gray instead of pure white to appear thinner
    transparent: true,
    opacity: 0.6,
    depthTest: true
  });

  // Scale labels relative to planet size
  const labelScale = radius * 0.08; // Reduced size

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

    const points = [];
    const segments = 128; // High resolution circles
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta)));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, lineMaterial);
    group.add(line);

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
    const theta = THREE.MathUtils.degToRad(lon);
    const points = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const phi = (i / segments) * Math.PI - Math.PI / 2; // -PI/2 to PI/2 (South to North)
      const x = gridRadius * Math.cos(phi) * Math.cos(theta);
      const y = gridRadius * Math.sin(phi);
      const z = gridRadius * Math.cos(phi) * Math.sin(theta);
      points.push(new THREE.Vector3(x, y, z));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, lineMaterial);
    group.add(line);

    // Longitude Label (placed on Equator)
    // Avoid redundant label at (lat 0, lon 0)
    if (lon !== 0) {
      const sprite = createTextSprite(`${lon}°`, labelScale);
      const labelR = gridRadius * 1.005;
      sprite.position.set(labelR * Math.cos(theta), 0, labelR * Math.sin(theta));
      group.add(sprite);
    }
  }

  // Initially hidden
  group.visible = false;
  return group;
}

/**
 * Creates a sprite with text drawn on a canvas.
 */
function createTextSprite(text, scale) {
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

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    sizeAttenuation: true
  });

  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(scale, scale, 1);
  return sprite;
}
