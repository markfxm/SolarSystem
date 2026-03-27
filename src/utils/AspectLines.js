import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { ASPECT_TYPES, BODY_TO_ID } from './AstrologyService.js';

// Pre-allocated scratch variables to eliminate per-frame GC pressure
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _posArray = new Float32Array(6);
const _resolution = new THREE.Vector2();
const _planetsToUpdate = new Set();
const _activeKeys = new Set();

export class AspectLinesManager {
    constructor(scene, planetObjects) {
        this.scene = scene;
        this.planetObjects = planetObjects; // Map of planetId -> { mesh, etc. }
        this.group = new THREE.Group();
        this.group.name = 'AspectLines';
        this.scene.add(this.group);

        this.lines = new Map(); // Key: "p1-p2", Value: { line, aspectType }
        this.lastResolution = new THREE.Vector2(-1, -1);
    }

    update(aspects) {
        _activeKeys.clear();

        // Update resolution scratch
        const w = window.innerWidth;
        const h = window.innerHeight;
        _resolution.set(w, h);

        // Each instance tracks its own last resolution to support multi-viewport correctly
        const resChanged = this.lastResolution.x !== w || this.lastResolution.y !== h;
        if (resChanged) {
            this.lastResolution.copy(_resolution);
        }

        // Process aspects
        for (let i = 0; i < aspects.length; i++) {
            const item = aspects[i];

            // Optimized key generation using bit-shifting of body IDs.
            // This avoids constant string concatenation in the 60fps astrology loop.
            const id1 = BODY_TO_ID[item.p1];
            const id2 = BODY_TO_ID[item.p2];
            const key = id1 < id2 ? (id1 << 8) | id2 : (id2 << 8) | id1;
            _activeKeys.add(key);

            const p1Obj = this.planetObjects[item.p1];
            const p2Obj = this.planetObjects[item.p2];

            if (!p1Obj || !p2Obj) continue;

            // Performance Optimization: All planets are direct children of the scene
            // and are updated earlier in the frame by timeController.
            // Using .position directly instead of .getWorldPosition() saves matrix calculations
            // and avoids O(N) traversals per planet per aspect.
            _v1.copy(p1Obj.position);
            _v2.copy(p2Obj.position);

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
                // Optimized to only copy if resolution changed for this instance.
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
            if (!_activeKeys.has(key)) {
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
            const current = line.material.opacity;

            // Optimized: Skip redundant material updates if the target opacity is already reached
            if (Math.abs(target - current) > 0.001) {
                line.material.opacity = current + (target - current) * 0.1;
            } else if (current !== target) {
                line.material.opacity = target;
            }
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
