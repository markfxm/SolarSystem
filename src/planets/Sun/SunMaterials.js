import * as THREE from 'three'

const surfaceVertexShader = `
  varying vec2 vUv;
  varying vec3 vLocalPosition;

  void main() {
    vUv = uv;
    vLocalPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const surfaceFragmentShader = `
  uniform sampler2D map;
  uniform float time;
  varying vec2 vUv;
  varying vec3 vLocalPosition;

  // Performance Optimization: Use Hoskins hash ("Hash without Sine") to avoid
  // expensive transcendental function calls (sin) in the high-frequency shader loop.
  float hash(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float noise(vec3 point) {
    vec3 cell = floor(point);
    vec3 fraction = fract(point);
    fraction = fraction * fraction * (3.0 - 2.0 * fraction);
    return mix(
      mix(mix(hash(cell), hash(cell + vec3(1.0, 0.0, 0.0)), fraction.x),
          mix(hash(cell + vec3(0.0, 1.0, 0.0)), hash(cell + vec3(1.0, 1.0, 0.0)), fraction.x), fraction.y),
      mix(mix(hash(cell + vec3(0.0, 0.0, 1.0)), hash(cell + vec3(1.0, 0.0, 1.0)), fraction.x),
          mix(hash(cell + vec3(0.0, 1.0, 1.0)), hash(cell + vec3(1.0, 1.0, 1.0)), fraction.x), fraction.y),
      fraction.z
    );
  }

  void main() {
    vec3 surface = texture2D(map, vUv).rgb;
    vec3 samplePoint = normalize(vLocalPosition) * 11.0 + vec3(time * 0.025, -time * 0.012, 0.0);
    float granulation = noise(samplePoint) * 0.65 + noise(samplePoint * 2.07) * 0.35;
    float pulse = 0.96 + 0.04 * sin(time * 0.7 + granulation * 6.2831);
    vec3 hotColor = mix(vec3(1.0, 0.24, 0.015), vec3(1.0, 0.82, 0.24), granulation);
    vec3 color = mix(surface, hotColor, 0.16) * pulse * 1.18;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const coronaVertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const coronaFragmentShader = `
  uniform float time;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float rim = pow(1.0 - abs(dot(normal, viewDir)), 2.4);
    float shimmer = 0.9 + 0.1 * sin(time * 0.8 + normal.y * 12.0);
    float alpha = rim * shimmer * 0.62;
    vec3 color = mix(vec3(1.0, 0.18, 0.01), vec3(1.0, 0.72, 0.18), rim);
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function createSunSurfaceMaterial(texture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      time: { value: 0 }
    },
    vertexShader: surfaceVertexShader,
    fragmentShader: surfaceFragmentShader
  })
}

export function createSunCoronaMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: coronaVertexShader,
    fragmentShader: coronaFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending
  })
}
