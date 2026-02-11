import * as THREE from 'three';

/**
 * Manages glowing "Auras" around planets based on their astrological elements.
 */
export class AuraManager {
    constructor(scene, planetObjects) {
        this.scene = scene;
        this.planetObjects = planetObjects;
        this.auras = new Map(); // name -> sprite

        this.colors = {
            fire: 0xff3300,  // Bright Red-Orange
            earth: 0x44ff22, // Vibrant Lime Green
            air: 0x00ccff,   // Electric Sky Blue
            water: 0xcc44ff  // Bright Neon Purple
        };

        // Create a circular glow texture
        this.texture = this.createGlowTexture();
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

        const bodies = Object.keys(chart);
        bodies.forEach(name => {
            const mesh = this.planetObjects[name];
            if (!mesh) return;

            const signId = chart[name].signId;
            const element = this.getElement(signId);
            const color = this.colors[element] || 0xffffff;

            let aura = this.auras.get(name);
            if (!aura) {
                aura = this.createAura(name, mesh);
            }

            aura.visible = true;
            aura.material.color.set(color);

            // Dynamic pulse based on if it's the dominant element
            const time = performance.now() * 0.001;
            const pulseSpeed = (element === dominantElement) ? 3.0 : 1.5;
            const pulseBase = (element === dominantElement) ? 1.4 : 1.25;
            const scale = pulseBase + Math.sin(time * pulseSpeed) * 0.1;

            // Correctly calculate the size based on geometry radius and mesh scale
            // Cache the radius to avoid recomputing bounding sphere every frame
            if (mesh.userData.auraRadius === undefined) {
                if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
                mesh.userData.auraRadius = mesh.geometry.boundingSphere.radius;
            }
            const radius = mesh.userData.auraRadius;
            const size = radius * mesh.scale.x * scale * 3.5; // Increased from 2.5 to 3.5
            aura.scale.set(size, size, size);

            // Match position
            aura.position.copy(mesh.position);
        });
    }

    createAura(name, mesh) {
        const mat = new THREE.SpriteMaterial({
            map: this.texture,
            color: 0xffffff,
            transparent: true,
            opacity: 0.7, // Increased from 0.4 for better visibility
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(mat);
        this.scene.add(sprite);
        this.auras.set(name, sprite);
        return sprite;
    }

    hideAll() {
        this.auras.forEach(a => a.visible = false);
    }

    getElement(signId) {
        const mapping = {
            aries: 'fire', leo: 'fire', sagittarius: 'fire',
            taurus: 'earth', virgo: 'earth', capricorn: 'earth',
            gemini: 'air', libra: 'air', aquarius: 'air',
            cancer: 'water', scorpio: 'water', pisces: 'water'
        };
        return mapping[signId];
    }

    dispose() {
        this.auras.forEach(a => {
            this.scene.remove(a);
            a.material.dispose();
        });
        this.auras.clear();
        this.texture.dispose();
    }
}
