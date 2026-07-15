import * as THREE from 'three'

const layerVertexShader = `
  varying vec3 vLocalPosition;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vLocalPosition = position;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const atmosphereFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 lightDir = normalize(-vWorldPosition);
    float rim = pow(1.0 - abs(dot(normal, viewDir)), 3.2);
    float daySide = 0.18 + 0.82 * smoothstep(-0.25, 0.35, dot(normal, lightDir));
    float alpha = rim * daySide * 0.72;
    vec3 color = mix(vec3(0.08, 0.28, 0.72), vec3(0.36, 0.72, 1.0), daySide);
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const cloudFragmentShader = `
  uniform float time;
  varying vec3 vLocalPosition;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  float hash(vec3 point) {
    point = fract(point * 0.3183099 + vec3(0.17, 0.31, 0.53));
    point *= 17.0;
    return fract(point.x * point.y * point.z * (point.x + point.y + point.z));
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

  float cloudNoise(vec3 point) {
    float value = 0.0;
    value += noise(point) * 0.58;
    value += noise(point * 2.03 + 4.7) * 0.28;
    value += noise(point * 4.07 + 9.2) * 0.14;
    return value;
  }

  void main() {
    vec3 samplePoint = normalize(vLocalPosition) * 4.0;
    samplePoint += vec3(time * 0.012, 0.0, time * 0.004);
    float coverage = smoothstep(0.5, 0.68, cloudNoise(samplePoint));
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(-vWorldPosition);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float daySide = 0.22 + 0.78 * smoothstep(-0.2, 0.3, dot(normal, lightDir));
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);
    float alpha = coverage * (0.34 + rim * 0.16) * daySide;
    gl_FragColor = vec4(vec3(0.92, 0.96, 1.0) * daySide, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function createEarthAtmosphereMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: layerVertexShader,
    fragmentShader: atmosphereFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending
  })
}

export function createEarthCloudMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: layerVertexShader,
    fragmentShader: cloudFragmentShader,
    transparent: true,
    depthWrite: false
  })
}
