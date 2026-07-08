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
const OVERLAY_BODY_ORDER = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
const SNAPSHOT_ORBIT_BASE_RADIUS = 220
const SNAPSHOT_ORBIT_STEP = 140
const SNAPSHOT_OUTER_ORBIT_RADIUS = SNAPSHOT_ORBIT_BASE_RADIUS + 7 * SNAPSHOT_ORBIT_STEP
const ORBIT_RADIUS_FACTORS = {
    sun: 0,
    mercury: SNAPSHOT_ORBIT_BASE_RADIUS / SNAPSHOT_OUTER_ORBIT_RADIUS,
    venus: (SNAPSHOT_ORBIT_BASE_RADIUS + SNAPSHOT_ORBIT_STEP) / SNAPSHOT_OUTER_ORBIT_RADIUS,
    earth: (SNAPSHOT_ORBIT_BASE_RADIUS + 2 * SNAPSHOT_ORBIT_STEP) / SNAPSHOT_OUTER_ORBIT_RADIUS,
    moon: (SNAPSHOT_ORBIT_BASE_RADIUS + 2 * SNAPSHOT_ORBIT_STEP) / SNAPSHOT_OUTER_ORBIT_RADIUS,
    mars: (SNAPSHOT_ORBIT_BASE_RADIUS + 3 * SNAPSHOT_ORBIT_STEP) / SNAPSHOT_OUTER_ORBIT_RADIUS,
    jupiter: (SNAPSHOT_ORBIT_BASE_RADIUS + 4 * SNAPSHOT_ORBIT_STEP) / SNAPSHOT_OUTER_ORBIT_RADIUS,
    saturn: (SNAPSHOT_ORBIT_BASE_RADIUS + 5 * SNAPSHOT_ORBIT_STEP) / SNAPSHOT_OUTER_ORBIT_RADIUS,
    uranus: (SNAPSHOT_ORBIT_BASE_RADIUS + 6 * SNAPSHOT_ORBIT_STEP) / SNAPSHOT_OUTER_ORBIT_RADIUS,
    neptune: 1.0
}
const BODY_LABELS = {
    sun: 'SUN',
    moon: 'MOON',
    mercury: 'MER',
    venus: 'VEN',
    mars: 'MAR',
    jupiter: 'JUP',
    saturn: 'SAT',
    uranus: 'URA',
    neptune: 'NEP'
}

export async function createPoster(sourceDataUrl, dateOrOptions, format = '16:9', theme = 'cinematic') {
    const options = normalizePosterOptions(dateOrOptions, format, theme)
    const dateObj = options.date
    const posterMeta = options.posterMeta || {}

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
                if (options.format === '9:16') targetAR = 9 / 16
                if (options.format === '1:1') targetAR = 1

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
                const themeConfig = getThemeConfig(options.theme)
                ctx.fillStyle = themeConfig.bgColor
                ctx.fillRect(0, 0, canvasWidth, canvasHeight)

                // 3. Draw Theme Overlays (e.g. Grids, Patches)
                if (options.theme === 'blueprint') {
                    drawGrid(ctx, canvasWidth, canvasHeight)
                    drawTechnicalDetails(ctx, canvasWidth, canvasHeight)
                }
                if (options.theme === 'golden') {
                    drawPulsarMap(ctx, canvasWidth, canvasHeight)
                }

                // 4. Layout Calculations
                const textBlockHeight = 410
                const gapImageToText = 80
                const totalContentHeight = img.height + gapImageToText + textBlockHeight
                let startY = (canvasHeight - totalContentHeight) / 2
                if (startY < margin) startY = margin

                // 5. Draw Main Image with effects
                const imgX = (canvasWidth - img.width) / 2
                if (options.theme === 'vintage') {
                    ctx.save()
                    ctx.filter = 'sepia(0.5) contrast(1.1)'
                    ctx.drawImage(img, imgX, startY)
                    ctx.restore()
                } else {
                    ctx.drawImage(img, imgX, startY)
                }
                drawChartOverlay(ctx, posterMeta, imgX, startY, img.width, img.height, dateObj, themeConfig)

                // 6. Typography
                const footerY = startY + img.height + gapImageToText
                const centerX = canvasWidth / 2

                ctx.textAlign = 'center'
                ctx.textBaseline = 'top'

                // Title
                ctx.fillStyle = themeConfig.titleColor
                const title = posterMeta.title || 'SOLAR SYSTEM'
                ctx.font = themeConfig.titleFont
                drawFittedText(ctx, title.toUpperCase(), centerX, footerY, canvasWidth - margin * 2, 80, themeConfig.titleFont)

                // Subtitle / Date
                const dateStr = dateObj.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }).toUpperCase()

                const occasionLabel = posterMeta.occasionLabel ? String(posterMeta.occasionLabel).toUpperCase() : 'STELLAR MOMENT'
                ctx.fillStyle = themeConfig.accentColor
                ctx.font = themeConfig.dateFont
                drawFittedText(ctx, `${occasionLabel} | ${dateStr}`, centerX, footerY + 110, canvasWidth - margin * 2, 40, themeConfig.dateFont)

                const summaryLine = posterMeta.summaryLine || 'MOMENT: CAPTURED | TIME: RELATIVE'
                const aspectSummary = posterMeta.aspectSummary ? `ASPECT: ${String(posterMeta.aspectSummary).toUpperCase()}` : ''
                const shortMessage = posterMeta.shortMessage || `THEME: ${options.theme.toUpperCase()}`

                // Technical noise / Metadata
                ctx.fillStyle = themeConfig.metaColor
                ctx.font = themeConfig.metaFont
                drawFittedText(ctx, summaryLine.toUpperCase(), centerX, footerY + 180, canvasWidth - margin * 2, 24, themeConfig.metaFont)
                if (aspectSummary) {
                    drawFittedText(ctx, aspectSummary, centerX, footerY + 220, canvasWidth - margin * 2, 24, themeConfig.metaFont)
                }
                drawFittedText(ctx, String(shortMessage).toUpperCase(), centerX, footerY + 260, canvasWidth - margin * 2, 22, themeConfig.metaFont)

                if (options.watermark) {
                    drawWatermark(ctx, canvasWidth, canvasHeight, options.watermark, themeConfig)
                }

                // 7. Post-processing
                if (themeConfig.noise) addNoise(ctx, canvasWidth, canvasHeight, themeConfig.noiseOpacity)
                if (options.theme === 'vintage') addVignette(ctx, canvasWidth, canvasHeight)

                resolve(canvas.toDataURL('image/png'))
            } catch (e) {
                reject(e)
            }
        }

        img.onerror = (e) => reject(e)
        img.src = sourceDataUrl
    })
}

export function buildChartOverlayModel(posterMeta, imageX, imageY, imageW, imageH) {
    const chart = posterMeta?.chart
    const snapshotBodies = posterMeta?.snapshotBodies || null
    if (!chart && !snapshotBodies) return null

    const size = Math.min(imageW, imageH) * 0.91
    const scale = Math.max(1, Math.min(imageW, imageH) / 900)
    const centerX = imageX + imageW / 2
    const centerY = imageY + imageH / 2
    const radius = size / 2
    const bodies = []

    for (const id of OVERLAY_BODY_ORDER) {
        const body = chart?.[id]
        const snapshotBody = snapshotBodies?.[id]
        if (!snapshotBody && (!body || typeof body.longitude !== 'number')) continue
        const angle = snapshotBody ? Math.atan2(snapshotBody.y, snapshotBody.x) : ((body.longitude - 90) * Math.PI) / 180
        const orbitFactor = ORBIT_RADIUS_FACTORS[id] ?? 0.88
        const normalizedRadius = snapshotBody ? Math.hypot(snapshotBody.x, snapshotBody.y) : orbitFactor
        const r = radius * normalizedRadius
        bodies.push({
            id,
            label: BODY_LABELS[id] || id.toUpperCase(),
            x: snapshotBody ? centerX + snapshotBody.x * radius : centerX + Math.cos(angle) * r,
            y: snapshotBody ? centerY + snapshotBody.y * radius : centerY + Math.sin(angle) * r,
            labelX: snapshotBody ? centerX + snapshotBody.x * radius + Math.cos(angle) * 42 * scale : centerX + Math.cos(angle) * (r + 42 * scale),
            labelY: snapshotBody ? centerY + snapshotBody.y * radius + Math.sin(angle) * 42 * scale : centerY + Math.sin(angle) * (r + 42 * scale),
            orbitRadius: r,
            source: snapshotBody ? 'snapshot' : 'chart',
            highlight: id === 'sun' ? 'sun' : id === 'moon' ? 'moon' : null
        })
    }

    let moonOrbit = null
    if (snapshotBodies?.earth && snapshotBodies?.moon) {
        const earthX = centerX + snapshotBodies.earth.x * radius
        const earthY = centerY + snapshotBodies.earth.y * radius
        const moonX = centerX + snapshotBodies.moon.x * radius
        const moonY = centerY + snapshotBodies.moon.y * radius
        moonOrbit = {
            centerX: earthX,
            centerY: earthY,
            radius: Math.hypot(moonX - earthX, moonY - earthY)
        }
    }

    let aspect = null
    if (posterMeta.majorAspect) {
        const p1 = bodies.find(body => body.id === posterMeta.majorAspect.p1)
        const p2 = bodies.find(body => body.id === posterMeta.majorAspect.p2)
        if (p1 && p2) {
            aspect = {
                p1,
                p2,
                type: posterMeta.majorAspect.aspect?.type || ''
            }
        }
    }

    return {
        centerX,
        centerY,
        radius,
        scale,
        bodies,
        aspect,
        moonOrbit
    }
}

function normalizePosterOptions(dateOrOptions, format, theme) {
    if (dateOrOptions && typeof dateOrOptions === 'object' && !(dateOrOptions instanceof Date)) {
        return {
            date: dateOrOptions.date instanceof Date ? dateOrOptions.date : new Date(),
            format: dateOrOptions.format || format || '16:9',
            theme: dateOrOptions.theme || theme || 'cinematic',
            posterMeta: dateOrOptions.posterMeta || null,
            watermark: dateOrOptions.watermark === undefined ? 'Stellar Web' : dateOrOptions.watermark
        }
    }

    return {
        date: dateOrOptions instanceof Date ? dateOrOptions : new Date(),
        format,
        theme,
        posterMeta: null,
        watermark: null
    }
}

function getThemeConfig(theme) {
    return THEME_CONFIGS[theme] || THEME_CONFIGS.cinematic
}

function drawFittedText(ctx, text, x, y, maxWidth, maxSize, baseFont) {
    const fontFamily = baseFont.substring(baseFont.indexOf('px') + 2).trim() || '"Inter", sans-serif'
    const weight = baseFont.startsWith('700') ? '700' : baseFont.startsWith('400') ? '400' : '300'
    let size = maxSize

    do {
        ctx.font = `${weight} ${size}px ${fontFamily}`
        if (ctx.measureText(text).width <= maxWidth || size <= 16) break
        size -= 2
    } while (size > 16)

    ctx.fillText(text, x, y)
}

function drawWatermark(ctx, w, h, watermark, themeConfig) {
    ctx.save()
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = themeConfig.metaColor
    ctx.font = '400 20px "Inter", sans-serif'
    ctx.fillText(watermark, w - 48, h - 42)
    ctx.restore()
}

function drawChartOverlay(ctx, posterMeta, imageX, imageY, imageW, imageH, dateObj, themeConfig) {
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // The captured snapshot already contains the schematic planets and orbits.
    // Poster rendering should only add poster metadata, not redraw celestial bodies.
    drawMomentBadge(ctx, posterMeta, imageX, imageY, imageW, dateObj, themeConfig)

    ctx.restore()
}

function drawMomentBadge(ctx, posterMeta, imageX, imageY, imageW, dateObj, themeConfig) {
    const title = posterMeta?.title || 'My Stellar Moment'
    const dateText = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).toUpperCase()
    const scale = Math.max(1, imageW / 1800)
    const x = imageX + 42 * scale
    const y = imageY + 38 * scale
    const badgeW = Math.min(1040, imageW * 0.42)
    const badgeH = 150 * scale

    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.46)'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
    ctx.lineWidth = 1
    roundRect(ctx, x, y, badgeW, badgeH, 18 * scale)
    ctx.fill()
    ctx.stroke()

    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = themeConfig.titleColor
    ctx.font = `700 ${38 * scale}px "Inter", sans-serif`
    drawFittedText(ctx, title, x + 28 * scale, y + 22 * scale, badgeW - 56 * scale, 38 * scale, `700 ${38 * scale}px "Inter", sans-serif`)
    ctx.fillStyle = themeConfig.accentColor
    ctx.font = `400 ${22 * scale}px "Inter", sans-serif`
    ctx.fillText(dateText, x + 28 * scale, y + 92 * scale)
    ctx.restore()
}

function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + w - radius, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
    ctx.lineTo(x + w, y + h - radius)
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
    ctx.lineTo(x + radius, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
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
        ctx.lineTo(w, h)
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
