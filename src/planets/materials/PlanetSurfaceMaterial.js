import * as THREE from 'three'

export const PLANET_SURFACE_PROFILES = Object.freeze({
  rocky: Object.freeze({
    kind: 'rocky',
    detailStrength: 1.35,
    roughness: 0.88,
    specularStrength: 0.08,
    oceanSpecular: 0,
    limbTint: new THREE.Color(0x000000)
  }),
  terrestrial: Object.freeze({
    kind: 'terrestrial',
    detailStrength: 0.42,
    roughness: 0.58,
    specularStrength: 0.24,
    oceanSpecular: 1,
    limbTint: new THREE.Color(0x173d66)
  }),
  gas: Object.freeze({
    kind: 'gas',
    detailStrength: 0,
    roughness: 0.72,
    specularStrength: 0.12,
    oceanSpecular: 0,
    limbTint: new THREE.Color(0x17100b)
  }),
  ice: Object.freeze({
    kind: 'ice',
    detailStrength: 0,
    roughness: 0.48,
    specularStrength: 0.2,
    oceanSpecular: 0,
    limbTint: new THREE.Color(0x16384c)
  })
})

const PROFILE_BY_PLANET = Object.freeze({
  mercury: PLANET_SURFACE_PROFILES.rocky,
  venus: PLANET_SURFACE_PROFILES.rocky,
  earth: PLANET_SURFACE_PROFILES.terrestrial,
  moon: PLANET_SURFACE_PROFILES.rocky,
  mars: PLANET_SURFACE_PROFILES.rocky,
  jupiter: PLANET_SURFACE_PROFILES.gas,
  saturn: PLANET_SURFACE_PROFILES.gas,
  uranus: PLANET_SURFACE_PROFILES.ice,
  neptune: PLANET_SURFACE_PROFILES.ice
})

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const fragmentShader = `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform bool useNight;
  uniform float detailStrength;
  uniform float roughness;
  uniform float specularStrength;
  uniform float oceanSpecular;
  uniform vec3 limbTint;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  float surfaceLuma(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
  }

  vec3 detailedNormal(vec3 surfaceNormal, float centerLuma) {
    if (detailStrength <= 0.0) return surfaceNormal;

    const vec2 texel = vec2(1.0 / 2048.0, 1.0 / 1024.0);
    float right = surfaceLuma(texture2D(dayTexture, vUv + vec2(texel.x, 0.0)).rgb);
    float up = surfaceLuma(texture2D(dayTexture, vUv + vec2(0.0, texel.y)).rgb);

    vec3 referenceAxis = abs(surfaceNormal.y) > 0.95
      ? vec3(1.0, 0.0, 0.0)
      : vec3(0.0, 1.0, 0.0);
    vec3 tangent = normalize(cross(referenceAxis, surfaceNormal));
    vec3 bitangent = normalize(cross(surfaceNormal, tangent));
    // Performance Optimization: Use forward difference with a 2x factor instead of central difference.
    // This reduces texture fetches from 5 to 3 per pixel while maintaining visual detail scale.
    vec2 gradient = vec2(right - centerLuma, up - centerLuma) * 2.0;
    return normalize(surfaceNormal - detailStrength * (gradient.x * tangent + gradient.y * bitangent));
  }

  void main() {
    vec3 dayColor = texture2D(dayTexture, vUv).rgb;
    vec3 nightColor = useNight ? texture2D(nightTexture, vUv).rgb : vec3(0.0);
    vec3 normal = detailedNormal(normalize(vNormal), surfaceLuma(dayColor));
    vec3 lightDir = normalize(-vWorldPosition);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float lightAmount = dot(normal, lightDir);
    float dayMix = smoothstep(-0.18, 0.2, lightAmount);
    float diffuse = max(lightAmount, 0.0);

    vec3 halfVector = normalize(lightDir + viewDir);
    float shininess = mix(8.0, 96.0, 1.0 - roughness);
    float specular = pow(max(dot(normal, halfVector), 0.0), shininess);
    specular *= specularStrength * smoothstep(-0.02, 0.15, lightAmount);

    float oceanMask = smoothstep(0.02, 0.22, dayColor.b - max(dayColor.r, dayColor.g));
    specular *= mix(1.0, 2.8, oceanMask * oceanSpecular);

    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    vec3 litDay = dayColor * (0.2 + diffuse * 1.45);
    litDay += vec3(specular);
    litDay += limbTint * fresnel * 0.28 * dayMix;

    float nightAmount = useNight ? smoothstep(0.16, -0.2, lightAmount) : 0.0;
    vec3 color = mix(dayColor * 0.08, litDay, dayMix);
    color += nightColor * nightAmount * 1.8;

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function getPlanetSurfaceProfile(name) {
  return PROFILE_BY_PLANET[name] || PLANET_SURFACE_PROFILES.rocky
}

export function createPlanetSurfaceMaterial(name, dayTexture, nightTexture = null) {
  const profile = getPlanetSurfaceProfile(name)

  return new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: dayTexture },
      nightTexture: { value: nightTexture || new THREE.Texture() },
      useNight: { value: Boolean(nightTexture) },
      detailStrength: { value: profile.detailStrength },
      roughness: { value: profile.roughness },
      specularStrength: { value: profile.specularStrength },
      oceanSpecular: { value: profile.oceanSpecular },
      limbTint: { value: profile.limbTint }
    },
    vertexShader,
    fragmentShader
  })
}
