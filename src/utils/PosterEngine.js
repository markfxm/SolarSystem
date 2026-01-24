export async function createCinematicPoster(sourceDataUrl, dateObj, format = '16:9') {
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

                // Universal Fit Logic
                // If content shape is "wider" than target shape, width is the constraint.
                // If content shape is "taller" than target shape, height is the constraint.
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

                // 2. Fill Background (Deep Cosmetic Black/Blue)
                ctx.fillStyle = '#000000'
                ctx.fillRect(0, 0, canvasWidth, canvasHeight)

                // 3. Layout Calculations (Vertical Centering)
                // Content = Image + Gap + Footer Text Area
                // We approximated footerHeight before, but let's be precise for centering.
                // Title (80px) + Gap (110px) + Date (40px) + Gap (70px) + Tech (24px) ~ 350px total text block
                const textBlockHeight = 350
                const gapImageToText = 80
                const totalContentHeight = img.height + gapImageToText + textBlockHeight

                // Determine starting Y to center content vertically
                // For 16:9, we might prefer the margin look, but for 9:16/1:1 centering is critical.
                // Let's apply centering for all to keep it balanced.
                let startY = (canvasHeight - totalContentHeight) / 2

                // Safety: Don't go above top margin if canvas is tight
                if (startY < margin) startY = margin

                // 4. Draw Image
                // Center the image horizontally
                const imgX = (canvasWidth - img.width) / 2
                ctx.drawImage(img, imgX, startY)

                // 5. Typography
                const footerY = startY + img.height + gapImageToText
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
