import * as THREE from 'three';
import { t } from './i18n.js';

export const PLANET_POIS = {
  mars: [
    { id: 'olympus_mons', lat: 18.65, lon: 226.2 },
    { id: 'valles_marineris', lat: -13.9, lon: 300.8 },
    { id: 'gale_crater', lat: -5.4, lon: 137.8 },
    { id: 'jezero_crater', lat: 18.38, lon: 77.58 },
    { id: 'hellas_planitia', lat: -42.4, lon: 70.5 }
  ]
};

/**
 * Creates interactive POI markers for a planet.
 */
export function createPOIMarkers(planetName, radius) {
  const pois = PLANET_POIS[planetName];
  if (!pois) return null;

  const group = new THREE.Group();
  group.name = `POIs_${planetName}`;

  pois.forEach(poi => {
    // We create a single sprite per POI containing both marker and label
    const sprite = createPOISprite(poi, radius);

    const latRad = THREE.MathUtils.degToRad(poi.lat);
    const lonRad = THREE.MathUtils.degToRad(-poi.lon);

    // Increased radius slightly more to prevent clipping with the sphere limb
    const r = radius * 1.03;

    const x = r * Math.cos(latRad) * Math.cos(lonRad);
    const y = r * Math.sin(latRad);
    const z = r * Math.cos(latRad) * Math.sin(lonRad);

    sprite.position.set(x, y, z);

    // Attach data to the sprite for raycasting
    sprite.userData = {
      ...poi,
      isPOI: true,
      planetName,
      poiId: poi.id
    };

    group.add(sprite);
  });

  return group;
}

/**
 * Updates POI visibility based on camera distance and language.
 */
export function updatePOIs(group, camera, planetPosition, planetName) {
  if (!group) return;

  const distance = camera.position.distanceTo(planetPosition);
  // Show when close to the planet (threshold increased for better visibility during transitions)
  const isVisible = distance < 40;

  group.visible = isVisible;

  if (isVisible) {
    // Update labels if language changed
    group.children.forEach(sprite => {
      const currentText = t(`mars.pois.${sprite.userData.poiId}`);
      if (sprite.userData.lastText !== currentText) {
        drawPOICanvas(sprite.material.map.image, currentText);
        sprite.material.map.needsUpdate = true;
        sprite.userData.lastText = currentText;
      }
    });
  }
}

function createPOISprite(poi, radius) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;

  const text = t(`mars.pois.${poi.id}`);
  drawPOICanvas(canvas, text);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    sizeAttenuation: true
  });
  const sprite = new THREE.Sprite(material);

  // Base scale on planet radius
  // 4:2 aspect ratio (512x256)
  const baseScale = radius * 0.4;
  sprite.scale.set(baseScale, baseScale * 0.5, 1);

  // Anchor the sprite at the center of the circle marker
  // In the canvas, circle is at y=80 (from top).
  // sprite.center.y is from bottom: 1 - (80/256) = 0.6875
  sprite.center.set(0.5, 0.6875);

  sprite.userData.lastText = text;
  return sprite;
}

function drawPOICanvas(canvas, text) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // 1. Draw Hollow Circle (Marker) at y=80
  ctx.beginPath();
  ctx.arc(256, 80, 40, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Subtle Outer Glow
  ctx.shadowBlur = 15;
  ctx.shadowColor = 'rgba(0, 163, 255, 0.8)';
  ctx.stroke();

  // 2. Draw Label Text below circle
  ctx.shadowBlur = 4;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  // Light weight font as requested
  ctx.font = '300 38px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(text, 256, 135);
}
