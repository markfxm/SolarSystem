import * as THREE from 'three'

/**
 * Creates a realistic Mars surface environment
 * - Sky dome with gradient shader (horizon to zenith)
 * - Sun disk
 * - Atmospheric fog (reddish haze)
 * - Infinite red ground plane
 * - Sci-fi grid and coordinate axes
 * - Procedural rocks and floating symbols
 */
export function createSimpleMarsEnvironment(scene, camera, planetPosition, planetRadius) {
    const elements = []

    /* ─────────────────────────────
       Sky Dome with Gradient Shader
    ───────────────────────────── */

    function createMartianSky() {
        const skyRadius = 50000
        const skyGeo = new THREE.SphereGeometry(skyRadius, 32, 32)

        const skyMat = new THREE.ShaderMaterial({
            uniforms: {
                horizonColor: { value: new THREE.Color('#FFB380') },
                zenithColor: { value: new THREE.Color('#D4A485') }
            },
            vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
            fragmentShader: `
        uniform vec3 horizonColor;
        uniform vec3 zenithColor;
        varying vec3 vWorldPosition;
        void main() {
          vec3 direction = normalize(vWorldPosition);
          float heightFactor = max(0.0, direction.y);
          float mixFactor = smoothstep(0.0, 0.4, heightFactor);
          vec3 skyColor = mix(horizonColor, zenithColor, mixFactor);
          gl_FragColor = vec4(skyColor, 1.0);
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
       Sun Disk
    ───────────────────────────── */

    function createSun() {
        const sunRadius = 800
        const sunGeo = new THREE.CircleGeometry(sunRadius, 32)
        const sunMat = new THREE.MeshBasicMaterial({
            color: '#FFFFEE',
            fog: false,
            depthWrite: false
        })

        const sun = new THREE.Mesh(sunGeo, sunMat)
        const sunDistance = 45000
        const sunAngle = Math.PI / 6
        sun.position.set(
            planetPosition.x + sunDistance * Math.cos(sunAngle),
            planetPosition.y + sunDistance * Math.sin(sunAngle),
            planetPosition.z - sunDistance * 0.5
        )
        sun.lookAt(camera.position)
        scene.add(sun)
        elements.push(sun)
        return sun
    }

    /* ─────────────────────────────
       Infinite Red Ground Plane & Sci-Fi Grid
    ───────────────────────────── */

    function createInfiniteGround() {
        const groundSize = 200000
        const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, 100, 100)

        const groundMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#C24D2C'),
            roughness: 0.95,
            metalness: 0.0,
            flatShading: false
        })

        const ground = new THREE.Mesh(groundGeo, groundMat)
        ground.rotation.x = -Math.PI / 2
        ground.position.copy(planetPosition)
        ground.position.y -= planetRadius
        ground.receiveShadow = true
        scene.add(ground)
        elements.push(ground)

        // 1. Bright Blue Center Axis (Z-axis) - Make it more opaque
        const centerLineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, -groundSize / 2),
            new THREE.Vector3(0, 0, groundSize / 2)
        ])
        const centerLineMat = new THREE.LineBasicMaterial({ color: 0x00A3FF, transparent: true, opacity: 1.0 })
        const centerLine = new THREE.Line(centerLineGeo, centerLineMat)
        centerLine.position.copy(ground.position)
        centerLine.position.y += 1.1
        scene.add(centerLine)
        elements.push(centerLine)

        // 2. Bright Red Cross Axis (X-axis)
        const crossLineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-groundSize / 2, 0, 0),
            new THREE.Vector3(groundSize / 2, 0, 0)
        ])
        const crossLineMat = new THREE.LineBasicMaterial({ color: 0xFF3333, transparent: true, opacity: 1.0 })
        const crossLine = new THREE.Line(crossLineGeo, crossLineMat)
        crossLine.position.copy(ground.position)
        crossLine.position.y += 1.1
        scene.add(crossLine)
        elements.push(crossLine)

        // 3. Coordinate Grid - Even Denser for better spatial awareness
        // Inner dense grid (5000 units area, every 10 units)
        const innerGridSize = 5000
        const innerGrid = new THREE.GridHelper(innerGridSize, 500, 0xFFFFFF, 0x888888) // 500 divisions = every 10 units
        innerGrid.material.transparent = true
        innerGrid.material.opacity = 0.4
        innerGrid.position.copy(ground.position)
        innerGrid.position.y += 0.6
        scene.add(innerGrid)
        elements.push(innerGrid)

        // Outer large grid (Every 1000 units)
        const outerGrid = new THREE.GridHelper(groundSize, 200, 0xAAAAAA, 0x666666)
        outerGrid.material.transparent = true
        outerGrid.material.opacity = 0.15
        outerGrid.position.copy(ground.position)
        outerGrid.position.y += 0.5
        scene.add(outerGrid)
        elements.push(outerGrid)

        // 4. Axis Labels (Numbers) - Much smaller, matching HUD (~1.2 units)
        function createAxisLabels() {
            const labelCanvas = document.createElement('canvas')
            const ctx = labelCanvas.getContext('2d')
            labelCanvas.width = 128
            labelCanvas.height = 128

            // X and Z axis labels every 20 units
            for (let i = -500; i <= 500; i += 20) {
                if (i === 0) continue

                // Texture for the number
                ctx.clearRect(0, 0, 128, 128)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
                ctx.font = 'bold 32px Inter, Arial'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText(i.toString(), 64, 64)

                const tex = new THREE.CanvasTexture(labelCanvas)
                const mat = new THREE.SpriteMaterial({ map: tex.clone(), transparent: true, opacity: 0.85 })

                // Label scale reduced to HUD size (approx 1.2 in world units)
                const labelScale = 2.4

                // Label on X axis
                const xSprite = new THREE.Sprite(mat)
                xSprite.position.set(ground.position.x + i, ground.position.y + 0.3, ground.position.z)
                xSprite.scale.set(labelScale, labelScale, 1)
                scene.add(xSprite)
                elements.push(xSprite)

                // Label on Z axis
                const zSprite = new THREE.Sprite(mat.clone())
                zSprite.position.set(ground.position.x, ground.position.y + 0.3, ground.position.z + i)
                zSprite.scale.set(labelScale, labelScale, 1)
                scene.add(zSprite)
                elements.push(zSprite)
            }
        }
        createAxisLabels()

        // 4. Glow/Flare at Horizon
        const flareGeo = new THREE.SphereGeometry(200, 32, 32)
        const flareMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.5 })
        const flare = new THREE.Mesh(flareGeo, flareMat)
        flare.position.set(planetPosition.x, ground.position.y + 5, planetPosition.z - 15000)
        scene.add(flare)
        elements.push(flare)

        return ground
    }

    /* ─────────────────────────────
       Floating Coordinate Symbols
    ───────────────────────────── */
    function createFloatingSymbols() {
        const symbolList = ['x', 'y', 'z', 'π', '+', '-', '0', '1', 'Σ', '∫']
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = 128
        canvas.height = 128

        for (let i = 0; i < 100; i++) {
            ctx.clearRect(0, 0, 128, 128)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
            ctx.font = 'bold 80px Arial'
            ctx.textAlign = 'center'
            ctx.fillText(symbolList[Math.floor(Math.random() * symbolList.length)], 64, 90)

            const texture = new THREE.CanvasTexture(canvas)
            const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.6 })
            const sprite = new THREE.Sprite(mat)

            const dist = 500 + Math.random() * 2000
            const angle = Math.random() * Math.PI * 2
            sprite.position.set(
                planetPosition.x + Math.cos(angle) * dist,
                planetPosition.y - planetRadius + 10 + Math.random() * 50,
                planetPosition.z + Math.sin(angle) * dist
            )
            sprite.scale.set(5, 5, 1)
            scene.add(sprite)
            elements.push(sprite)
        }
    }

    /* ─────────────────────────────
       Atmospheric Fog & Lighting
    ───────────────────────────── */

    function setupAtmosphericFog() {
        const fogColor = new THREE.Color('#FFB399')
        const fogDensity = 0.00002
        scene.fog = new THREE.FogExp2(fogColor, fogDensity)
    }

    function setupLighting() {
        const ambient = new THREE.AmbientLight('#FFCCAA', 0.5)
        scene.add(ambient)
        elements.push(ambient)

        const sunDir = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), planetPosition).normalize()
        const sunLight = new THREE.DirectionalLight('#FFEECC', 0.7)
        sunLight.position.copy(sunDir).multiplyScalar(10000)
        scene.add(sunLight)
        elements.push(sunLight)

        return { ambient, sunLight }
    }

    /* ─────────────────────────────
       Initialize
    ───────────────────────────── */

    const skyDome = createMartianSky()
    createSun()
    const ground = createInfiniteGround()
    setupLighting()
    setupAtmosphericFog()

    // Add floating symbols
    createFloatingSymbols()

    const groundLevel = planetPosition.y - planetRadius

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
        scene.fog = null
    }

    return {
        dispose,
        getGroundLevel: () => groundLevel,
        ground,
        skyDome,
        elements
    }
}
