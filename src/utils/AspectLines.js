import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { ASPECT_TYPES } from './AstrologyService.js';

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

        aspects.forEach(item => {
            const key = [item.p1, item.p2].sort().join('-');
            activeKeys.add(key);

            const p1Obj = this.planetObjects[item.p1];
            const p2Obj = this.planetObjects[item.p2];

            if (!p1Obj || !p2Obj) return;

            p1Obj.updateMatrixWorld();
            p2Obj.updateMatrixWorld();
            const pos1 = new THREE.Vector3().setFromMatrixPosition(p1Obj.matrixWorld);
            const pos2 = new THREE.Vector3().setFromMatrixPosition(p2Obj.matrixWorld);

            if (!this.lines.has(key)) {
                // Create new line using Line2
                const geometry = new LineGeometry();
                geometry.setPositions([pos1.x, pos1.y, pos1.z, pos2.x, pos2.y, pos2.z]);

                const material = new LineMaterial({
                    color: item.aspect.color,
                    linewidth: 2.0, // Artistic thickness
                    transparent: true,
                    opacity: 0,
                    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
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
                data.line.geometry.setPositions([pos1.x, pos1.y, pos1.z, pos2.x, pos2.y, pos2.z]);

                // If aspect type changed (rare but possible with orbs), update color
                if (data.aspectType !== item.aspect.type) {
                    data.line.material.color.set(item.aspect.color);
                    data.aspectType = item.aspect.type;
                }
            }
        });

        // Remove/Fade out inactive lines
        for (const [key, data] of this.lines.entries()) {
            if (!activeKeys.has(key)) {
                data.line.userData.targetOpacity = 0;
                if (data.line.material.opacity <= 0.01) {
                    this.group.remove(data.line);
                    data.line.geometry.dispose();
                    data.line.material.dispose();
                    this.lines.delete(key);
                }
            } else {
                data.line.userData.targetOpacity = 0.6;
            }
        }

        // Animate opacity
        this.lines.forEach(data => {
            const line = data.line;
            const target = line.userData.targetOpacity;
            line.material.opacity += (target - line.material.opacity) * 0.1;
        });
    }

    setVisible(visible) {
        this.group.visible = visible;
    }

    dispose() {
        this.scene.remove(this.group);
        this.lines.forEach(data => {
            data.line.geometry.dispose();
            data.line.material.dispose();
        });
        this.lines.clear();
    }
}
