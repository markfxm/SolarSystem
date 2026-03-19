import * as THREE from 'three';
import { createLatLonGrid } from '../../utils/Grid.js';
import { createPOIMarkers } from '../../utils/POI.js';
import { createHolographicMaterial } from '../../utils/HolographicMaterial';

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

// Shared unit geometry for all planets to reduce memory usage and GPU state changes
const unitSphereGeometry = new THREE.SphereGeometry(1, 48, 48);

export class BasePlanet {
  constructor(name, radius, scene) {
    this.name = name;
    this.radius = radius;
    this.scene = scene;
    this.mesh = null;
    this.originalMaterial = null;
    this.holographicMaterial = null;
    this.isHolographic = false;
  }

  createMesh(dayTexture, nightTexture = null) {
    // Optimized: Use shared unit geometry and scale the mesh by this.radius
    const material = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayTexture },
        nightTexture: { value: nightTexture || new THREE.Texture() },
        useNight: { value: !!nightTexture },
      },
      vertexShader,
      fragmentShader
    });

    this.originalMaterial = material;
    this.mesh = new THREE.Mesh(unitSphereGeometry, material);
    this.mesh.scale.setScalar(this.radius);

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
    // Pass 1.0 since it's added as a child of the scaled planet mesh
    const grid = createLatLonGrid(1.0);
    this.mesh.add(grid);
    this.mesh.userData.grid = grid;
  }

  addPOIs() {
    // Pass 1.0 since it's added as a child of the scaled planet mesh
    const pois = createPOIMarkers(this.name, 1.0);
    if (pois) {
      this.mesh.add(pois);
      this.mesh.userData.pois = pois;
    }
  }

  updateHQ(hqTexture, isNight = false) {
    if (!this.mesh || !this.mesh.material || !this.mesh.material.uniforms) return;

    const target = isNight ? 'nightTexture' : 'dayTexture';
    const oldTex = this.mesh.material.uniforms[target].value;
    this.mesh.material.uniforms[target].value = hqTexture;
    if (oldTex && oldTex !== hqTexture) oldTex.dispose();
  }

  setHolographic(enabled) {
    this.isHolographic = enabled;
    if (!this.mesh) return;

    if (enabled) {
      if (!this.holographicMaterial) {
        this.holographicMaterial = createHolographicMaterial();
      }

      if (!this.mesh.userData.originalMaterial) {
        this.mesh.userData.originalMaterial = this.mesh.material;
      }
      this.mesh.material = this.holographicMaterial;
    } else {
      if (this.mesh.userData.originalMaterial) {
        this.mesh.material = this.mesh.userData.originalMaterial;
      }
    }
  }
}
