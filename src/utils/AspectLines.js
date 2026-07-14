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

export class AspectLinesManager {
    constructor(scene, planetObjects) {
        this.scene = scene;
        this.planetObjects = planetObjects; // Map of planetId -> { mesh, etc. }
        this.group = new THREE.Group();
        this.group.name = 'AspectLines';

        // Optimization: Aspect lines group is static relative to the scene origin.
        // Disabling matrixAutoUpdate skips redundant matrix recalculations every frame.
        this.group.matrixAutoUpdate = false;
        this.group.updateMatrix();

        this.scene.add(this.group);

        this.lines = new Map(); // Key: bit-shifted ID, Value: { line, aspectType, lastUpdateFrame, p1Obj, p2Obj, attr, array }
        this.lastResolution = new THREE.Vector2(-1, -1);
        this.frameID = 0;
    }

    update(aspects) {
        this.frameID++;

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
            if (id1 === undefined || id2 === undefined) continue;
            const key = id1 < id2 ? (id1 << 8) | id2 : (id2 << 8) | id1;

            // Optimization: Single Map.get() call to minimize lookups
            let data = this.lines.get(key);

            if (!data) {
                const p1Obj = this.planetObjects[item.p1];
                const p2Obj = this.planetObjects[item.p2];
                if (!p1Obj || !p2Obj) continue;

                _v1.copy(p1Obj.position);
                _v2.copy(p2Obj.position);

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
                line.raycast = () => {};
                line.renderOrder = 6;
                line.matrixAutoUpdate = false;
                line.updateMatrix();
                line.frustumCulled = false;

                // Add metadata for animation
                line.userData = {
                    targetOpacity: 0.6,
                    aspectType: item.aspect.type
                };

                this.group.add(line);

                // Performance Optimization: Cache frequently used objects and attributes
                // to avoid deep property lookups and Map access in the hot path.
                const attr = line.geometry.attributes.instanceStart;
                data = {
                    key,
                    line,
                    aspectType: item.aspect.type,
                    lastUpdateFrame: this.frameID,
                    p1Obj,
                    p2Obj,
                    attr,
                    array: attr.data.array
                };
                this.lines.set(key, data);
            } else {
                // Performance Optimization: Use cached object references (p1Obj, p2Obj, attr, array)
                // to eliminate Map/Object lookups and property chains (60fps).
                data.lastUpdateFrame = this.frameID;
                const { line, p1Obj, p2Obj, attr, array } = data;

                _v1.copy(p1Obj.position);
                _v2.copy(p2Obj.position);

                const moved =
                    Math.abs(array[0] - _v1.x) > 1e-5 || Math.abs(array[1] - _v1.y) > 1e-5 || Math.abs(array[2] - _v1.z) > 1e-5 ||
                    Math.abs(array[3] - _v2.x) > 1e-5 || Math.abs(array[4] - _v2.y) > 1e-5 || Math.abs(array[5] - _v2.z) > 1e-5;

                if (moved) {
                    array[0] = _v1.x; array[1] = _v1.y; array[2] = _v1.z;
                    array[3] = _v2.x; array[4] = _v2.y; array[5] = _v2.z;
                    attr.data.needsUpdate = true;
                }

                if (resChanged) {
                    line.material.resolution.copy(_resolution);
                }

                if (data.aspectType !== item.aspect.type) {
                    line.material.color.set(item.aspect.color);
                    data.aspectType = item.aspect.type;
                }
            }
        }

        // Cleanup and Animation loop
        for (const data of this.lines.values()) {
            // Performance Optimization: Use frameID dirty-checking instead of Set clear/populate.
            // This reduces GC pressure and O(N) Set operations per frame.
            if (data.lastUpdateFrame !== this.frameID) {
                data.line.userData.targetOpacity = 0;
                // Dispose once fully faded
                if (data.line.material.opacity <= 0.01) {
                    this.group.remove(data.line);
                    data.line.geometry.dispose();
                    data.line.material.dispose();
                    this.lines.delete(data.key);
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
