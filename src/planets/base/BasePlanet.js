import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
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
    if (!this.mesh) return;

    const applyToMaterial = (mat) => {
      if (mat && mat.uniforms) {
        const target = isNight ? 'nightTexture' : 'dayTexture';
        const oldTex = mat.uniforms[target].value;
        mat.uniforms[target].value = hqTexture;
        if (oldTex && oldTex !== hqTexture) oldTex.dispose();
      }
    };

    if (this.mesh.isMesh) {
      applyToMaterial(this.mesh.material);
    } else {
      this.mesh.traverse(child => {
        if (child.isMesh) applyToMaterial(child.material);
      });
    }
  }

  /**
   * Template for loading Blender GLB models with Day/Night switching support.
   * @param {string} url - Path to the .glb file
   * @param {THREE.Texture} dayTexture - Optional override for day texture
   * @param {THREE.Texture} nightTexture - Optional override for night texture
   */
  async loadModel(url, dayTexture = null, nightTexture = null) {
    const loader = new GLTFLoader();

    return new Promise((resolve, reject) => {
      loader.load(url, (gltf) => {
        const model = gltf.scene;

        model.traverse(child => {
          if (child.isMesh) {
            // Setup Day/Night shader for the model
            // If textures aren't provided, we try to use the ones from the GLB material
            const meshDayTex = dayTexture || child.material.map;
            const meshNightTex = nightTexture || (child.material.emissiveMap || new THREE.Texture());

            child.material = new THREE.ShaderMaterial({
              uniforms: {
                dayTexture: { value: meshDayTex },
                nightTexture: { value: meshNightTex },
                useNight: { value: true }, // Enable night lights for models by default
              },
              vertexShader,
              fragmentShader
            });

            // Ensure the model works with our interaction system
            child.userData.name = this.name;
            child.userData.isPlanet = true;
          }
        });

        // Replace placeholder mesh if it exists
        if (this.mesh) {
          // Keep common components (Grid, POIs)
          const children = [...this.mesh.children];
          children.forEach(c => {
            if (c.userData.isGrid || c.userData.isPOIGroup) {
               model.add(c);
            }
          });

          this.scene.remove(this.mesh);
        }

        this.mesh = model;
        this.mesh.userData.name = this.name;
        this.mesh.userData.isPlanet = true;
        this.mesh.userData.isModel = true; // Mark as imported model

        this.scene.add(this.mesh);
        resolve(this.mesh);
      }, undefined, (err) => {
        console.error(`Error loading model for ${this.name}:`, err);
        reject(err);
      });
    });
  }
}
