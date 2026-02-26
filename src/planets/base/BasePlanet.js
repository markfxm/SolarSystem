import * as THREE from 'three';
import { createLatLonGrid } from '../../utils/Grid.js';
import { createPOIMarkers } from '../../utils/POI.js';

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

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

    float direct    = max(0.0, cosAngle) * directBoost;
    float ambient   = ambientLevel + extraFill;

    float mixFactor = smoothstep(-0.2, 0.2, cosAngle);

    vec3 baseColor  = mix(nightColor, dayColor, mixFactor);
    vec3 color      = baseColor * (direct + ambient);

    if (useNight) {
        float nightIntensity = smoothstep(0.2, -0.2, cosAngle);
        color += nightColor * nightIntensity * 2.0;
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

export class BasePlanet {
  constructor(name, radius, scene) {
    this.name = name;
    this.radius = radius;
    this.scene = scene;
    this.mesh = null;
  }

  createMesh(dayTexture, nightTexture = null) {
    const geometry = new THREE.SphereGeometry(this.radius, 48, 48);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayTexture },
        nightTexture: { value: nightTexture || new THREE.Texture() },
        useNight: { value: !!nightTexture },
      },
      vertexShader,
      fragmentShader
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.userData.name = this.name;
    this.mesh.userData.originalRadius = this.radius;
    this.mesh.userData.isPlanet = true;

    this.scene.add(this.mesh);

    // Add common features
    this.addGrid();
    this.addPOIs();

    return this.mesh;
  }

  addGrid() {
    const grid = createLatLonGrid(this.radius);
    this.mesh.add(grid);
    this.mesh.userData.grid = grid;
  }

  addPOIs() {
    const pois = createPOIMarkers(this.name, this.radius);
    if (pois) {
      this.mesh.add(pois);
      this.mesh.userData.pois = pois;
    }
  }

  updateHQ(hqTexture, isNight = false) {
    if (!this.mesh || !this.mesh.material.uniforms) return;

    const target = isNight ? 'nightTexture' : 'dayTexture';
    const oldTex = this.mesh.material.uniforms[target].value;
    this.mesh.material.uniforms[target].value = hqTexture;
    if (oldTex && oldTex !== hqTexture) oldTex.dispose();
  }
}
