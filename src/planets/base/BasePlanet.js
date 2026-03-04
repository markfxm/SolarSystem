import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createLatLonGrid } from '../../utils/Grid.js';
import { createPOIMarkers } from '../../utils/POI.js';

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  uniform bool fractalMode;
  uniform float time;
  uniform float radius;

  // Simple 3D Noise for fractal displacement
  float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
  vec3 mod289(vec3 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
  vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
  vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float snoise(vec3 v){
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vUv = uv;
    vec3 pos = position;

    if (fractalMode) {
        // Apply 3.26D displacement (Infinite folding/roughness)
        float noise = snoise(pos * 0.15 + time * 0.2);
        noise += 0.5 * snoise(pos * 0.4 + time * 0.5);
        noise += 0.25 * snoise(pos * 1.0 + time * 1.0);
        pos += normal * noise * (radius * 0.15);
    }

    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const fragmentShader = `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform bool useNight;
  uniform bool fractalMode;
  uniform float time;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  const float directBoost  = 1.5;
  const float ambientLevel = 0.15;
  const float extraFill    = 0.1;

  void main() {
    vec3 dayColor   = texture2D(dayTexture, vUv).rgb;
    vec3 nightColor = useNight ? texture2D(nightTexture, vUv).rgb : vec3(0.0);

    if (fractalMode) {
        // Shift colors towards "neural/energy" theme
        dayColor = mix(dayColor, vec3(0.1, 0.5, 1.0), 0.3);
        // Add flickering energy glow
        dayColor *= (1.0 + 0.1 * sin(time * 2.0));
    }

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

    if (fractalMode) {
        // Highlighting the fractal ridges
        float edge = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
        color += vec3(0.0, 0.6, 1.0) * pow(edge, 3.0) * 0.5;
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
    const geometry = new THREE.SphereGeometry(this.radius, 64, 64); // Higher detail for fractal mode
    const material = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayTexture },
        nightTexture: { value: nightTexture || new THREE.Texture() },
        useNight: { value: !!nightTexture },
        fractalMode: { value: false },
        time: { value: 0 },
        radius: { value: this.radius }
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
                fractalMode: { value: false },
                time: { value: 0 },
                radius: { value: this.radius }
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
