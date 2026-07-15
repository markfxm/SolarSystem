import * as THREE from 'three';
import { t } from './i18n.ts';

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

// Optimized: Shared unit geometries and materials for POIs
const dotUnitGeometry = new THREE.CircleGeometry(0.015, 32);
const dotSharedMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  // Optimization: POI dots only need to be visible from the front
  side: THREE.FrontSide,
  transparent: true,
  opacity: 0.9,
  depthTest: true
});

// Shared unit PlaneGeometry for labels
const labelUnitGeometry = new THREE.PlaneGeometry(0.45, 0.45 * 0.25);
// Shift geometry so it's anchored at the bottom-center
labelUnitGeometry.translate(0, (0.45 * 0.25) * 1.2, 0);

// Scratch variables to eliminate per-POI allocations during initialization
const _vPos = new THREE.Vector3();
const _vLook = new THREE.Vector3();

/**
 * Creates interactive POI markers for a planet.
 * Optimized: Uses shared geometries and scale-based positioning.
 */
export function createPOIMarkers(planetName, radius) {
  const pois = PLANET_POIS[planetName];
  if (!pois) return null;

  const group = new THREE.Group();
  group.name = `POIs_${planetName}`;
  // Optimization: Set to Layer 1 to prune from standard recursive raycast passes (Layer 0).
  group.layers.set(1);
  group.userData = {
    isPOIGroup: true,
    planetName: planetName
  };
  // Optimization: POI container is static relative to the planet
  group.matrixAutoUpdate = false;
  group.updateMatrix();

  pois.forEach(poi => {
    const poiGroup = new THREE.Group();
    poiGroup.name = `POI_${poi.id}`;
    // Optimization: Set to Layer 1 to prune from standard recursive raycast passes (Layer 0).
    poiGroup.layers.set(1);
    // Optimization: Individual POI anchor is static relative to the planet
    poiGroup.matrixAutoUpdate = false;

    const latRad = THREE.MathUtils.degToRad(poi.lat);
    const lonRad = THREE.MathUtils.degToRad(-poi.lon);

    // Position on surface
    const r = radius * 1.005;
    _vPos.set(
      r * Math.cos(latRad) * Math.cos(lonRad),
      r * Math.sin(latRad),
      r * Math.cos(latRad) * Math.sin(lonRad)
    );

    // 1. Solid White Dot (Stuck to surface)
    const dot = new THREE.Mesh(dotUnitGeometry, dotSharedMaterial);
    // Optimization: POIs are interactive but handled separately via specialized raycasting.
    // Set to Layer 1 to prune them from the expensive recursive planet-wide raycast.
    dot.layers.set(1);
    dot.position.copy(_vPos);
    _vLook.copy(_vPos).multiplyScalar(1.1);
    dot.lookAt(_vLook);
    // Optimization: Draw dots above planet but below labels
    dot.renderOrder = 7;
    // Optimization: POI dots are static once placed, disable per-frame matrix updates.
    dot.matrixAutoUpdate = false;
    dot.updateMatrix();
    poiGroup.add(dot);

    // 2. Text Label
    const labelMesh = createLabelMesh(poi, planetName);
    // Optimization: Set to Layer 1 to prune from standard raycast passes.
    labelMesh.layers.set(1);
    // Offset slightly from dot to avoid Z-fighting
    _vLook.copy(_vPos).normalize().multiplyScalar(0.002);
    _vPos.add(_vLook);
    labelMesh.position.copy(_vPos);
    _vLook.copy(_vPos).multiplyScalar(1.1);
    labelMesh.lookAt(_vLook);
    // Optimization: Draw labels on top of dots
    labelMesh.renderOrder = 8;
    // Optimization: POI labels are static once placed, disable per-frame matrix updates.
    labelMesh.matrixAutoUpdate = false;
    labelMesh.updateMatrix();
    poiGroup.add(labelMesh);

    poiGroup.userData = {
      ...poi,
      isPOI: true,
      planetName: planetName,
      poiId: poi.id,
      dot: dot,
      label: labelMesh
    };

    poiGroup.updateMatrix();
    group.add(poiGroup);
  });

  return group;
}

const _tempScale = new THREE.Vector3();

export function updatePOIs(group, camera, planetPosition) {
  if (!group) return;

  const distSq = camera.position.distanceToSquared(planetPosition);
  const isVisible = distSq < 1600;

  // Optimized: Only update visibility if it changed to avoid redundant Three.js state updates
  if (group.visible !== isVisible) {
    group.visible = isVisible;
  }

  if (isVisible) {
    const children = group.children;
    for (let i = 0; i < children.length; i++) {
      const poiGroup = children[i];
      const targetScale = poiGroup.userData.isHovered ? 1.5 : 1.0;
      const dot = poiGroup.userData.dot;
      const label = poiGroup.userData.label;

      // Optimization: Skip Three.js property updates and matrix recalculations
      // if the target scale is already reached.
      if (Math.abs(dot.scale.x - targetScale) > 0.001) {
        _tempScale.setScalar(targetScale);
        dot.scale.lerp(_tempScale, 0.1);
        label.scale.lerp(_tempScale, 0.1);
        // Manual update required as matrixAutoUpdate = false
        dot.updateMatrix();
        label.updateMatrix();
      } else if (dot.scale.x !== targetScale) {
        // Snap to target if very close to avoid persistent sub-pixel updates
        dot.scale.setScalar(targetScale);
        label.scale.setScalar(targetScale);
        // Manual update required as matrixAutoUpdate = false
        dot.updateMatrix();
        label.updateMatrix();
      }
    }
  }
}

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

function createLabelMesh(poi, planetName) {
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
    // Optimization: Labels only need to be visible from the front
    side: THREE.FrontSide,
    // Optimization: Disable depthWrite for transparent labels to reduce Z-fighting
    // and improve rendering performance in complex scenes.
    depthWrite: false
  });

  // Optimized: Use shared unit PlaneGeometry
  const mesh = new THREE.Mesh(labelUnitGeometry, material);
  return mesh;
}

function updateLabelCanvas(canvas, text) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.shadowBlur = 8;
  ctx.shadowColor = 'rgba(0, 0, 0, 1.0)';

  let fontSize = 52;
  ctx.font = `400 ${fontSize}px "Segoe UI", Arial, sans-serif`;

  const maxWidth = w - 40;
  let metrics = ctx.measureText(text);

  if (metrics.width > maxWidth) {
    fontSize = Math.floor(fontSize * (maxWidth / metrics.width));
    if (fontSize < 24) fontSize = 24;
    ctx.font = `400 ${fontSize}px "Segoe UI", Arial, sans-serif`;
  }

  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
}
