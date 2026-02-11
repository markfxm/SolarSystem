import * as THREE from 'three'
import { createSimpleMarsEnvironment } from './simpleMarsEnvironment.js'
import { createSurfaceController } from './surfaceController.js'
import { getPlanetConfig } from '../data/planetConfigs.js'

export function createInteractions({
  engine,
  planets,
  planetNames,
  timeController,
  onHoverNameChange,
  onSelectionChange, // ← callback to notify selection changes
  onArrival // ← NEW: callback when camera arrives at planet
}) {
  const {
    camera,
    controls,
    renderer,
    scene,
    defaultMinDistance,
    defaultMaxDistance
  } = engine

  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()

  let hoveredObject = null
  let selectedObject = null
  let isEnabled = true

  // Fly / tracking state
  let isFlying = false
  let isTracking = false
  let trackingLastPosition = null

  let flyFromCameraPos = null
  let flyFromTarget = null
  let flyToCameraPos = null
  let flyToTarget = null
  let flyStartMs = 0
  let flyDurationMs = 1500
  let flyTargetBody = null
  let flyCameraOffset = null
  let prevControlsState = null

  // Surface mode state
  let isSurfaceMode = false
  let surfaceEnvironment = null
  let surfaceController = null
  let currentSurfacePlanet = null

  /* ─────────────────────────────
     Utilities
  ───────────────────────────── */

  function getFlyToPositions(body) {
    const radius =
      body.geometry?.parameters?.radius ?? 5

    const distance = Math.max(radius * 5, 20)
    const height = Math.max(radius * 2, 8)

    return {
      cameraPos: body.position.clone().add(
        new THREE.Vector3(0, height, distance)
      ),
      lookAt: body.position.clone(),
      minDistance: radius * 1.5
    }
  }

  function startFlyTo(body) {
    timeController?.freeze()

    const { cameraPos, lookAt, minDistance } =
      getFlyToPositions(body)

    // Save current controls state (including enabled) so we can restore exactly
    prevControlsState = {
      enabled: controls.enabled ?? true,
      enableRotate: controls.enableRotate ?? true,
      enablePan: controls.enablePan ?? true,
      enableZoom: controls.enableZoom ?? true,
      enableDamping: controls.enableDamping ?? false
    }

    // Disable controls entirely during smooth fly-to to avoid conflicts
    controls.enabled = false
    controls.enableRotate = false
    controls.enablePan = false
    controls.enableZoom = false
    controls.enableDamping = false
    controls.minDistance = minDistance

    flyFromCameraPos = camera.position.clone()
    flyFromTarget = controls.target.clone()

    flyToCameraPos = cameraPos
    flyToTarget = lookAt

    flyStartMs = performance.now()
    flyTargetBody = body
    flyCameraOffset = cameraPos.clone().sub(body.position)

    // Mark selection immediately so the panel can reflect the state
    selectedObject = body
    try {
      onSelectionChange?.(body.userData?.name ?? '')
    } catch (e) {
      // noop
    }

    isFlying = true
    isTracking = true
    trackingLastPosition = null

    const dist = flyFromCameraPos.distanceTo(flyToCameraPos)
    flyDurationMs = Math.min(4500, Math.max(1200, dist * 3))
  }

  function finishFly() {
    isFlying = false

    // Restore controls from saved state if available, otherwise ensure interactive
    if (prevControlsState) {
      try {
        // restore enabled explicitly first
        controls.enabled = prevControlsState.enabled ?? true
        controls.enableRotate = prevControlsState.enableRotate ?? true
        controls.enablePan = prevControlsState.enablePan ?? true
        controls.enableZoom = prevControlsState.enableZoom ?? true
        controls.enableDamping = prevControlsState.enableDamping ?? false
      } catch (e) {
        // Fallback: ensure controls are interactive
        controls.enabled = true
        controls.enableRotate = true
        controls.enablePan = true
        controls.enableZoom = true
        controls.enableDamping = prevControlsState?.enableDamping ?? false
      }
      prevControlsState = null
    } else {
      controls.enabled = true
      controls.enableRotate = true
      controls.enablePan = true
      controls.enableZoom = true
      controls.enableDamping = false
    }

    trackingLastPosition = null
    timeController?.unfreeze()

    // Mark arrived target as selected and keep tracking enabled until user intervenes
    if (flyTargetBody) {
      selectedObject = flyTargetBody
      flyTargetBody = null
      flyCameraOffset = null
    }
  }

  /* ─────────────────────────────
     Mouse handlers
  ───────────────────────────── */

  function onMouseMove(event) {
    if (!isEnabled) return
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObjects(planets, false)

    if (hits.length > 0) {
      const obj = hits[0].object
      if (hoveredObject !== obj) {
        hoveredObject = obj
        onHoverNameChange?.(
          planetNames[obj.userData.name] ?? ''
        )
      }
    } else {
      hoveredObject = null
      onHoverNameChange?.('')
    }
  }

  function onClick() {
    if (!isEnabled) return
    if (!hoveredObject) return

    // If we are already viewing a planet (selectedObject is set),
    // prevent clicking on OTHER planets to avoid accidental jumps (e.g. to Sun).
    if (selectedObject && hoveredObject !== selectedObject) {
      return
    }

    startFlyTo(hoveredObject)
  }

  /* ─────────────────────────────
     Public API
  ───────────────────────────── */

  function focusPlanetById(id) {
    if (isSurfaceMode) {
      exitSurface()
    }
    const target = planets.find(
      p => p.userData.name === id
    )
    if (!target) return

    startFlyTo(target)
  }

  function update(deltaSeconds = 0) {
    const now = performance.now()

    // Surface mode update
    if (isSurfaceMode && surfaceController) {
      surfaceController.update(deltaSeconds)
      return // Skip orbital updates in surface mode
    }

    // Smooth fly-to
    if (isFlying && flyFromCameraPos && flyToCameraPos) {
      if (flyTargetBody && flyCameraOffset) {
        flyToTarget = flyTargetBody.position.clone()
        flyToCameraPos =
          flyTargetBody.position.clone().add(flyCameraOffset)
      }

      const t = Math.min(
        1,
        (now - flyStartMs) / flyDurationMs
      )
      const eased = 1 - Math.pow(1 - t, 3)

      camera.position.lerpVectors(
        flyFromCameraPos,
        flyToCameraPos,
        eased
      )

      const lookAt = new THREE.Vector3().lerpVectors(
        flyFromTarget,
        flyToTarget,
        eased
      )

      controls.target.copy(lookAt)

      if (t >= 1) {
        // Fly complete
        camera.position.copy(flyToCameraPos)
        controls.target.copy(flyToTarget)
        controls.update()

        finishFly()

        // Notify arrival (for showing LAND button)
        if (onArrival && selectedObject && selectedObject.userData?.name) {
          onArrival(selectedObject.userData.name)
        }
      }
    }

    // Planet tracking
    if (!isFlying && isTracking && selectedObject) {
      if (!trackingLastPosition) {
        trackingLastPosition =
          selectedObject.position.clone()
      }

      const deltaMove =
        selectedObject.position
          .clone()
          .sub(trackingLastPosition)

      camera.position.add(deltaMove)
      controls.target.copy(selectedObject.position)

      trackingLastPosition.copy(
        selectedObject.position
      )
    }
  }

  // Called when OrbitControls emits 'start'
  function onControlsStart() {
    if (!isEnabled) return
    // User started interacting manually -> stop automatic tracking so controls take over
    if (isTracking) {
      isTracking = false
    }
    // Ensure controls are enabled for manual interaction
    controls.enabled = true
  }

  // Additional DOM-level detection for manual interaction (covers pointer/touch)
  function onUserInteractionStart() {
    if (!isEnabled) return
    if (isTracking) {
      isTracking = false
    }
    controls.enabled = true
  }

  function dispose() {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('click', onClick)
    // remove controls listener
    if (controls && controls.removeEventListener) {
      controls.removeEventListener('start', onControlsStart)
    }
    // remove DOM listener
    if (renderer?.domElement && renderer.domElement.removeEventListener) {
      renderer.domElement.removeEventListener('pointerdown', onUserInteractionStart)
    }
  }

  /* ─────────────────────────────
     Init
  ───────────────────────────── */

  const HOME_CAMERA_POS = new THREE.Vector3(0, 3000, 15000)
  const HOME_LOOK_AT = new THREE.Vector3(0, 0, 0)

  function goHome() {
    if (isSurfaceMode) {
      exitSurface()
    }
    timeController?.freeze()

    selectedObject = null
    isTracking = false
    trackingLastPosition = null

    isFlying = false
    flyTargetBody = null
    flyCameraOffset = null

    // Notify host that selection was cleared
    try {
      onSelectionChange?.('')
    } catch (e) {
      // noop
    }

    // Restore controls immediately if we saved state
    if (prevControlsState) {
      try {
        controls.enabled = prevControlsState.enabled ?? true
        controls.enableRotate = prevControlsState.enableRotate ?? true
        controls.enablePan = prevControlsState.enablePan ?? true
        controls.enableZoom = prevControlsState.enableZoom ?? true
        controls.enableDamping = prevControlsState.enableDamping ?? false
      } catch (e) {
        controls.enabled = true
        controls.enableRotate = true
        controls.enablePan = true
        controls.enableZoom = true
        controls.enableDamping = prevControlsState?.enableDamping ?? false
      }
      prevControlsState = null
    } else {
      controls.enabled = true
      controls.enableRotate = true
      controls.enablePan = true
      controls.enableZoom = true
      controls.enableDamping = false
    }

    controls.minDistance = defaultMinDistance
    controls.maxDistance = defaultMaxDistance

    flyFromCameraPos = camera.position.clone()
    flyFromTarget = controls.target.clone()

    flyToCameraPos = HOME_CAMERA_POS.clone()
    flyToTarget = HOME_LOOK_AT.clone()

    flyStartMs = performance.now()
    flyDurationMs = 1600

    isFlying = true
  }

  /* ─────────────────────────────
     Surface Mode - Mars Landing
  ───────────────────────────── */

  function landOnPlanet(planetId) {
    // For now, only Mars is supported
    if (planetId !== 'mars') {
      console.warn(`Landing on ${planetId} not yet implemented`)
      return
    }

    const planetBody = planets.find(p => p.userData?.name === planetId)
    if (!planetBody) {
      console.error(`Planet ${planetId} not found`)
      return
    }

    const config = getPlanetConfig(planetId)
    if (!config || !config.landable) {
      console.error(`Planet ${planetId} is not landable`)
      return
    }

    console.log('🚀 Starting landing sequence...')

    // Freeze time and disable orbital interactions
    timeController?.freeze()
    isEnabled = false
    controls.enabled = false

    // Get planet info
    const planetPosition = planetBody.position.clone()
    const planetRadius = planetBody.geometry?.parameters?.radius || 10

    // Create surface environment IMMEDIATELY
    surfaceEnvironment = createSimpleMarsEnvironment(
      scene,
      camera,
      planetPosition,
      planetRadius
    )

    // Calculate landing position (standing on surface)
    const landingHeight = 5 // Camera height above ground (eye level)
    const groundLevel = surfaceEnvironment.getGroundLevel()

    // Place camera on surface immediately
    camera.position.set(
      planetPosition.x,
      groundLevel + landingHeight,
      planetPosition.z + 50 // Slight offset from planet center
    )

    // Look forward along the surface
    camera.lookAt(
      planetPosition.x,
      groundLevel + landingHeight,
      planetPosition.z - 1000
    )

    // Mark surface mode as active
    isSurfaceMode = true
    currentSurfacePlanet = planetId

    // 🚀 NEW: Activate First-Person Controls
    surfaceController = createSurfaceController(camera, renderer.domElement, config)
    surfaceController.activate()

    // Hide all solar system objects (planets, orbits, stars, nebula)
    scene.traverse((obj) => {
      // Keep surface environment objects visible
      if (obj.userData?.surfaceMode) {
        obj.visible = true
        return
      }

      // Hide planets, orbits, and markers
      if (obj.isMesh || obj.isLine || obj.isPoints || obj.isGroup || obj.isSprite) {
        obj.visible = false
      }
    })

    // Specifically ensure the landed planet and its label/aura are hidden
    if (planetBody) {
      planetBody.visible = false
      // Traverse children of the body if any (like atmospheres)
      planetBody.traverse(child => { child.visible = false })
    }

    // Keep surface environment visible
    surfaceEnvironment.elements.forEach(el => {
      el.userData.surfaceMode = true
      el.visible = true
    })

    console.log(`✅ Landed on ${planetId}! You're standing on the red surface.`)
    console.log(`Camera position:`, camera.position)
    console.log(`Ground level:`, groundLevel)
  }

  function exitSurface() {
    if (!isSurfaceMode) return false

    console.log('Exiting surface mode...')

    // Cleanup surface mode
    if (surfaceController) {
      surfaceController.dispose()
      surfaceController = null
    }

    if (surfaceEnvironment) {
      surfaceEnvironment.dispose()
      surfaceEnvironment = null
    }

    // Restore all solar system objects visibility
    scene.traverse((obj) => {
      // Restore planets and their children
      if (obj.userData?.isPlanet || obj.userData?.isMoon || obj.userData?.isSun) {
        obj.visible = true
      }

      // Restore orbits
      if (obj.userData?.isOrbit) {
        obj.visible = true
      }

      // Restore major environmental elements like stars/background
      if (obj.userData?.isStarfield || obj.userData?.isNebula) {
        obj.visible = true
      }

      // Clear surface mode flag
      if (obj.userData) {
        delete obj.userData.surfaceMode
      }
    })

    // Note: Zodiac Ring and Aspect lines are NOT hidden/shown here;
    // they should be managed by SolarSystem.vue's showZodiac state.
    // However, during landOnPlanet they were hidden by the generic "hide all" traverse.
    // We should ensure they are hidden/shown based on their own logic.

    isSurfaceMode = false
    currentSurfacePlanet = null

    // Return to orbital view
    isEnabled = true
    controls.enabled = true
    if (timeController) {
      timeController.unfreeze() // Use unfreeze instead of non-existent resume
    }

    return true // Indicate surface was exited
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('click', onClick)

  // Ensure manual control interruptions stop tracking
  if (controls && controls.addEventListener) {
    controls.addEventListener('start', onControlsStart)
  }
  // Add DOM listener to cover pointer/touch interactions
  if (renderer?.domElement && renderer.domElement.addEventListener) {
    renderer.domElement.addEventListener('pointerdown', onUserInteractionStart)
  }

  return {
    update,
    dispose,
    focusPlanetById,
    goHome,
    landOnPlanet,
    exitSurface,
    setEnabled: (val) => {
      isEnabled = val
      if (controls) controls.enabled = val
    }
  }
}
