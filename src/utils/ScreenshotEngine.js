import * as THREE from 'three'

/**
 * Capture a high-resolution screenshot of the current Three.js scene.
 * 
 * @param {THREE.WebGLRenderer} renderer - The Three.js renderer
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {THREE.Camera} camera - The Three.js camera
 * @param {number} width - Desired width (e.g. 3840 for 4K)
 * @param {number} height - Desired height (e.g. 2160 for 4K)
 * @returns {Promise<string>} - A Promise resolving to the Data URL of the image
 */
export async function captureHighRes(renderer, scene, camera, width = 3840, height = 2160) {
    // Store original size
    const originalSize = new THREE.Vector2()
    renderer.getSize(originalSize)
    const originalPixelRatio = renderer.getPixelRatio()

    try {
        // 1. Set High Resolution
        renderer.setPixelRatio(1) // Force 1:1 pixel ratio for exact sizing
        renderer.setSize(width, height, false) // false = don't update canvas style

        // Update camera aspect ratio
        const originalAspect = camera.aspect
        camera.aspect = width / height
        camera.updateProjectionMatrix()

        // 2. Render specifically for screenshot
        renderer.render(scene, camera)

        // 3. Get Data URL
        // To add a border, we draw the renderer's canvas onto a 2D canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        // Draw the rendered scene
        ctx.drawImage(renderer.domElement, 0, 0)


        const dataUrl = canvas.toDataURL('image/png', 1.0)

        // 4. Restore State
        camera.aspect = originalAspect
        camera.updateProjectionMatrix()

        renderer.setPixelRatio(originalPixelRatio)
        renderer.setSize(originalSize.width, originalSize.height, false)

        // Re-render immediately to avoid flicker
        renderer.render(scene, camera)

        return dataUrl
    } catch (err) {
        console.error("Screenshot failed:", err)

        // Attempt restore just in case
        renderer.setSize(originalSize.width, originalSize.height, false)
        renderer.setPixelRatio(originalPixelRatio)
        return null
    }
}

/**
 * Trigger a browser download for a Data URL
 * @param {string} dataUrl 
 * @param {string} filename 
 */
export function downloadImage(dataUrl, filename = 'stellar-moment.png') {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
