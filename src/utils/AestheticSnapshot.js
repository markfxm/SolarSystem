import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { computeElements, computePosition } from './Astronomy.js'

/**
 * Handles temporary transformations for a schematic "Blueprint" snapshot.
 * Features: Top-down view, fat concentric orbits, and uniform planet sizes.
 */
export class AestheticSnapshotManager {
    constructor(scene, camera, planetObjects) {
        this.scene = scene
        this.camera = camera
        this.planetObjects = planetObjects

        this.originalStates = new Map()
        this.tempOrbits = []
        this.originalCameraState = null

        // Configuration for the Blueprint layout
        this.config = {
            baseRadius: 220,    // Mercury distance
            radiusStep: 140,    // Distance between subsequent orbits
            sunScale: 1.8,      // Adjusted to 1.8 for optimal balance in snapshots
            cameraPos: new THREE.Vector3(0, 0, 4200), // Directly looking from +Z (Top-down)
            fov: 35,
            orbitThickness: 2.8, // Slightly thicker
            orbitColor: 0x00eeff, // Brighter cyan
            orbitOpacity: 0.9,   // More solid
            targetVisualSize: 25 // Target radius in world units
        }

        // Base radii from createSolarSystem.js to normalize scaling
        this.baseSizes = {
            mercury: 1.19,
            venus: 2.94,
            earth: 3.1,
            mars: 1.65,
            jupiter: 34.75,
            saturn: 29.30,
            uranus: 12.43,
            neptune: 12.03
        }
    }

    /**
     * Map planet name to its index (0-7 for Mercury-Neptune)
     */
    getPlanetIndex(name) {
        const order = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
        return order.indexOf(name)
    }

    /**
     * Calculate uniform radius for a planet based on its order
     */
    getUniformRadius(name) {
        const index = this.getPlanetIndex(name)
        if (index === -1) return 0
        return this.config.baseRadius + index * this.config.radiusStep
    }

    /**
     * Create a thick circular schematic orbit line in the XY plane using Line2.
     */
    createSchematicOrbit(radius) {
        const points = []
        const segments = 128
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2
            points.push(Math.cos(theta) * radius, Math.sin(theta) * radius, 0)
        }

        const geometry = new LineGeometry()
        geometry.setPositions(points)

        const material = new LineMaterial({
            color: this.config.orbitColor,
            linewidth: this.config.orbitThickness,
            transparent: true,
            opacity: this.config.orbitOpacity,
            depthWrite: false,
            resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
        })

        const line = new Line2(geometry, material)
        line.computeLineDistances()
        return line
    }

    apply(date) {
        this.originalStates.clear()

        // 1. Save and Override Camera
        this.originalCameraState = {
            position: this.camera.position.clone(),
            quaternion: this.camera.quaternion.clone(),
            fov: this.camera.fov,
            near: this.camera.near,
            far: this.camera.far
        }

        this.camera.position.copy(this.config.cameraPos)
        this.camera.lookAt(0, 0, 0)
        // Adjust camera up vector just in case (XY plane looking from Z)
        this.camera.up.set(0, 1, 0)
        this.camera.fov = this.config.fov
        this.camera.updateProjectionMatrix()

        // 2. Hide original orbits and HUD items
        this.scene.traverse(obj => {
            if (obj.userData?.isOrbit || obj.type === 'Line' || obj.type === 'Line2' || obj.type === 'Points') {
                if (!this.originalStates.has(obj)) {
                    this.originalStates.set(obj, { visible: obj.visible })
                }
                obj.visible = false
            }
        })

        // 3. Transform Planets
        const j2000 = Date.UTC(2000, 0, 1, 12)
        const d = (date.getTime() - j2000) / 86400000

        Object.entries(this.planetObjects).forEach(([name, mesh]) => {
            if (name === 'sun') return; // Skip sun in planetary loop

            // Save state
            this.originalStates.set(mesh, {
                position: mesh.position.clone(),
                scale: mesh.scale.clone(),
                rotation: mesh.rotation.clone()
            })

            const elements = computeElements(name, d)
            const posData = computePosition(elements, 1)

            const uniformR = this.getUniformRadius(name)
            // Flatten to XY plane (z=0)
            const unitPos = new THREE.Vector2(posData.x, posData.y).normalize()

            mesh.position.set(unitPos.x * uniformR, unitPos.y * uniformR, 0)

            // Fix planet rotation for top-down view if needed? 
            // In createSolarSystem they were rotated PI/2 around X.
            // If we look from Z, we see them from the "top".
            // That's what we want.

            // Adjust scale to reach target visual size
            const baseSize = this.baseSizes[name] || 1
            const pScale = this.config.targetVisualSize / baseSize
            mesh.scale.set(pScale, pScale, pScale)

            // Create and add schematic orbit
            const orbit = this.createSchematicOrbit(uniformR)
            // Ensure material resolution is correct for capture later
            orbit.material.resolution.set(3840, 2160) // High res for snapshot
            this.scene.add(orbit)
            this.tempOrbits.push(orbit)
        })

        // 4. Transform Sun
        const sun = this.scene.getObjectByName('sun')
        if (sun) {
            if (!this.originalStates.has(sun)) {
                this.originalStates.set(sun, {
                    scale: sun.scale.clone(),
                    position: sun.position.clone(),
                    visible: sun.visible
                })
            }
            const sScale = this.config.sunScale
            sun.scale.set(sScale, sScale, sScale)
            sun.position.set(0, 0, 0)
        }
    }

    restore() {
        this.originalStates.forEach((state, obj) => {
            if (state.position) obj.position.copy(state.position)
            if (state.scale) obj.scale.copy(state.scale)
            if (state.rotation) obj.rotation.copy(state.rotation)
            if (state.visible !== undefined) obj.visible = state.visible
        })

        if (this.originalCameraState) {
            this.camera.position.copy(this.originalCameraState.position)
            this.camera.quaternion.copy(this.originalCameraState.quaternion)
            this.camera.fov = this.originalCameraState.fov
            this.camera.updateProjectionMatrix()
        }

        this.tempOrbits.forEach(orbit => {
            this.scene.remove(orbit)
            if (orbit.geometry) orbit.geometry.dispose()
            if (orbit.material) orbit.material.dispose()
        })
        this.tempOrbits = []
    }
}
