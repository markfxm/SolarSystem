import * as THREE from 'three'

export function createInteractions({
  engine,
  planets,
  planetNames,
  timeController,
  onHoverNameChange,
  onSelectionChange, // ← callback to notify selection changes
  onPOISelect // ← callback for POI clicks
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
  const lastMousePos = new THREE.Vector2(-999, -999)

  let hoveredObject = null
  let selectedObject = null
  let hoveredPOI = null
  let selectedPOI = null
  let isEnabled = true

  // Temp vectors for performance (avoid GC)
  const _trackingDelta = new THREE.Vector3()
  const _tempVec3 = new THREE.Vector3()
  const _tempLookAt = new THREE.Vector3()
  let lastMouseMoveTime = 0

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

  /* ─────────────────────────────
     Utilities
  ───────────────────────────── */

  function getFlyToPositions(body) {
    let radius = 5
    if (body.geometry?.parameters?.radius) {
      radius = body.geometry.parameters.radius
    } else {
      // Support for Blender models: compute approximate radius from bounding box
      const box = new THREE.Box3().setFromObject(body)
      const size = new THREE.Vector3()
      box.getSize(size)
      radius = Math.max(size.x, size.y, size.z) * 0.5
    }

    // Distance and vertical offset for an "above-front" perspective
    const distance = Math.max(radius * 5, 20)
    const verticalOffset = Math.max(radius * 1.5, 6)

    return {
      cameraPos: body.position.clone().add(
        new THREE.Vector3(0, verticalOffset, distance)
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

    // Throttle raycasting to ~30fps to save CPU during mouse movement
    const now = performance.now()
    if (now - lastMouseMoveTime < 32) return

    const mx = (event.clientX / window.innerWidth) * 2 - 1
    const my = -(event.clientY / window.innerHeight) * 2 + 1

    // Threshold check: only raycast if mouse moved significantly
    const distSq = (mx - lastMousePos.x) ** 2 + (my - lastMousePos.y) ** 2
    if (distSq < 0.0001) return

    lastMouseMoveTime = now
    mouse.x = mx
    mouse.y = my
    lastMousePos.copy(mouse)

    raycaster.setFromCamera(mouse, camera)

    // Check for POIs first (they are smaller and "on top")
    let hitPOI = null
    const poiCandidates = []
    planets.forEach(p => {
      if (p.userData.pois && p.userData.pois.visible) {
        p.userData.pois.children.forEach(poiGroup => {
          // Raycast against both dot and label for better hit area
          poiCandidates.push(...poiGroup.children)
          // Reset hover state
          poiGroup.userData.isHovered = false
        })
      }
    })

    const poiHits = raycaster.intersectObjects(poiCandidates, false)
    if (poiHits.length > 0) {
      // Find the parent POI group
      hitPOI = poiHits[0].object.parent
      hitPOI.userData.isHovered = true

      if (hoveredPOI !== hitPOI) {
        hoveredPOI = hitPOI
        renderer.domElement.style.cursor = 'pointer'
      }
      // If hovering a POI, we don't want to hover the planet behind it
      if (hoveredObject !== null) {
        hoveredObject = null
        onHoverNameChange?.('')
      }
    } else {
      if (hoveredPOI !== null) {
        hoveredPOI = null
        renderer.domElement.style.cursor = 'default'
      }
    }

    if (hitPOI) return

    // Use recursive: true to support Blender models (Groups/Scenes)
    const hits = raycaster.intersectObjects(planets, true)

    if (hits.length > 0) {
      // Find the top-level planet object from the hit (could be a child mesh of a GLB)
      let current = hits[0].object
      while (current && !planets.includes(current)) {
        current = current.parent
      }

      if (current && hoveredObject !== current) {
        hoveredObject = current
        onHoverNameChange?.(
          planetNames[current.userData.name] ?? ''
        )
      }
    } else {
      if (hoveredObject !== null) {
        hoveredObject = null
        onHoverNameChange?.('')
      }
    }
  }

  function onClick() {
    if (!isEnabled) return

    if (hoveredPOI) {
      selectedPOI = hoveredPOI
      onPOISelect?.(hoveredPOI.userData)
      return
    }

    if (!hoveredObject) {
      // Clicked on empty space -> clear POI selection
      if (selectedPOI) {
        selectedPOI = null
        onPOISelect?.(null)
      }
      return
    }

    // If we are already viewing a planet (selectedObject is set),
    // prevent clicking on OTHER planets to avoid accidental jumps (e.g. to Sun).
    if (selectedObject && hoveredObject !== selectedObject) {
      return
    }

    startFlyTo(hoveredObject)
    // Clear POI when switching/selecting planet
    selectedPOI = null
    onPOISelect?.(null)
  }

  /* ─────────────────────────────
     Public API
  ───────────────────────────── */

  function focusPlanetById(id) {
    const target = planets.find(
      p => p.userData.name === id
    )
    if (!target) return

    startFlyTo(target)
  }

  function update(deltaSeconds = 0) {
    const now = performance.now()

    // Smooth fly-to
    if (isFlying && flyFromCameraPos && flyToCameraPos) {
      if (flyTargetBody && flyCameraOffset) {
        // Use scratch variables to avoid cloning every frame
        _tempVec3.copy(flyTargetBody.position)
        flyToTarget.copy(_tempVec3)
        flyToCameraPos.copy(_tempVec3).add(flyCameraOffset)
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

      _tempLookAt.lerpVectors(
        flyFromTarget,
        flyToTarget,
        eased
      )

      controls.target.copy(_tempLookAt)

      if (t >= 1) {
        // Fly complete
        camera.position.copy(flyToCameraPos)
        controls.target.copy(flyToTarget)
        controls.update()

        finishFly()
      }
    }

    // Planet tracking
    if (!isFlying && isTracking && selectedObject) {
      if (!trackingLastPosition) {
        trackingLastPosition = selectedObject.position.clone()
      }

      _trackingDelta.copy(selectedObject.position).sub(trackingLastPosition)

      camera.position.add(_trackingDelta)
      controls.target.copy(selectedObject.position)

      trackingLastPosition.copy(selectedObject.position)
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
    renderer.domElement.removeEventListener('mousemove', onMouseMove)
    renderer.domElement.removeEventListener('click', onClick)
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

  const HOME_CAMERA_POS = new THREE.Vector3(0, 500, 1500)
  const HOME_LOOK_AT = new THREE.Vector3(0, 0, 0)

  function goHome() {
    timeController?.freeze()

    selectedObject = null
    selectedPOI = null
    onPOISelect?.(null)
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

  renderer.domElement.addEventListener('mousemove', onMouseMove)
  renderer.domElement.addEventListener('click', onClick)

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
    setEnabled: (val) => {
      isEnabled = val
      if (controls) controls.enabled = val
    }
  }
}
