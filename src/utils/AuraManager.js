import * as THREE from 'three';
import { ZODIAC_ELEMENTS } from './AstrologyService.js';

/**
 * Manages glowing "Auras" around planets based on their astrological elements.
 */
export class AuraManager {
    constructor(scene, planetObjects) {
        this.scene = scene;
        this.planetObjects = planetObjects;
        this.planetNames = Object.keys(planetObjects);
        this.auras = new Map(); // name -> sprite

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
        this.materials.set('default', new THREE.SpriteMaterial({
            map: this.texture,
            color: 0xffffff,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
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

        // Pre-calculate pulse values to save thousands of Math.sin calls in aggregate
        const pulseNormal = Math.sin(time * 1.5) * 0.1;
        const pulseDominant = Math.sin(time * 3.0) * 0.1;

        // Use a standard for loop to avoid object property lookup/iteration overhead
        for (let i = 0; i < this.planetNames.length; i++) {
            const name = this.planetNames[i];
            const mesh = this.planetObjects[name];
            if (!mesh || !chart[name]) continue;

            const signId = chart[name].signId;
            const element = ZODIAC_ELEMENTS[signId];

            let aura = this.auras.get(name);
            if (!aura) {
                aura = this.createAura(name, mesh);
            }

            aura.visible = true;

            // Assign pre-created material based on element
            const targetMat = this.materials.get(element) || this.materials.get('default');
            if (aura.material !== targetMat) {
                aura.material = targetMat;
            }

            // Dynamic pulse based on if it's the dominant element
            const isDominant = element === dominantElement;
            const pulseBase = isDominant ? 1.4 : 1.25;
            const scale = pulseBase + (isDominant ? pulseDominant : pulseNormal);

            // Correctly calculate the size based on geometry radius
            // Cache the radius to avoid recomputing bounding sphere every frame
            if (mesh.userData.auraRadius === undefined) {
                if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
                mesh.userData.auraRadius = mesh.geometry.boundingSphere.radius;
            }
            const radius = mesh.userData.auraRadius;

            // Since the aura is now a child of the mesh, it inherits the mesh's scale.
            // We set the aura's local scale relative to the mesh radius.
            aura.scale.setScalar(radius * scale * 3.5);
        }
    }

    createAura(name, mesh) {
        // Material will be set in update()
        const sprite = new THREE.Sprite(this.materials.get('default'));

        // Parent the aura to the mesh for 60fps synchronous movement
        mesh.add(sprite);

        // Ensure it is skipped by holographic material overrides
        sprite.userData.isPOIGroup = true;

        this.auras.set(name, sprite);
        return sprite;
    }

    hideAll() {
        for (const a of this.auras.values()) {
            a.visible = false;
        }
    }

    dispose() {
        for (const a of this.auras.values()) {
            if (a.parent) a.parent.remove(a);
        }
        this.auras.clear();

        // Dispose pre-created materials
        for (const mat of this.materials.values()) {
            mat.dispose();
        }
        this.materials.clear();

        this.texture.dispose();
    }
}
