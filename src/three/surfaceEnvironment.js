// Surface Environment Renderer
// Creates procedural planet surface environments with sky, ground, and atmosphere

import * as THREE from 'three'

/**
 * Creates a surface environment for a planet
 * Uses procedural rendering instead of loading heavy assets
 * 
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} config - Planet configuration from planetConfigs.js
 * @param {THREE.Vector3} planetPosition - Planet's position in world space
 * @param {number} planetRadius - Planet's visual radius
 * @returns {Object} Environment API
 */
export function createSurfaceEnvironment(scene, config, planetPosition, planetRadius) {
    const elements = []

    /* ─────────────────────────────
       Sky Dome (Procedural)
    ───────────────────────────── */

    function createSkyDome() {
        const skyGeo = new THREE.SphereGeometry(50000, 32, 32)

        // Custom shader for procedural sky gradient
        const skyMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(config.skyColor || '#000000') },
                bottomColor: { value: new THREE.Color(config.skyColorHorizon || '#222222') },
            },
            vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
            fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        
        void main() {
          float h = normalize(vWorldPosition).y;
          // Sky gradient from horizon (0) to zenith (1)
          float mixValue = clamp((h + 0.2) * 1.5, 0.0, 1.0);
          vec3 color = mix(bottomColor, topColor, mixValue);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
            side: THREE.BackSide,
            depthWrite: false
        })

        const skyDome = new THREE.Mesh(skyGeo, skyMat)
        skyDome.position.copy(planetPosition)
        scene.add(skyDome)
        elements.push(skyDome)

        return skyDome
    }

    /* ─────────────────────────────
       Ground Plane (Procedural)
    ───────────────────────────── */

    function createGroundPlane() {
        // Large flat plane representing the planet surface
        const groundSize = 100000
        const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, 200, 200)

        // Generate simple noise-based height variation
        const vertices = groundGeo.attributes.position
        for (let i = 0; i < vertices.count; i++) {
            const x = vertices.getX(i)
            const y = vertices.getY(i)

            // Simple pseudo-random height variation
            const noise = Math.sin(x * 0.01) * Math.cos(y * 0.01) * 50 +
                Math.sin(x * 0.05 + y * 0.05) * 20

            vertices.setZ(i, noise)
        }
        groundGeo.computeVertexNormals()

        // Ground material with planet-specific color
        const groundMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(config.groundColor || '#888888'),
            roughness: 0.9,
            metalness: 0.1,
            flatShading: false
        })

        const ground = new THREE.Mesh(groundGeo, groundMat)
        ground.rotation.x = -Math.PI / 2
        ground.position.copy(planetPosition)
        ground.position.y -= planetRadius // Place at surface level
        ground.receiveShadow = true

        scene.add(ground)
        elements.push(ground)

        return ground
    }

    /* ─────────────────────────────
       Atmospheric Fog
    ───────────────────────────── */

    function setupFog() {
        if (config.fogDensity > 0) {
            const fogColor = new THREE.Color(config.fogColor || '#cccccc')
            scene.fog = new THREE.FogExp2(fogColor, config.fogDensity)
            scene.background = fogColor.clone().multiplyScalar(0.5)
        } else {
            // No atmosphere (e.g., Moon, Mercury)
            scene.fog = null
            scene.background = new THREE.Color('#000000')
        }
    }

    /* ─────────────────────────────
       Lighting for Surface
    ───────────────────────────── */

    function setupLighting() {
        // Ambient light from planet config
        const ambient = new THREE.AmbientLight(0xffffff, config.ambientLight || 0.3)
        scene.add(ambient)
        elements.push(ambient)

        // Directional sunlight (pointing from sun at origin)
        const sunDir = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), planetPosition).normalize()
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8)
        sunLight.position.copy(sunDir).multiplyScalar(10000)
        scene.add(sunLight)
        elements.push(sunLight)

        return { ambient, sunLight }
    }

    /* ─────────────────────────────
       Stars (for airless bodies)
    ───────────────────────────── */

    function createStarField() {
        if (config.atmosphereType !== 'none') return null

        const starGeo = new THREE.BufferGeometry()
        const vertices = []

        for (let i = 0; i < 5000; i++) {
            const theta = Math.random() * Math.PI * 2
            const phi = Math.acos(Math.random() * 2 - 1)
            const r = 40000

            vertices.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            )
        }

        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
        const starMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 3,
            sizeAttenuation: false
        })

        const stars = new THREE.Points(starGeo, starMat)
        stars.position.copy(planetPosition)
        scene.add(stars)
        elements.push(stars)

        return stars
    }

    /* ─────────────────────────────
       Initialize
    ───────────────────────────── */

    const skyDome = createSkyDome()
    const ground = createGroundPlane()
    const lights = setupLighting()
    const stars = createStarField()
    setupFog()

    /* ─────────────────────────────
       Public API
    ───────────────────────────── */

    function dispose() {
        elements.forEach(el => {
            if (el.geometry) el.geometry.dispose()
            if (el.material) {
                if (Array.isArray(el.material)) {
                    el.material.forEach(m => m.dispose())
                } else {
                    el.material.dispose()
                }
            }
            scene.remove(el)
        })

        // Reset scene fog and background
        scene.fog = null
        scene.background = null
    }

    function getGroundHeight(position) {
        // For now, return the base ground level
        // Future: Could raycast to get actual terrain height at position
        return planetPosition.y - planetRadius
    }

    return {
        dispose,
        getGroundHeight,
        ground,
        skyDome,
        stars,
        elements
    }
}
