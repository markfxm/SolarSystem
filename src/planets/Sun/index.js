import * as THREE from 'three';

export class Sun {
  constructor(radius, scene) {
    this.name = 'sun';
    this.radius = radius;
    this.scene = scene;
    this.mesh = null;
  }

  create(texture) {
    const geometry = new THREE.SphereGeometry(this.radius, 64, 64);

    // Use standard planet shaders for Sun to support fractal mode
    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vNormal;
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
            float noise = snoise(pos * 0.1 + time * 0.1);
            noise += 0.5 * snoise(pos * 0.3 + time * 0.2);
            pos += normal * noise * (radius * 0.2);
        }
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
      }
    `;

    const fragmentShader = `
      uniform sampler2D sunTexture;
      uniform bool fractalMode;
      uniform float time;
      varying vec2 vUv;
      varying vec3 vNormal;

      void main() {
        vec3 color = texture2D(sunTexture, vUv).rgb;
        if (fractalMode) {
            color = mix(color, vec4(1.0, 0.4, 0.0, 1.0).rgb, 0.4);
            color *= (1.2 + 0.2 * sin(time * 3.0));
            float edge = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
            color += vec3(1.0, 0.2, 0.0) * pow(edge, 2.0);
        }
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        sunTexture: { value: texture },
        fractalMode: { value: false },
        time: { value: 0 },
        radius: { value: this.radius }
      },
      vertexShader,
      fragmentShader
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.userData.name = this.name;
    this.mesh.userData.isSun = true;
    this.mesh.userData.isPlanet = true; // For interaction consistency
    this.mesh.name = 'sun';

    this.scene.add(this.mesh);
    return this.mesh;
  }

  updateHQ(hqTexture) {
    if (!this.mesh) return;
    const oldTex = this.mesh.material.uniforms.sunTexture.value;
    this.mesh.material.uniforms.sunTexture.value = hqTexture;
    if (oldTex && oldTex !== hqTexture) oldTex.dispose();
  }
}
