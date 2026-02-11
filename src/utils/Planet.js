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
  uniform sampler2D nightTexture;
  uniform bool useNight;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  const float directBoost  = 1.5;
  const float ambientLevel = 0.15;
  const float extraFill    = 0.1;
  
  void main() {
    vec3 dayColor   = texture2D(dayTexture, vUv).rgb;
    vec3 nightColor = useNight ? texture2D(nightTexture, vUv).rgb : vec3(0.0);

    vec3 lightDir   = normalize(-vWorldPosition);
    float cosAngle  = dot(vNormal, lightDir);

    // Day side: cosAngle > 0
    // Night side: cosAngle < 0
    float direct    = max(0.0, cosAngle) * directBoost;
    float ambient   = ambientLevel + extraFill;

    // Blend day and night color
    // Use a smooth transition for the terminator
    float mixFactor = smoothstep(-0.2, 0.2, cosAngle);
    
    vec3 baseColor  = mix(nightColor, dayColor, mixFactor);
    vec3 color      = baseColor * (direct + ambient);

    // If it's night, add the city lights (nightColor) with higher intensity
    // but only on the dark side.
    if (useNight) {
        float nightIntensity = smoothstep(0.2, -0.2, cosAngle);
        color += nightColor * nightIntensity * 2.0; 
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Reuse the exact same shader for ALL planets (including Earth)
export function createUnifiedPlanet(radius, dayTexture, scene, isEarth = false, nightTexture = null) {
  // Reduced segments from 64 to 48 for better performance on office laptops
  const geometry = new THREE.SphereGeometry(radius, 48, 48);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: dayTexture },
      nightTexture: { value: nightTexture || new THREE.Texture() },
      useNight: { value: !!nightTexture },
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