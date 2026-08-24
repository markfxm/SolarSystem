import * as THREE from 'three';
import { ELEMENT_BY_INDEX } from './AstrologyService.js';

const BASE_SCALE_NORMAL = 1.25;
const BASE_SCALE_DOMINANT = 1.4;
const PULSE_FREQ_NORMAL = 1.5;
const PULSE_FREQ_DOMINANT = 3.0;
const PULSE_AMP = 0.1;

// Optimization: Hoist element index mapping to module scope to eliminate instance property lookups in 60fps update loop
const ELEMENT_TO_INDEX = { fire: 0, earth: 1, air: 2, water: 3 };

/**
 * Manages glowing "Auras" around planets based on their astrological elements.
 */
export class AuraManager {
    constructor(scene, planetObjects) {
        this.scene = scene;
        this.planetObjects = planetObjects;
        this.activeAuras = []; // Array of { name, mesh, aura, baseScale }

        this.colors = {
            fire: 0xff3300,  // Bright Red-Orange
            earth: 0x44ff22, // Vibrant Lime Green
            air: 0x00ccff,   // Electric Sky Blue
            water: 0xcc44ff  // Bright Neon Purple
        };

        // Create a circular glow texture
        this.texture = this.createGlowTexture();

        // Pre-create materials for each element to avoid per-instance allocations and updates
        this.materials = new Map();
        for (const element in this.colors) {
            this.materials.set(element, new THREE.SpriteMaterial({
                map: this.texture,
                color: this.colors[element],
                transparent: true,
                opacity: 0.7,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }));
        }

        // Default material
        const defaultMat = new THREE.SpriteMaterial({
            map: this.texture,
            color: 0xffffff,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.materials.set('default', defaultMat);

        // Optimization: Numeric indexed material array for O(1) access
        // Index mapping: 0:fire, 1:earth, 2:air, 3:water
        this.materialsByElementIndex = [
            this.materials.get('fire'),
            this.materials.get('earth'),
            this.materials.get('air'),
            this.materials.get('water')
        ];
        this.defaultMaterial = defaultMat;

        // Pre-link all planets and create their auras immediately to avoid per-frame logic
        for (const name in planetObjects) {
            const mesh = planetObjects[name];
            const aura = this.createAura(mesh);

            // Optimization: All planets use the shared unitSphereGeometry.
            // Its bounding sphere is pre-calculated at module load in geometries.js.
            const radius = mesh.geometry.boundingSphere.radius;

            this.activeAuras.push({
                name,
                mesh,
                aura,
                baseScale: radius * 3.5
            });
        }
    }

    createGlowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);

        return new THREE.CanvasTexture(canvas);
    }

    update(chart, dominantElement, isVisible) {
        if (!isVisible) {
            this.hideAll();
            return;
        }

        const time = performance.now() * 0.001;

        // Pre-calculate pulse scales to save hundreds of additions and branches in the loop
        const scaleNormal = BASE_SCALE_NORMAL + Math.sin(time * PULSE_FREQ_NORMAL) * PULSE_AMP;
        const scaleDominant = BASE_SCALE_DOMINANT + Math.sin(time * PULSE_FREQ_DOMINANT) * PULSE_AMP;

        // Optimization: Pre-resolve dominant element index using module-scoped lookup for fast comparison without 'this' property access
        const dominantIdx = ELEMENT_TO_INDEX[dominantElement] ?? -1;

        // Use a standard for loop to iterate over pre-linked aura objects
        for (let i = 0; i < this.activeAuras.length; i++) {
            const item = this.activeAuras[i];
            const info = chart[item.name];
            if (!info) continue;

            // Optimization: Use pre-calculated elementIndex directly (0: fire, 1: earth, 2: air, 3: water)
            const elementIdx = info.elementIndex ?? (info.index & 3);

            const aura = item.aura;
            // Optimization: Avoid redundant visibility updates
            if (!aura.visible) aura.visible = true;

            // Assign pre-created material based on element index (O(1) array access)
            const targetMat = this.materialsByElementIndex[elementIdx] || this.defaultMaterial;
            if (aura.material !== targetMat) {
                aura.material = targetMat;
            }

            // Dynamic pulse based on if it's the dominant element (O(1) numeric comparison)
            const targetScale = item.baseScale * (elementIdx === dominantIdx ? scaleDominant : scaleNormal);

            // Optimization: Skip Three.js property updates and matrix recalculations
            // if the target scale is already reached or the change is negligible.
            if (Math.abs(aura.scale.x - targetScale) > 0.001) {
                aura.scale.setScalar(targetScale);
                // Performance Optimization: Manually update matrix as matrixAutoUpdate is disabled.
                aura.updateMatrix();
            }
        }
    }

    createAura(mesh) {
        // Material will be set in update()
        const sprite = new THREE.Sprite(this.materials.get('default'));

        // Optimization: Set to Layer 1 to prune from standard recursive raycast passes (Layer 0).
        sprite.layers.set(1);

        // Optimization: Aura sprites are not interactive, disable raycasting to save CPU during mouse movement
        sprite.raycast = () => {};

        // Parent the aura to the mesh for 60fps synchronous movement
        mesh.add(sprite);

        // Ensure it is skipped by holographic material overrides
        sprite.userData.isPOIGroup = true;

        // Optimization: Disable per-frame matrix updates for auras as their scale
        // is manually handled in the update loop.
        sprite.matrixAutoUpdate = false;
        sprite.updateMatrix();

        return sprite;
    }

    hideAll() {
        for (let i = 0; i < this.activeAuras.length; i++) {
            this.activeAuras[i].aura.visible = false;
        }
    }

    dispose() {
        for (let i = 0; i < this.activeAuras.length; i++) {
            const aura = this.activeAuras[i].aura;
            if (aura.parent) aura.parent.remove(aura);
        }
        this.activeAuras = [];

        // Dispose pre-created materials
        for (const mat of this.materials.values()) {
            mat.dispose();
        }
        this.materials.clear();

        this.texture.dispose();
    }
}
