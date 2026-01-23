export async function createCinematicPoster(sourceDataUrl, dateObj) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = "Anonymous"

        img.onload = () => {
            try {
                // 1. Setup Canvas (Poster Formatting)
                const margin = 120
                const footerHeight = 400

                // Calculate height first based on content
                const contentHeight = img.height + margin + footerHeight

                // Enforce 16:9 Aspect Ratio
                // Target Width based on Height (16/9 = 1.777...)
                let canvasHeight = contentHeight
                let canvasWidth = Math.ceil(contentHeight * (16 / 9))

                // If by chance the image is super wide and calculate width is too small, respect image width
                // (Unlikely for standard 16:9 input, but good for safety)
                if (canvasWidth < img.width + (margin * 2)) {
                    canvasWidth = img.width + (margin * 2)
                    canvasHeight = Math.ceil(canvasWidth * (9 / 16))
                }

                const canvas = document.createElement('canvas')
                canvas.width = canvasWidth
                canvas.height = canvasHeight

                const ctx = canvas.getContext('2d')

                // 2. Fill Background (Deep Cosmetic Black/Blue)
                ctx.fillStyle = '#000000'
                ctx.fillRect(0, 0, canvasWidth, canvasHeight)

                // 3. Draw Image
                // Center the image horizontally
                const imgX = (canvasWidth - img.width) / 2
                ctx.drawImage(img, imgX, margin)

                // 4. Draw Border around the image (Removed for seamless look)
                // ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
                // ctx.lineWidth = 2
                // ctx.strokeRect(imgX, margin, img.width, img.height)

                // 5. Typography (The "Poster" feel)
                const footerY = margin + img.height + 80
                const centerX = canvasWidth / 2

                ctx.textAlign = 'center'
                ctx.textBaseline = 'top'

                // Title
                ctx.fillStyle = '#ffffff'
                ctx.font = '700 80px "Inter", sans-serif'
                ctx.letterSpacing = '10px'
                ctx.fillText('SOLAR SYSTEM', centerX, footerY)

                // Subtitle / Date
                const dateStr = dateObj.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }).toUpperCase()

                ctx.fillStyle = '#88ccff'
                ctx.font = '400 40px "Inter", sans-serif'
                ctx.fillText(dateStr, centerX, footerY + 110)

                // Coordinates / Technical noise
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
                ctx.font = '300 24px monospace'
                ctx.fillText(`MOMENT: CAPTURED  |  TIME: RELATIVE  |  DEST: INFINITY`, centerX, footerY + 180)

                // 6. Add "Film Grain" Texture
                // Generate noise on top
                addNoise(ctx, canvasWidth, canvasHeight)

                resolve(canvas.toDataURL('image/png'))
            } catch (e) {
                reject(e)
            }
        }

        img.onerror = (e) => reject(e)
        img.src = sourceDataUrl
    })
}

function addNoise(ctx, w, h) {
    const imageData = ctx.getImageData(0, 0, w, h)
    const buffer = new Uint32Array(imageData.data.buffer)
    const len = buffer.length

    // We only want subtle noise.
    // However, iterating nicely is expensive. 
    // Let's use a ligher composite approach or a small noise pattern if performance matters.
    // For a screenshot (one time op), iterating pixels is acceptable for quality.

    for (let i = 0; i < len; i++) {
        if (Math.random() < 0.15) { // 15% chance of noise
            // We want to slightly alter the pixel logic
            // But raw pixel manipulation is tricky with blending.
            // Let's skip direct pixel manipulation for simplicity and use overlay.
        }
    }

    // Better Approach: Draw a noise pattern
    // Create a small noise canvas pattern
    const noiseCanvas = document.createElement('canvas')
    noiseCanvas.width = 100
    noiseCanvas.height = 100
    const nCtx = noiseCanvas.getContext('2d')

    // Fill with random noise
    const nData = nCtx.createImageData(100, 100)
    for (let i = 0; i < nData.data.length; i += 4) {
        const val = Math.random() * 255
        nData.data[i] = val
        nData.data[i + 1] = val
        nData.data[i + 2] = val
        nData.data[i + 3] = 20 // Low alpha
    }
    nCtx.putImageData(nData, 0, 0)

    ctx.save()
    ctx.globalCompositeOperation = 'overlay'
    ctx.fillStyle = ctx.createPattern(noiseCanvas, 'repeat')
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
}
