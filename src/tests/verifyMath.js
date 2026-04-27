import { computeElements, computePosition } from '../utils/Astronomy.js';

// Mock THREE as minimal as possible for Astronomy.js
const THREE = {
    Quaternion: class {
        constructor() { this._x = 0; this._y = 0; this._z = 0; this._w = 1; }
        identity() { return this; }
        setFromAxisAngle() { return this; }
        copy() { return this; }
        multiply() { return this; }
        set() { return this; }
    },
    Vector3: class {
        constructor() { this.x = 0; this.y = 0; this.z = 0; }
        set() { return this; }
    }
};

// We need to bypass the import in Astronomy.js if we run it in Node without a bundler
// But since I'm running in the sandbox, maybe I can just provide a mock.
// Actually, I'll use a trick: create a mock three.js in node_modules if needed, or just run it and see.

async function runTest() {
    console.log("Starting Math Verification...");

    // Test a known planet: Mars
    const d = 0; // J2000
    const elements = computeElements('mars', d);

    console.log("Mars Elements at J2000:", {
        a: elements.a,
        e: elements.e,
        i: elements.i,
        M: elements.M
    });

    const pos = computePosition(elements, 1);
    console.log("Mars Position at J2000:", pos);

    // Verify if Y uses QyAS (correct) instead of QxAS (previous bug)
    // For Mars at J2000:
    // M = 18.6021 deg = 0.3246 rad
    // e = 0.093405
    // Kepler: E - 0.0934 * sinE = 0.3246 => E approx 0.358 rad
    // x = PxA * cosE - PxAe + QxAS * sinE
    // y = PyA * cosE - PyAe + QyAS * sinE

    // If y used QxAS, and QxAS is different from QyAS, results would be wrong.
    console.log("Gaussian Constants:", {
        PxA: elements.PxA,
        PyA: elements.PyA,
        QxAS: elements.QxAS,
        QyAS: elements.QyAS
    });

    if (elements.QxAS === elements.QyAS) {
        console.log("WARNING: QxAS and QyAS are identical for this test case, choose another planet or time.");
    } else {
        console.log("QxAS and QyAS are distinct. Verification of fix is possible.");
    }

    // Check if r is correct
    const calculatedR = Math.sqrt(pos.x*pos.x + pos.y*pos.y + pos.z*pos.z);
    console.log("Calculated R:", calculatedR);
    console.log("Position R property:", pos.r);

    if (Math.abs(calculatedR - pos.r) < 0.001) {
        console.log("✅ Position R property matches calculated distance.");
    } else {
        console.log("❌ Position R property mismatch!");
    }

    // Test Moon (Special scaling check)
    const moonEl = computeElements('moon', d);
    const moonPos = computePosition(moonEl, 1);
    const moonR = Math.sqrt(moonPos.x**2 + moonPos.y**2 + moonPos.z**2);
    console.log("Moon Position at J2000:", moonPos);
    console.log("Moon calculated R:", moonR);
    if (Math.abs(moonR - moonPos.r) < 0.001) {
        console.log("✅ Moon R property matches.");
    } else {
        console.log("❌ Moon R property mismatch!");
    }

    console.log("Math Verification Complete.");
}

runTest().catch(console.error);
