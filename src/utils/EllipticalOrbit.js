import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { TWO_PI } from './Astronomy.js';
/**
 * Creates a perfect elliptical orbit line.
 * Optimized: Sweeps Eccentric Anomaly (E) directly instead of Mean Anomaly (M)
 * to eliminate the iterative Kepler solver. Uses pre-scaled Gaussian constants for
 * coordinate transformation, matching the high-performance logic in Astronomy.js.
 */
export function createEllipticalOrbit(elements, segments = 512, color = 0xd4aaff, opacity = 0.88) {
    // Use Float32Array for better memory efficiency and performance with LineGeometry
    const points = new Float32Array((segments + 1) * 3);
    const { e, PxA, PyA, PzA, QxAS, QyAS, QzAS } = elements;
    const step = TWO_PI / segments;
    for (let k = 0; k <= segments; k++) {
        // Optimization: Sweep Eccentric Anomaly (E) directly from 0 to 2π.
        // This eliminates ~1,500 iterative Kepler solver calls per orbit initialization.
        // It also results in a more uniform point distribution for high-eccentricity orbits.
        const E = k * step;
        const cosE = Math.cos(E);
        const sinE = Math.sin(E);
        // Transform directly to World space using pre-calculated combined coefficients
        // Optimized: Factored formula pos = PxA * (cosE - e) + QxAS * sinE.
        // Gaussian constants (PxA, QxAS, etc.) are already pre-multiplied by scale AND
        // pre-swapped into World space (X_world = X_ecl, Y_world = Z_ecl, Z_world = -Y_ecl) in Astronomy.js.
        const cosEmE = cosE - e;
        const idx = k * 3;
        points[idx] = PxA * cosEmE + QxAS * sinE;
        points[idx + 1] = PyA * cosEmE + QyAS * sinE;
        points[idx + 2] = PzA * cosEmE + QzAS * sinE;
    }
    const geometry = new LineGeometry();
    geometry.setPositions(points);
    const material = new LineMaterial({
        color: new THREE.Color(color).getHex(),
        linewidth: 1.2, // pixels
        transparent: true,
        opacity: opacity,
        dashed: false,
        alphaToCoverage: true,
        depthWrite: false,
        worldUnits: false // important for constant pixel width
    });
    // Set resolution later in SolarSystem.vue
    material.resolution.set(window.innerWidth, window.innerHeight);
    const orbitLine = new Line2(geometry, material);
    // Optimization: Orbit lines are not interactive, disable raycasting to save CPU during mouse movement
    orbitLine.raycast = () => { };
    // Optimization: Orbit lines are static relative to the solar system, disable per-frame matrix updates.
    orbitLine.matrixAutoUpdate = false;
    orbitLine.updateMatrix();
    orbitLine.computeLineDistances();
    orbitLine.userData.isOrbit = true;
    return orbitLine;
}
//# sourceMappingURL=EllipticalOrbit.js.map