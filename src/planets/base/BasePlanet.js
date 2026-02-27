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
    // this.mesh now acts as the main container for the planet (a Group)
    this.mesh = new THREE.Group();
    this.mesh.userData.name = this.name;
    this.mesh.userData.isPlanet = true;
    this.mesh.userData.radius = this.radius;
    this.scene.add(this.mesh);

    this.planetBody = null; // The actual mesh (sphere or model)
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

    this.planetBody = new THREE.Mesh(geometry, material);
    this.planetBody.userData.name = this.name;
    this.planetBody.userData.originalRadius = this.radius;
    this.planetBody.userData.isPlanetBody = true;

    this.mesh.add(this.planetBody);

    // Add common features
    this.addGrid();
    this.addPOIs();

    return this.mesh;
  }

  addGrid() {
    if (this.mesh.userData.grid) return;
    const grid = createLatLonGrid(this.radius);
    this.mesh.add(grid);
    this.mesh.userData.grid = grid;
  }

  addPOIs() {
    if (this.mesh.userData.pois) return;
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

    this.mesh.traverse(child => {
      if (child.isMesh && child.material && child.material.uniforms) {
        applyToMaterial(child.material);
      }
    });
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

        // Center and Auto-scale model to fit the desired radius
        const box = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box.getCenter(center);
        model.position.sub(center); // Center the model's geometry

        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = (this.radius * 2) / maxDim;
        model.scale.multiplyScalar(scale); // Apply scale on top of existing scale

        model.traverse(child => {
          if (child.isMesh) {
            // Ensure the geometry has normals for the shader to work
            if (!child.geometry.attributes.normal) {
              child.geometry.computeVertexNormals();
            }

            // Setup Day/Night shader for the model
            const meshDayTex = dayTexture || child.material.map || new THREE.Texture();
            const meshNightTex = nightTexture || (child.material.emissiveMap || new THREE.Texture());

            child.material = new THREE.ShaderMaterial({
              uniforms: {
                dayTexture: { value: meshDayTex },
                nightTexture: { value: meshNightTex },
                useNight: { value: !!nightTexture || !!child.material.emissiveMap },
              },
              vertexShader,
              fragmentShader
            });

            // Ensure the model works with our interaction system
            child.userData.name = this.name;
            child.userData.isPlanet = true;
            child.userData.isPlanetBody = true;
          }
        });

        // Remove old body if it exists
        if (this.planetBody) {
          this.mesh.remove(this.planetBody);
        }

        this.planetBody = model;
        this.mesh.add(this.planetBody);
        this.mesh.userData.isModel = true;

        // Add common features if not already added
        if (!this.mesh.userData.grid) this.addGrid();
        if (!this.mesh.userData.pois) this.addPOIs();

        resolve(this.mesh);
      }, undefined, (err) => {
        console.error(`Error loading model for ${this.name}:`, err);
        reject(err);
      });
    });
  }
}
