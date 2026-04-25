import * as THREE from 'three';

// Minimal mock for environment
if (typeof global !== 'undefined') {
    global.window = { innerWidth: 1920, innerHeight: 1080 };
}

function runBenchmark() {
    console.log("⚡ Bolt: Starting Raycast Performance Benchmark...");

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const raycaster = new THREE.Raycaster();
    // Ray aiming at center
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const planets = [];

    // Create 10 planets, each with complex attachments
    for (let p = 0; p < 10; p++) {
        const planet = new THREE.Mesh(
            new THREE.SphereGeometry(1, 48, 48),
            new THREE.MeshBasicMaterial()
        );
        planet.position.x = (p - 5) * 3;
        planet.updateMatrixWorld();

        // 1. Atmosphere (un-optimized)
        const atmos = new THREE.Mesh(
            new THREE.SphereGeometry(1.05, 48, 48),
            new THREE.MeshBasicMaterial({ side: THREE.BackSide })
        );
        planet.add(atmos);

        // 2. Grid (simulate complex grid with many lines)
        const gridGroup = new THREE.Group();
        for (let i = 0; i < 20; i++) {
            const line = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 0, 0)]),
                new THREE.LineBasicMaterial()
            );
            gridGroup.add(line);
        }
        planet.add(gridGroup);

        // 3. POIs (simulate many POI markers)
        const poiGroup = new THREE.Group();
        for (let i = 0; i < 10; i++) {
            const poi = new THREE.Group();
            poi.add(new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), new THREE.MeshBasicMaterial()));
            poi.add(new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2), new THREE.MeshBasicMaterial()));
            poiGroup.add(poi);
        }
        planet.add(poiGroup);

        planets.push(planet);
    }

    const iterations = 5000;

    // --- BASELINE ---
    console.log(`\nScenario 1: Baseline (Recursive Raycast on all children)`);
    let start = performance.now();
    for (let i = 0; i < iterations; i++) {
        raycaster.intersectObjects(planets, true);
    }
    let end = performance.now();
    const baselineTime = end - start;
    console.log(`Time: ${baselineTime.toFixed(2)}ms`);

    // --- OPTIMIZE ATMOSPHERE ---
    planets.forEach(p => {
        p.children[0].raycast = () => {}; // Atmosphere is first child
    });

    console.log(`\nScenario 2: Atmosphere Raycasting Disabled`);
    start = performance.now();
    for (let i = 0; i < iterations; i++) {
        raycaster.intersectObjects(planets, true);
    }
    end = performance.now();
    const atmosOptTime = end - start;
    console.log(`Time: ${atmosOptTime.toFixed(2)}ms (${((1 - atmosOptTime / baselineTime) * 100).toFixed(1)}% faster)`);

    // --- OPTIMIZE GRID & POI ---
    planets.forEach(p => {
        p.children[1].raycast = () => {}; // Grid
        p.children[2].raycast = () => {}; // POIs
    });

    console.log(`\nScenario 3: All decorative elements Disabled (Atmosphere, Grid, POIs)`);
    start = performance.now();
    for (let i = 0; i < iterations; i++) {
        raycaster.intersectObjects(planets, true);
    }
    end = performance.now();
    const allOptTime = end - start;
    console.log(`Time: ${allOptTime.toFixed(2)}ms (${((1 - allOptTime / baselineTime) * 100).toFixed(1)}% total faster)`);

    console.log("\n⚡ Bolt: Benchmark complete.");
}

runBenchmark();
