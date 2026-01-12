// src/utils/Planet.js
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition; // Pass world pos to fragment

  void main() {
    vUv = uv;
    // Rotate normal to world space
    vNormal = normalize(mat3(modelMatrix) * normal);
    
    // Calculate world position
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// Unified day/night fragment shader (same as Earth, but without night texture)
// src/utils/Planet.js   ←  only the fragmentShader part

const fragmentShader = `
  uniform sampler2D dayTexture;
  // uniform vec3 sunDirection; // REMOVED: computed in shader now
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  // ←←←  NEW: Easy brightness controls
  // Balanced & beautiful (my personal favorite)
  const float directBoost  = 1.5;     // how much brighter the sun-lit side gets
  const float ambientLevel = 0.15;    // Reduced ambient to make shadow side distinct
  const float extraFill    = 0.1;     // Reduced fill
  
  void main() {
    vec3 dayColor   = texture2D(dayTexture, vUv).rgb;

    // Sun is always at (0,0,0) in World Space
    // Light direction is from Sun(0,0,0) towards 'vWorldPosition' ? 
    // No, light direction vector for dot product should be pointing TOWARDS the light source.
    // So lightDir = normalize(SunPos - vWorldPosition) = normalize(vec3(0.0) - vWorldPosition);
    vec3 lightDir   = normalize(-vWorldPosition);

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
      // sunDirection removed
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