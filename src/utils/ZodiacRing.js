import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';

// Module-level caches and scratch variables to reuse across the application
const textureCache = new Map();
const materialCache = new Map();
const resolution = typeof window !== 'undefined'
    ? new THREE.Vector2(window.innerWidth, window.innerHeight)
    : new THREE.Vector2(1024, 768);

// Optimization: Pre-calculated Trigonometric Lookup Tables (LUTs)
// Eliminates 153 trigonometric calls (Math.cos/Math.sin) per createZodiacRing invocation.
const RING_SEGMENTS = 128;
const RING_STEP = (Math.PI * 2) / RING_SEGMENTS;
const RING_TRIG = new Float32Array((RING_SEGMENTS + 1) * 2);
for (let i = 0; i <= RING_SEGMENTS; i++) {
    const theta = i * RING_STEP;
    RING_TRIG[i * 2] = Math.cos(theta);
    RING_TRIG[i * 2 + 1] = Math.sin(theta);
}

const TICK_STEP = (30 * Math.PI) / 180;
const TICK_TRIG = new Float32Array(12 * 2);
for (let i = 0; i < 12; i++) {
    const angle = i * TICK_STEP;
    TICK_TRIG[i * 2] = Math.cos(angle);
    TICK_TRIG[i * 2 + 1] = Math.sin(angle);
}

const LABEL_ANGLE_OFFSET = (15 * Math.PI) / 180;
const LABEL_TRIG = new Float32Array(12 * 2);
for (let i = 0; i < 12; i++) {
    const labelAngle = i * TICK_STEP + LABEL_ANGLE_OFFSET;
    LABEL_TRIG[i * 2] = Math.cos(labelAngle);
    LABEL_TRIG[i * 2 + 1] = Math.sin(labelAngle);
}

/**
 * Creates a canvas texture for a zodiac label
 */
function createLabelTexture(text, symbol = '') {
    const cacheKey = `${text}_${symbol}`;
    if (textureCache.has(cacheKey)) {
        return textureCache.get(cacheKey);
    }

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

    textureCache.set(cacheKey, texture);
    return texture;
}

const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

export function createZodiacRing(radius = 10000, initialNames = []) {
    const group = new THREE.Group();
    group.name = 'ZodiacRing';
    // Optimization: Zodiac ring is static, disable per-frame matrix updates.
    group.matrixAutoUpdate = false;

    // 1. The main ring line
    // Optimization: Use pre-calculated RING_TRIG lookup table instead of per-point Math.cos/Math.sin calls
    const ringPoints = new Float32Array((RING_SEGMENTS + 1) * 3);
    for (let i = 0; i <= RING_SEGMENTS; i++) {
        const cos = RING_TRIG[i * 2];
        const sin = RING_TRIG[i * 2 + 1];
        const idx = i * 3;
        // Transform Ecliptic (XY-plane, Z-up) to World (XZ-plane, Y-up)
        ringPoints[idx] = cos * radius;
        ringPoints[idx + 1] = 0;
        ringPoints[idx + 2] = -sin * radius;
    }

    const ringGeo = new LineGeometry();
    ringGeo.setPositions(ringPoints);

    const ringMat = new LineMaterial({
        color: 0x77aaff,
        linewidth: 2.5,
        transparent: true,
        opacity: 0.6,
        depthWrite: false, // Prevents Z-fighting with other transparent objects
        resolution: resolution
    });

    const ringLine = new Line2(ringGeo, ringMat);
    // Optimization: Zodiac ring is not interactive, disable raycasting to save CPU
    ringLine.raycast = () => {};
    ringLine.matrixAutoUpdate = false;
    ringLine.updateMatrix();
    ringLine.renderOrder = 5; // Draw early
    ringLine.computeLineDistances();
    group.add(ringLine);

    // 2. Dash/Tick marks every 30 degrees - Batched into a single LineSegments2
    // Optimization: Use pre-calculated TICK_TRIG lookup table and hoist radius arithmetic outside the loop
    const tickLength = radius * 0.02;
    const rInner = radius - tickLength;
    const rOuter = radius + tickLength;
    const tickPoints = new Float32Array(12 * 2 * 3); // 12 ticks, 2 points per tick, 3 components per point

    for (let i = 0; i < 12; i++) {
        const cos = TICK_TRIG[i * 2];
        const sin = TICK_TRIG[i * 2 + 1];

        const startX = cos * rInner;
        const startY = sin * rInner;
        const endX = cos * rOuter;
        const endY = sin * rOuter;

        const idx = i * 6;
        // Transform Ecliptic (XY-plane, Z-up) to World (XZ-plane, Y-up)
        tickPoints[idx] = startX;
        tickPoints[idx + 1] = 0;
        tickPoints[idx + 2] = -startY;
        tickPoints[idx + 3] = endX;
        tickPoints[idx + 4] = 0;
        tickPoints[idx + 5] = -endY;
    }

    const tickGeo = new LineSegmentsGeometry();
    tickGeo.setPositions(tickPoints);
    const tickMat = new LineMaterial({
        color: 0x77aaff,
        linewidth: 1.8,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        resolution: resolution
    });

    const tickSegments = new LineSegments2(tickGeo, tickMat);
    // Optimization: Zodiac ticks are not interactive, disable raycasting to save CPU
    tickSegments.raycast = () => {};
    tickSegments.matrixAutoUpdate = false;
    tickSegments.updateMatrix();
    tickSegments.renderOrder = 5;
    tickSegments.computeLineDistances();
    group.add(tickSegments);

    const sprites = [];

    // 3. Labels
    // Optimization: Use pre-calculated LABEL_TRIG lookup table and hoist radius arithmetic outside the loop
    const labelRadius = radius * 1.05;
    const spriteYOffset = radius * 0.001;
    const spriteScaleX = radius * 0.3;
    const spriteScaleY = radius * 0.0375;

    for (let i = 0; i < 12; i++) {
        const cos = LABEL_TRIG[i * 2];
        const sin = LABEL_TRIG[i * 2 + 1];
        const lx = cos * labelRadius;
        const ly = sin * labelRadius;

        const name = initialNames[i] || '';
        const symbol = ZODIAC_SYMBOLS[i] || '';
        const texture = createLabelTexture(name, symbol);

        // Use material cache for sprites
        const matKey = `${name}_${symbol}`;
        let spriteMat = materialCache.get(matKey);
        if (!spriteMat) {
            spriteMat = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0.8
            });
            materialCache.set(matKey, spriteMat);
        }

        const sprite = new THREE.Sprite(spriteMat);
        // Optimization: Zodiac labels are not interactive, disable raycasting to save CPU
        sprite.raycast = () => {};
        // Transform Ecliptic (XY) to World (XZ)
        // Add a small Y-offset to prevent Z-fighting with the ring plane
        sprite.position.set(lx, spriteYOffset, -ly);
        sprite.renderOrder = 10; // Draw on top
        // ScaleX is now 2x to maintain 8:1 ratio (radius*0.3 vs radius*0.0375)
        sprite.scale.set(spriteScaleX, spriteScaleY, 1);
        // Optimization: Labels are static relative to the ring group
        sprite.matrixAutoUpdate = false;
        sprite.updateMatrix();
        group.add(sprite);
        sprites.push(sprite);
    }

    group.updateMatrix();

    // Function to update labels
    group.updateLabels = (names) => {
        if (!names || names.length < 12) return;
        for (let i = 0; i < 12; i++) {
            const name = names[i];
            const symbol = ZODIAC_SYMBOLS[i];
            const texture = createLabelTexture(name, symbol);

            const matKey = `${name}_${symbol}`;
            let spriteMat = materialCache.get(matKey);
            if (!spriteMat) {
                spriteMat = new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.8
                });
                materialCache.set(matKey, spriteMat);
            }

            sprites[i].material = spriteMat;
        }
    };

    return group;
}
