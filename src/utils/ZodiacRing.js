import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

/**
 * Creates a canvas texture for a zodiac label
 */
function createLabelTexture(text, symbol = '') {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 128;

    // Clear
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Context styles for measurement
    const symbolFont = '70px "Inter", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    const textFont = 'bold 60px "Inter", "Roboto", "Microsoft YaHei", sans-serif';

    context.fillStyle = 'rgba(160, 180, 255, 0.95)'; // Brighter celestial color
    context.textBaseline = 'middle';
    context.shadowColor = 'rgba(120, 160, 255, 0.6)';
    context.shadowBlur = 10;

    const upperText = text.toUpperCase();
    const gap = 30; // pixels between icon and text

    if (symbol) {
        // Measure text width
        context.font = textFont;
        const textMetrics = context.measureText(upperText);
        const textWidth = textMetrics.width;

        // Assume icon width is roughly 70px
        const iconWidth = 70;
        const totalWidth = iconWidth + gap + textWidth;

        // Calculate starting X to center the whole group
        const startX = (canvas.width - totalWidth) / 2;

        // Draw Symbol
        context.font = symbolFont;
        context.textAlign = 'left';
        context.fillText(symbol, startX, canvas.height / 2 + 5);

        // Draw Text
        context.font = textFont;
        context.fillText(upperText, startX + iconWidth + gap, canvas.height / 2);
    } else {
        context.font = 'bold 80px "Inter", "Roboto", "Microsoft YaHei", sans-serif';
        context.textAlign = 'center';
        context.fillText(upperText, canvas.width / 2, canvas.height / 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
}

const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

export function createZodiacRing(radius = 10000, initialNames = []) {
    const group = new THREE.Group();
    group.name = 'ZodiacRing';

    // 1. The main ring line
    const ringSegments = 128;
    const ringCurve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
    const ringPointsRaw = ringCurve.getPoints(ringSegments);
    const ringPoints = [];
    // Transform Ecliptic (XY-plane, Z-up) to World (XZ-plane, Y-up)
    ringPointsRaw.forEach(p => ringPoints.push(p.x, 0, -p.y));

    const ringGeo = new LineGeometry();
    ringGeo.setPositions(ringPoints);

    const ringMat = new LineMaterial({
        color: 0x77aaff,
        linewidth: 2.5,
        transparent: true,
        opacity: 0.6,
        depthWrite: false, // Prevents Z-fighting with other transparent objects
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
    });

    const ringLine = new Line2(ringGeo, ringMat);
    ringLine.renderOrder = 5; // Draw early
    ringLine.computeLineDistances();
    group.add(ringLine);

    // Reuse material for ticks
    const tickMat = ringMat.clone();
    tickMat.linewidth = 1.8;

    const sprites = [];

    // 2. Dash/Tick marks every 30 degrees
    const tickLength = radius * 0.02;
    for (let i = 0; i < 12; i++) {
        const angle = (i * 30) * Math.PI / 180;
        const startX = Math.cos(angle) * (radius - tickLength);
        const startY = Math.sin(angle) * (radius - tickLength);
        const endX = Math.cos(angle) * (radius + tickLength);
        const endY = Math.sin(angle) * (radius + tickLength);

        const tickGeo = new LineGeometry();
        // Transform Ecliptic (XY-plane, Z-up) to World (XZ-plane, Y-up)
        tickGeo.setPositions([startX, 0, -startY, endX, 0, -endY]);
        const tickLine = new Line2(tickGeo, tickMat);
        tickLine.renderOrder = 5;
        tickLine.computeLineDistances();
        group.add(tickLine);

        // 3. Labels
        const labelAngle = (i * 30 + 15) * Math.PI / 180; // Center label in the 30deg segment
        const labelRadius = radius * 1.05;
        const lx = Math.cos(labelAngle) * labelRadius;
        const ly = Math.sin(labelAngle) * labelRadius;

        const name = initialNames[i] || '';
        const symbol = ZODIAC_SYMBOLS[i] || '';
        const texture = createLabelTexture(name, symbol);
        const spriteMat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.8
        });
        const sprite = new THREE.Sprite(spriteMat);
        // Transform Ecliptic (XY) to World (XZ)
        // Add a small Y-offset to prevent Z-fighting with the ring plane
        sprite.position.set(lx, radius * 0.001, -ly);
        sprite.renderOrder = 10; // Draw on top
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
            const newTexture = createLabelTexture(names[i], ZODIAC_SYMBOLS[i]);
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
