import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { ASPECT_TYPES } from './AstrologyService.js';

// Pre-allocated scratch variables to eliminate per-frame GC pressure
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _posArray = new Float32Array(6);
const _resolution = new THREE.Vector2();
const _planetsToUpdate = new Set();

export class AspectLinesManager {
    constructor(scene, planetObjects) {
        this.scene = scene;
        this.planetObjects = planetObjects; // Map of planetId -> { mesh, etc. }
        this.group = new THREE.Group();
        this.group.name = 'AspectLines';
        this.scene.add(this.group);

        this.lines = new Map(); // Key: "p1-p2", Value: { line, aspectType }
    }

    update(aspects) {
        const activeKeys = new Set();

        // Only update resolution scratch and individual materials if window size actually changed
        const w = window.innerWidth;
        const h = window.innerHeight;
        const resChanged = _resolution.x !== w || _resolution.y !== h;
        if (resChanged) {
            _resolution.set(w, h);
        }

        // Pre-update matrices for all planets involved to ensure sync and avoid redundant calculations
        // Reuse scratch Set to avoid per-frame allocations
        _planetsToUpdate.clear();
        for (let i = 0; i < aspects.length; i++) {
            _planetsToUpdate.add(aspects[i].p1);
            _planetsToUpdate.add(aspects[i].p2);
        }
        for (const name of _planetsToUpdate) {
            const obj = this.planetObjects[name];
            if (obj) obj.updateMatrixWorld();
        }

        // Process aspects
        for (let i = 0; i < aspects.length; i++) {
            const item = aspects[i];

            // Robust key generation that doesn't rely on input order but avoids array allocation
            const key = item.p1 < item.p2 ? item.p1 + '-' + item.p2 : item.p2 + '-' + item.p1;
            activeKeys.add(key);

            const p1Obj = this.planetObjects[item.p1];
            const p2Obj = this.planetObjects[item.p2];

            if (!p1Obj || !p2Obj) continue;

            // Use getWorldPosition with scratch variables for robustness and performance
            p1Obj.getWorldPosition(_v1);
            p2Obj.getWorldPosition(_v2);

            if (!this.lines.has(key)) {
                // Create new line using Line2
                const geometry = new LineGeometry();
                _posArray[0] = _v1.x; _posArray[1] = _v1.y; _posArray[2] = _v1.z;
                _posArray[3] = _v2.x; _posArray[4] = _v2.y; _posArray[5] = _v2.z;
                geometry.setPositions(_posArray);

                const material = new LineMaterial({
                    color: item.aspect.color,
                    linewidth: 2.0, // Artistic thickness
                    transparent: true,
                    opacity: 0,
                    resolution: _resolution
                });

                const line = new Line2(geometry, material);
                line.renderOrder = 6; // Draw above ring but below labels

                // Add metadata for animation
                line.userData = {
                    targetOpacity: 0.6,
                    aspectType: item.aspect.type
                };

                this.group.add(line);
                this.lines.set(key, { line, aspectType: item.aspect.type });
            } else {
                // Update position of existing line
                const data = this.lines.get(key);
                _posArray[0] = _v1.x; _posArray[1] = _v1.y; _posArray[2] = _v1.z;
                _posArray[3] = _v2.x; _posArray[4] = _v2.y; _posArray[5] = _v2.z;
                data.line.geometry.setPositions(_posArray);

                // LineMaterial requires resolution update to correctly handle window resizing.
                // Optimized to only copy if resolution changed.
                if (resChanged) {
                    data.line.material.resolution.copy(_resolution);
                }

                // If aspect type changed (possible with moving orbs), update color
                if (data.aspectType !== item.aspect.type) {
                    data.line.material.color.set(item.aspect.color);
                    data.aspectType = item.aspect.type;
                }
            }
        }

        // Cleanup and Animation loop
        for (const [key, data] of this.lines) {
            if (!activeKeys.has(key)) {
                data.line.userData.targetOpacity = 0;
                // Dispose once fully faded
                if (data.line.material.opacity <= 0.01) {
                    this.group.remove(data.line);
                    data.line.geometry.dispose();
                    data.line.material.dispose();
                    this.lines.delete(key);
                    continue;
                }
            } else {
                data.line.userData.targetOpacity = 0.6;
            }

            // Animate opacity (Linear interpolation)
            const line = data.line;
            const target = line.userData.targetOpacity;
            line.material.opacity += (target - line.material.opacity) * 0.1;
        }
    }

    setVisible(visible) {
        this.group.visible = visible;
    }

    dispose() {
        this.scene.remove(this.group);
        for (const data of this.lines.values()) {
            data.line.geometry.dispose();
            data.line.material.dispose();
        }
        this.lines.clear();
    }
}
