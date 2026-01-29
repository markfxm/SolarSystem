import * as THREE from 'three';

/**
 * Creates a canvas texture for a zodiac label
 */
function createLabelTexture(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 1024; // Increased from 512 to give more horizontal room
    canvas.height = 128;

    // Clear
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Style
    context.font = 'bold 80px "Inter", "Roboto", "Microsoft YaHei", sans-serif';
    context.fillStyle = 'rgba(212, 170, 255, 0.9)'; // Light purple/lavender
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Outer glow effect
    context.shadowColor = 'rgba(212, 170, 255, 0.5)';
    context.shadowBlur = 10;

    context.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
}

export function createZodiacRing(radius = 10000, initialNames = []) {
    const group = new THREE.Group();
    group.name = 'ZodiacRing';

    // 1. The main ring line
    const ringSegments = 128;
    const ringCurve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
    const points = ringCurve.getPoints(ringSegments);
    const ringGeo = new THREE.BufferGeometry().setFromPoints(points);
    const ringMat = new THREE.LineBasicMaterial({
        color: 0xd4aaff,
        transparent: true,
        opacity: 0.3,
    });
    const ringLine = new THREE.Line(ringGeo, ringMat);
    group.add(ringLine);

    const sprites = [];

    // 2. Dash/Tick marks every 30 degrees
    const tickLength = radius * 0.02;
    for (let i = 0; i < 12; i++) {
        const angle = (i * 30) * Math.PI / 180;
        const startX = Math.cos(angle) * (radius - tickLength);
        const startY = Math.sin(angle) * (radius - tickLength);
        const endX = Math.cos(angle) * (radius + tickLength);
        const endY = Math.sin(angle) * (radius + tickLength);

        const tickGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(startX, startY, 0),
            new THREE.Vector3(endX, endY, 0)
        ]);
        const tickLine = new THREE.Line(tickGeo, ringMat);
        group.add(tickLine);

        // 3. Labels
        const labelAngle = (i * 30 + 15) * Math.PI / 180; // Center label in the 30deg segment
        const labelRadius = radius * 1.05;
        const lx = Math.cos(labelAngle) * labelRadius;
        const ly = Math.sin(labelAngle) * labelRadius;

        const name = initialNames[i] || '';
        const texture = createLabelTexture(name);
        const spriteMat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.8
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(lx, ly, 0);
        // ScaleX is now 2x to maintain 8:1 ratio (radius*0.3 vs radius*0.0375)
        sprite.scale.set(radius * 0.3, radius * 0.0375, 1);
        group.add(sprite);
        sprites.push(sprite);
    }

    // Function to update labels
    group.updateLabels = (names) => {
        if (!names || names.length < 12) return;
        for (let i = 0; i < 12; i++) {
            const oldTexture = sprites[i].material.map;
            const newTexture = createLabelTexture(names[i]);
            sprites[i].material.map = newTexture;
            if (oldTexture) oldTexture.dispose();
        }
    };

    // Standard orientation: Aries starts at 0° (March 21)
    // In our coordinate system, if March 21 Sun is at 0°, the labels should match.
    // The current labels are at (i*30 + 15). 
    // If the math in AstrologyService is correct, Aries 0° is +X.
    // We already aligned Aries segment to start at 0°.

    return group;
}
