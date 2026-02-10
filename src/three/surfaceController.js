// Surface Controller - First-Person Observation on Planet Surfaces
import * as THREE from 'three'

/**
 * Creates a first-person surface controller for planet exploration
 * Handles mouse drag to look around. Movement is disabled.
 * 
 * @param {THREE.Camera} camera - The camera to control
 * @param {HTMLElement} domElement - The DOM element for events
 * @param {Object} config - Planet-specific configuration
 * @returns {Object} Controller API
 */
export function createSurfaceController(camera, domElement, config = {}) {
    const lookSensitivity = 0.002

    // State
    let isActive = false
    let isDragging = false

    // Camera rotation
    const euler = new THREE.Euler(0, 0, 0, 'YXZ')
    const PI_2 = Math.PI / 2

    /* ─────────────────────────────
       Mouse Events
    ───────────────────────────── */

    function onMouseDown(event) {
        if (!isActive) return
        isDragging = true
    }

    function onMouseUp() {
        isDragging = false
    }

    function onMouseMove(event) {
        if (!isActive || !isDragging) return

        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0

        euler.setFromQuaternion(camera.quaternion)

        euler.y -= movementX * lookSensitivity
        euler.x -= movementY * lookSensitivity

        // Clamp vertical rotation to prevent flipping
        euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x))

        camera.quaternion.setFromEuler(euler)
    }

    /* ─────────────────────────────
       Public API
    ───────────────────────────── */

    function update(deltaSeconds) {
        // Animation updates (like head bob) could go here if needed
        // Movement logic has been removed.
    }

    function activate() {
        isActive = true
        document.addEventListener('mousedown', onMouseDown)
        document.addEventListener('mouseup', onMouseUp)
        document.addEventListener('mousemove', onMouseMove)
    }

    function deactivate() {
        isActive = false
        document.removeEventListener('mousedown', onMouseDown)
        document.removeEventListener('mouseup', onMouseUp)
        document.removeEventListener('mousemove', onMouseMove)
        isDragging = false
    }

    function dispose() {
        deactivate()
    }

    return {
        activate,
        deactivate,
        update,
        dispose,
        isActive: () => isActive
    }
}
