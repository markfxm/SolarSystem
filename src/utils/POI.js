import * as THREE from 'three';
import { t } from './i18n';

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
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.9,
  depthTest: true
});

// Shared unit PlaneGeometry for labels
const labelUnitGeometry = new THREE.PlaneGeometry(0.45, 0.45 * 0.25);
// Shift geometry so it's anchored at the bottom-center
labelUnitGeometry.translate(0, (0.45 * 0.25) * 1.2, 0);

/**
 * Creates interactive POI markers for a planet.
 * Optimized: Uses shared geometries and scale-based positioning.
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
    const dot = new THREE.Mesh(dotUnitGeometry, dotSharedMaterial);
    dot.position.copy(pos);
    dot.lookAt(pos.clone().multiplyScalar(1.1));
    poiGroup.add(dot);

    // 2. Text Label
    const labelMesh = createLabelMesh(poi, planetName);
    const labelPos = pos.clone().add(pos.clone().normalize().multiplyScalar(0.002));
    labelMesh.position.copy(labelPos);
    labelMesh.lookAt(labelPos.clone().multiplyScalar(1.1));
    poiGroup.add(labelMesh);

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

const _tempScale = new THREE.Vector3();

export function updatePOIs(group, camera, planetPosition) {
  if (!group) return;

  const distSq = camera.position.distanceToSquared(planetPosition);
  const isVisible = distSq < 1600;
  group.visible = isVisible;

  if (isVisible) {
    const children = group.children;
    for (let i = 0; i < children.length; i++) {
      const poiGroup = children[i];
      const targetScale = poiGroup.userData.isHovered ? 1.5 : 1.0;
      const dot = poiGroup.userData.dot;
      const label = poiGroup.userData.label;

      if (Math.abs(dot.scale.x - targetScale) > 0.001) {
        _tempScale.setScalar(targetScale);
        dot.scale.lerp(_tempScale, 0.1);
        label.scale.lerp(_tempScale, 0.1);
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
    side: THREE.DoubleSide
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
