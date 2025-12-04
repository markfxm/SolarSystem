// src/utils/Planet.js
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Unified day/night fragment shader (same as Earth, but without night texture)
// src/utils/Planet.js   ←  only the fragmentShader part

const fragmentShader = `
  uniform sampler2D dayTexture;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;

  // ←←←  NEW: Easy brightness controls
  // Balanced & beautiful (my personal favorite)
  const float directBoost  = 1.5;     // how much brighter the sun-lit side gets
  const float ambientLevel = 0.45;    // base ambient light level
  const float extraFill    = 0.4;     // extra fill light to avoid black shadows
  
  void main() {
    vec3 dayColor   = texture2D(dayTexture, vUv).rgb;
    vec3 lightDir   = normalize(sunDirection);
    float cosAngle  = dot(vNormal, lightDir);

    // Direct sunlight (boosted)
    float direct    = max(0.0, cosAngle) * directBoost;

    // Soft ambient + extra fill so nothing is black
    float ambient   = ambientLevel + extraFill;

    float intensity = direct + ambient;
    vec3 color      = dayColor * intensity;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Reuse the exact same shader for ALL planets (including Earth)
export function createUnifiedPlanet(radius, dayTexture, scene, isEarth = false) {
  const geometry = new THREE.SphereGeometry(radius, 64, 64);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: dayTexture },
      sunDirection: { value: new THREE.Vector3(1, 0, 0) }  // will be updated globally
    },
    vertexShader,
    fragmentShader
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.originalRadius = radius;
  scene.add(mesh);

  // Add atmosphere only for Earth
  if (isEarth) {
    const atmos = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.05, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.25,
        side: THREE.BackSide
      })
    );
    mesh.add(atmos);
  }

  return mesh;
}