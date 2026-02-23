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
 * Now uses a Mesh for the dot (to "stick" to the surface) and a Sprite for the label.
 */
export function createPOIMarkers(planetName, radius) {
  const pois = PLANET_POIS[planetName];
  if (!pois) return null;

  const group = new THREE.Group();
  group.name = `POIs_${planetName}`;

  // Shared geometry and material for the dots
  const dotGeometry = new THREE.CircleGeometry(radius * 0.015, 32);
  const dotMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthTest: true
  });

  pois.forEach(poi => {
    const poiGroup = new THREE.Group();
    poiGroup.name = `POI_${poi.id}`;

    const latRad = THREE.MathUtils.degToRad(poi.lat);
    const lonRad = THREE.MathUtils.degToRad(-poi.lon);

    // Position on surface
    const r = radius * 1.005;
    const pos = new THREE.Vector3(
      r * Math.cos(latRad) * Math.cos(lonRad),
      r * Math.sin(latRad),
      r * Math.cos(latRad) * Math.sin(lonRad)
    );

    // 1. Solid White Dot (Stuck to surface)
    const dot = new THREE.Mesh(dotGeometry, dotMaterial.clone());
    dot.position.copy(pos);
    // Orient to surface normal
    dot.lookAt(pos.clone().multiplyScalar(1.1));
    poiGroup.add(dot);

    // 2. Text Label (Always facing camera)
    const labelSprite = createLabelSprite(poi, radius);
    // Position label slightly above the dot
    const labelOffset = radius * 0.04;
    const labelPos = pos.clone().add(pos.clone().normalize().multiplyScalar(labelOffset));
    labelSprite.position.copy(labelPos);
    poiGroup.add(labelSprite);

    // Attach data to the group for raycasting
    poiGroup.userData = {
      ...poi,
      isPOI: true,
      planetName,
      poiId: poi.id,
      dot: dot,
      label: labelSprite
    };

    group.add(poiGroup);
  });

  return group;
}

/**
 * Updates POI visibility and animations.
 */
export function updatePOIs(group, camera, planetPosition) {
  if (!group) return;

  const distance = camera.position.distanceTo(planetPosition);
  const isVisible = distance < 40;
  group.visible = isVisible;

  if (isVisible) {
    group.children.forEach(poiGroup => {
      // Update labels if language changed
      const currentText = t(`mars.pois.${poiGroup.userData.poiId}`);
      const sprite = poiGroup.userData.label;
      if (poiGroup.userData.lastText !== currentText) {
        updateLabelCanvas(sprite.material.map.image, currentText);
        sprite.material.map.needsUpdate = true;
        poiGroup.userData.lastText = currentText;
      }

      // Handle hover scaling (interaction script will set isHovered)
      const targetScale = poiGroup.userData.isHovered ? 1.5 : 1.0;
      const dot = poiGroup.userData.dot;
      dot.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      sprite.scale.lerp(new THREE.Vector3(
        sprite.userData.baseScale.x * targetScale,
        sprite.userData.baseScale.y * targetScale,
        1
      ), 0.1);
    });
  }
}

function createLabelSprite(poi, radius) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128; // Reduced height since we only have text

  const text = t(`mars.pois.${poi.id}`);
  updateLabelCanvas(canvas, text);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true
  });
  const sprite = new THREE.Sprite(material);

  // Base scale
  const baseScale = new THREE.Vector3(radius * 0.4, radius * 0.1, 1);
  sprite.scale.copy(baseScale);
  sprite.userData.baseScale = baseScale.clone();

  // Anchor at the bottom center of the text
  sprite.center.set(0.5, 0);

  return sprite;
}

function updateLabelCanvas(canvas, text) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Stronger shadow for better readability against planet surface
  ctx.shadowBlur = 8;
  ctx.shadowColor = 'rgba(0, 0, 0, 1.0)';
  // Slightly bolder and larger font
  ctx.font = '400 52px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, h / 2);
}
