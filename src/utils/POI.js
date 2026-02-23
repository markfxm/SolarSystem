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

  const circleTexture = createCircleTexture();

  pois.forEach(poi => {
    const poiGroup = new THREE.Group();
    // Attach important data to the group so raycasting can find it
    poiGroup.userData = {
      ...poi,
      isPOI: true,
      planetName,
      poiId: poi.id
    };

    const latRad = THREE.MathUtils.degToRad(poi.lat);
    const lonRad = THREE.MathUtils.degToRad(-poi.lon);
    const r = radius * 1.01;

    const x = r * Math.cos(latRad) * Math.cos(lonRad);
    const y = r * Math.sin(latRad);
    const z = r * Math.cos(latRad) * Math.sin(lonRad);

    // Circle Sprite
    const circleMaterial = new THREE.SpriteMaterial({
      map: circleTexture,
      transparent: true,
      depthTest: true,
      sizeAttenuation: true
    });
    const circle = new THREE.Sprite(circleMaterial);
    circle.scale.set(radius * 0.08, radius * 0.08, 1);
    circle.userData.isPOIMarker = true;
    circle.userData.parentPOI = poiGroup;
    poiGroup.add(circle);

    // Label Sprite
    const labelScale = radius * 0.3;
    const label = createTextSprite(t(`mars.pois.${poi.id}`), labelScale);
    label.position.set(0, -radius * 0.08, 0);
    label.userData.isPOILabel = true;
    poiGroup.add(label);

    poiGroup.position.set(x, y, z);
    group.add(poiGroup);
  });

  return group;
}

/**
 * Updates POI visibility based on camera distance and language.
 */
export function updatePOIs(group, camera, planetPosition, planetName) {
  if (!group) return;

  const distance = camera.position.distanceTo(planetPosition);
  // Show only when close to the planet (relative to planet size)
  // For Mars (radius 1.65), distance < 20 is a good threshold
  const radius = group.children[0]?.position.length() || 1.65;
  const isVisible = distance < radius * 12;

  group.visible = isVisible;

  if (isVisible) {
    // Update labels if language changed (simple check)
    group.children.forEach(poiGroup => {
      const label = poiGroup.children.find(c => c.userData.isPOILabel);
      if (label) {
        const currentText = t(`mars.pois.${poiGroup.userData.poiId}`);
        if (label.userData.lastText !== currentText) {
          updateTextSprite(label, currentText, radius * 0.3);
          label.userData.lastText = currentText;
        }
      }
    });
  }
}

function createCircleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Outer Glow
  const gradient = ctx.createRadialGradient(64, 64, 20, 64, 64, 60);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.5, 'rgba(0, 163, 255, 0.4)');
  gradient.addColorStop(1, 'rgba(0, 163, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  // Inner Circle
  ctx.beginPath();
  ctx.arc(64, 64, 24, 0, Math.PI * 2);
  ctx.strokeStyle = '#00A3FF';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = 'white';
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function createTextSprite(text, scale) {
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = 64;
  drawTextOnCanvas(canvas, text);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale * 2, scale * 0.5, 1);
  sprite.userData.lastText = text;
  return sprite;
}

function updateTextSprite(sprite, text, scale) {
  const canvas = sprite.material.map.image;
  drawTextOnCanvas(canvas, text);
  sprite.material.map.needsUpdate = true;
}

function drawTextOnCanvas(canvas, text) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Stroke
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 6;
  ctx.strokeText(text, w / 2, h / 2);

  // Fill
  ctx.fillStyle = 'white';
  ctx.fillText(text, w / 2, h / 2);
}
