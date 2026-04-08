/**
 * PosterEngine.js - Handles artistic poster generation from screenshots.
 * Optimized: Batching Canvas draw calls and caching repetitive patterns.
 */

// Module-level constant to avoid repeated allocations in getThemeConfig
const THEME_CONFIGS = {
    cinematic: {
        bgColor: '#000000',
        titleColor: '#ffffff',
        accentColor: '#88ccff',
        metaColor: 'rgba(255, 255, 255, 0.4)',
        titleFont: '700 80px "Inter", sans-serif',
        dateFont: '400 40px "Inter", sans-serif',
        metaFont: '300 24px monospace',
        noise: true,
        noiseOpacity: 20
    },
    blueprint: {
        bgColor: '#001a33',
        titleColor: '#ffffff',
        accentColor: '#00ffff',
        metaColor: 'rgba(0, 255, 255, 0.5)',
        titleFont: '700 80px "Inter", sans-serif',
        dateFont: '400 40px "Inter", sans-serif',
        metaFont: '300 24px monospace',
        noise: false
    },
    vintage: {
        bgColor: '#2b261d',
        titleColor: '#e0d5c1',
        accentColor: '#b0a080',
        metaColor: 'rgba(224, 213, 193, 0.4)',
        titleFont: '700 80px "Inter", sans-serif',
        dateFont: '400 40px "Inter", sans-serif',
        metaFont: '300 22px monospace',
        noise: true,
        noiseOpacity: 40
    },
    golden: {
        bgColor: '#120f0a', // Extremely dark obsidian
        titleColor: '#d4af37', // Metallic Gold
        accentColor: '#f9d71c', // Bright Gold
        metaColor: 'rgba(212, 175, 55, 0.4)',
        titleFont: '700 80px "Inter", sans-serif',
        dateFont: '400 40px "Inter", sans-serif',
        metaFont: '300 22px monospace',
        noise: true,
        noiseOpacity: 15
    }
};

// Cache for generated noise patterns to avoid redundant random data generation
const noisePatternCache = new Map();

export async function createPoster(sourceDataUrl, dateObj, format = '16:9', theme = 'cinematic') {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = "Anonymous"

        img.onload = () => {
            try {
                // 1. Setup Canvas (Poster Formatting)
                const margin = 120
                const footerHeight = 400

                // Minimum required dimensions to fit content
                const minW = img.width + (margin * 2)
                const minH = img.height + margin + footerHeight

                // Determine Target Aspect Ratio
                let targetAR = 16 / 9
                if (format === '9:16') targetAR = 9 / 16
                if (format === '1:1') targetAR = 1

                let canvasWidth, canvasHeight

                if (minW / minH > targetAR) {
                    canvasWidth = minW
                    canvasHeight = Math.ceil(minW / targetAR)
                } else {
                    canvasHeight = minH
                    canvasWidth = Math.ceil(minH * targetAR)
                }

                const canvas = document.createElement('canvas')
                canvas.width = canvasWidth
                canvas.height = canvasHeight
                const ctx = canvas.getContext('2d')

                // 2. Apply Theme Background & Layout
                const themeConfig = getThemeConfig(theme)
                ctx.fillStyle = themeConfig.bgColor
                ctx.fillRect(0, 0, canvasWidth, canvasHeight)

                // 3. Draw Theme Overlays (e.g. Grids, Patches)
                if (theme === 'blueprint') {
                    drawGrid(ctx, canvasWidth, canvasHeight)
                    drawTechnicalDetails(ctx, canvasWidth, canvasHeight)
                }
                if (theme === 'golden') {
                    drawPulsarMap(ctx, canvasWidth, canvasHeight)
                }

                // 4. Layout Calculations
                const textBlockHeight = 350
                const gapImageToText = 80
                const totalContentHeight = img.height + gapImageToText + textBlockHeight
                let startY = (canvasHeight - totalContentHeight) / 2
                if (startY < margin) startY = margin

                // 5. Draw Main Image with effects
                const imgX = (canvasWidth - img.width) / 2
                if (theme === 'vintage') {
                    ctx.save()
                    ctx.filter = 'sepia(0.5) contrast(1.1)'
                    ctx.drawImage(img, imgX, startY)
                    ctx.restore()
                } else {
                    ctx.drawImage(img, imgX, startY)
                }

                // 6. Typography
                const footerY = startY + img.height + gapImageToText
                const centerX = canvasWidth / 2

                ctx.textAlign = 'center'
                ctx.textBaseline = 'top'

                // Title
                ctx.fillStyle = themeConfig.titleColor
                ctx.font = themeConfig.titleFont
                ctx.letterSpacing = '10px'
                ctx.fillText('SOLAR SYSTEM', centerX, footerY)

                // Subtitle / Date
                const dateStr = dateObj.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }).toUpperCase()

                ctx.fillStyle = themeConfig.accentColor
                ctx.font = themeConfig.dateFont
                ctx.fillText(dateStr, centerX, footerY + 110)

                // Technical noise / Metadata
                ctx.fillStyle = themeConfig.metaColor
                ctx.font = themeConfig.metaFont
                ctx.fillText(`MOMENT: CAPTURED | TIME: RELATIVE | THEME: ${theme.toUpperCase()}`, centerX, footerY + 180)

                // 7. Post-processing
                if (themeConfig.noise) addNoise(ctx, canvasWidth, canvasHeight, themeConfig.noiseOpacity)
                if (theme === 'vintage') addVignette(ctx, canvasWidth, canvasHeight)

                resolve(canvas.toDataURL('image/png'))
            } catch (e) {
                reject(e)
            }
        }

        img.onerror = (e) => reject(e)
        img.src = sourceDataUrl
    })
}

function getThemeConfig(theme) {
    return THEME_CONFIGS[theme] || THEME_CONFIGS.cinematic
}

/**
 * Optimized: Uses a single path and stroke call for all grid lines.
 * Reduces draw calls from O(N) to O(1).
 */
function drawGrid(ctx, w, h) {
    ctx.save()
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)'
    ctx.lineWidth = 1
    const size = 100

    ctx.beginPath()
    for (let x = 0; x <= w; x += size) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
    }
    for (let y = 0; y <= h; y += size) {
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
    }
    ctx.stroke()
    ctx.restore()
}

/**
 * Optimized: Caches the noise pattern to avoid redundant creation.
 */
function addNoise(ctx, w, h, opacity = 20) {
    let pattern = noisePatternCache.get(opacity);

    if (!pattern) {
        const noiseCanvas = document.createElement('canvas')
        noiseCanvas.width = 120
        noiseCanvas.height = 120
        const nCtx = noiseCanvas.getContext('2d')
        const nData = nCtx.createImageData(120, 120)
        for (let i = 0; i < nData.data.length; i += 4) {
            const val = Math.random() * 255
            nData.data[i] = val
            nData.data[i + 1] = val
            nData.data[i + 2] = val
            nData.data[i + 3] = opacity
        }
        nCtx.putImageData(nData, 0, 0)
        pattern = ctx.createPattern(noiseCanvas, 'repeat');
        noisePatternCache.set(opacity, pattern);
    }

    ctx.save()
    ctx.globalCompositeOperation = 'overlay'
    ctx.fillStyle = pattern
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
}

function addVignette(ctx, w, h) {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.sqrt(w * w + h * h) / 2)
    gradient.addColorStop(0, 'rgba(0,0,0,0)')
    gradient.addColorStop(0.8, 'rgba(0,0,0,0.3)')
    gradient.addColorStop(1, 'rgba(0,0,0,0.7)')
    ctx.save()
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
}

/**
 * Optimized: Batches crosshair drawing into a single stroke call.
 */
function drawTechnicalDetails(ctx, w, h) {
    ctx.save()
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)'
    ctx.lineWidth = 1
    const pad = 40
    const s = 20

    ctx.beginPath()
    const coords = [
        [pad, pad], [w - pad, pad],
        [pad, h - pad], [w - pad, h - pad]
    ]

    for (let i = 0; i < coords.length; i++) {
        const [cx, cy] = coords[i]
        ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy)
        ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy + s)
    }
    ctx.stroke()

    ctx.restore()
}

/**
 * Optimized: Batches radiating lines and hash marks into unified stroke calls.
 */
function drawPulsarMap(ctx, w, h) {
    ctx.save()
    const centerX = 160
    const centerY = h - 220
    const maxRadius = 130

    // 1. Central Point
    ctx.beginPath()
    ctx.arc(centerX, centerY, 2, 0, Math.PI * 2)
    ctx.fillStyle = '#d4af37'
    ctx.fill()

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)'
    ctx.lineWidth = 1.5

    // 2. Radiating Pulsar Lines and Binary Hash Marks
    const angles = [0, 45, 80, 110, 150, 185, 210, 240, 270, 300, 320, 340, 355]

    // Batch Radiating Lines
    ctx.beginPath()
    angles.forEach(angle => {
        const rad = (angle * Math.PI) / 180
        const len = maxRadius * (0.6 + Math.random() * 0.4)
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(centerX + Math.cos(rad) * len, centerY + Math.sin(rad) * len)
    })
    ctx.stroke()

    // Batch Hash Marks
    ctx.beginPath()
    angles.forEach(angle => {
        const rad = (angle * Math.PI) / 180
        const len = maxRadius * 0.8 // Approximate for hash marks
        const normalX = -Math.sin(rad)
        const normalY = Math.cos(rad)
        const hSize = 4

        for (let i = 0.3; i < 0.9; i += 0.2) {
            if (Math.random() > 0.3) {
                const px = centerX + Math.cos(rad) * len * i
                const py = centerY + Math.sin(rad) * len * i
                ctx.moveTo(px - normalX * hSize, py - normalY * hSize)
                ctx.lineTo(px + normalX * hSize, py + normalY * hSize)
            }
        }
    })
    ctx.stroke()

    ctx.font = '10px monospace'
    ctx.fillStyle = 'rgba(212, 175, 55, 0.6)'
    ctx.textAlign = 'center'
    ctx.fillText('STELAR ADDR: GALACTIC SECTOR 0', centerX, centerY + maxRadius + 20)
    ctx.restore()
}
