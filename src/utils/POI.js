import * as THREE from 'three';
import { t } from './i18n.js';

export const PLANET_POIS = {
  earth: [
    { id: 'mount_everest', lat: 27.9881, lon: 86.9250 },
    { id: 'mariana_trench', lat: 11.3493, lon: 142.1996 }
  ],
  mars: [
    { id: 'olympus_mons', lat: 18.65, lon: 226.2 },
    { id: 'valles_marineris', lat: -13.9, lon: 300.8 },
    { id: 'gale_crater', lat: -5.4, lon: 137.8 },
    { id: 'jezero_crater', lat: 18.38, lon: 77.58 },
    { id: 'hellas_planitia', lat: -42.4, lon: 70.5 }
  ],
  moon: [
    { id: 'apollo_11', lat: 0.6740, lon: 23.4730 },
    { id: 'tycho_crater', lat: -43.3, lon: -11.2 }
  ]
};

/**
 * Creates interactive POI markers for a planet.
 * Now uses Mesh for BOTH dot and label for a surface-stuck "cyberpunk" look.
 */
export function createPOIMarkers(planetName, radius) {
  const pois = PLANET_POIS[planetName];
  if (!pois) return null;

  const group = new THREE.Group();
  group.name = `POIs_${planetName}`;
  group.userData = {
    isPOIGroup: true,
    planetName: planetName
  };

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

    // Position on surface (slightly above to prevent z-fighting)
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

    // 2. Text Label (Now also stuck to surface - Cyberpunk style)
    const labelMesh = createLabelMesh(poi, radius, planetName);
    // Position label slightly above the dot and offset radially
    const labelOffset = radius * 0.045;
    const labelPos = pos.clone().add(pos.clone().normalize().multiplyScalar(0.002)); // Minimal hover

    // Instead of simple adding, we move it "up" on the sphere's surface relative to the dot
    // But for a ground look, keeping it near the dot works well if we rotate it correctly.
    labelMesh.position.copy(labelPos);

    // Orient to surface normal
    labelMesh.lookAt(labelPos.clone().multiplyScalar(1.1));

    // We want the text to be oriented "north" or consistently
    // For now, lookAt handles the normal, but we might want a secondary rotation
    // to keep the text from being upside down depending on hemisphere.

    poiGroup.add(labelMesh);

    // Attach data to the group for raycasting
    poiGroup.userData = {
      ...poi,
      isPOI: true,
      planetName: planetName,
      poiId: poi.id,
      dot: dot,
      label: labelMesh
    };

    group.add(poiGroup);
  });

  return group;
}

// Scratch variable for POI scaling to avoid per-frame allocations
const _tempScale = new THREE.Vector3();

/**
 * Updates POI visibility and animations.
 * Optimized: Removed per-frame translation calls.
 */
export function updatePOIs(group, camera, planetPosition) {
  if (!group) return;

  const distance = camera.position.distanceTo(planetPosition);
  const isVisible = distance < 40;
  group.visible = isVisible;

  if (isVisible) {
    const children = group.children;
    for (let i = 0; i < children.length; i++) {
      const poiGroup = children[i];
      // Handle hover scaling (interaction script will set isHovered)
      const targetScale = poiGroup.userData.isHovered ? 1.5 : 1.0;
      const dot = poiGroup.userData.dot;
      const label = poiGroup.userData.label;

      _tempScale.setScalar(targetScale);
      dot.scale.lerp(_tempScale, 0.1);
      label.scale.lerp(_tempScale, 0.1);
    }
  }
}

/**
 * Manually refresh all POI labels in a group for the current language.
 * Called only when language changes.
 */
export function refreshPOILabels(group) {
  if (!group) return;
  group.children.forEach(poiGroup => {
    const planet = poiGroup.userData.planetName;
    const currentText = t(`${planet}.pois.${poiGroup.userData.poiId}`);
    const label = poiGroup.userData.label;
    if (label && label.material.map) {
      updateLabelCanvas(label.material.map.image, currentText);
      label.material.map.needsUpdate = true;
    }
  });
}

function createLabelMesh(poi, radius, planetName) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;

  const text = t(`${planetName}.pois.${poi.id}`);
  updateLabelCanvas(canvas, text);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    side: THREE.DoubleSide
  });

  // Aspect ratio 4:1 (512:128)
  const width = radius * 0.45;
  const height = width * 0.25;
  const geometry = new THREE.PlaneGeometry(width, height);

  // Shift geometry so it's anchored at the bottom (or top) relative to the dot
  // We'll translate the geometry so the origin is at the bottom-center
  geometry.translate(0, height * 1.2, 0);

  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function updateLabelCanvas(canvas, text) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Stronger shadow for better readability against planet surface
  ctx.shadowBlur = 8;
  ctx.shadowColor = 'rgba(0, 0, 0, 1.0)';

  // Dynamic font sizing to prevent truncation
  let fontSize = 52;
  ctx.font = `400 ${fontSize}px "Segoe UI", Arial, sans-serif`;

  // Measure text and scale down if it exceeds canvas width (with some padding)
  const maxWidth = w - 40;
  let metrics = ctx.measureText(text);

  if (metrics.width > maxWidth) {
    fontSize = Math.floor(fontSize * (maxWidth / metrics.width));
    // Set a minimum font size to keep it readable
    if (fontSize < 24) fontSize = 24;
    ctx.font = `400 ${fontSize}px "Segoe UI", Arial, sans-serif`;
  }

  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
}
