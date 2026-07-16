import * as THREE from 'three'

/**
 * Capture a high-resolution screenshot of the current Three.js scene.
 * 
 * @param {THREE.WebGLRenderer} renderer - The Three.js renderer
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {THREE.Camera} camera - The Three.js camera
 * @param {number} width - Desired width (e.g. 3840 for 4K)
 * @param {number} height - Desired height (e.g. 2160 for 4K)
 * @returns {Promise<string | null>} - A Promise resolving to the Data URL of the image
 */
export async function captureHighRes(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  width: number = 3840,
  height: number = 2160
): Promise<string | null> {
    // Store original size
    const originalSize = new THREE.Vector2()
    renderer.getSize(originalSize)
    const originalPixelRatio = renderer.getPixelRatio()
    const isPerspective = camera instanceof THREE.PerspectiveCamera
    const originalAspect = isPerspective ? camera.aspect : null

    try {
        // 1. Set High Resolution
        renderer.setPixelRatio(1) // Force 1:1 pixel ratio for exact sizing
        renderer.setSize(width, height, false) // false = don't update canvas style

        // Update camera aspect ratio
        if (isPerspective) {
          camera.aspect = width / height
          camera.updateProjectionMatrix()
        }

        // 2. Render specifically for screenshot
        renderer.render(scene, camera)

        // 3. Serialize the WebGL canvas directly to avoid a full-size 2D copy
        return renderer.domElement.toDataURL('image/png')
    } catch (err) {
        console.error("Screenshot failed:", err)
        return null
    } finally {
        // 4. Restore state even when rendering or serialization fails
        if (isPerspective && originalAspect !== null) {
          camera.aspect = originalAspect
          camera.updateProjectionMatrix()
        }

        renderer.setPixelRatio(originalPixelRatio)
        renderer.setSize(originalSize.x, originalSize.y, false)

        // Re-render immediately to avoid flicker
        renderer.render(scene, camera)
    }
}

/**
 * Trigger a browser download for a Data URL
 * @param {string} dataUrl 
 * @param {string} filename 
 */
export function downloadImage(dataUrl: string, filename: string = 'stellar-moment.png'): void {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
