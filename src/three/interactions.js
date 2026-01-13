import * as THREE from 'three'

export function createInteractions({
  engine,
  planets,
  planetNames,
  timeController,
  onHoverNameChange,
  onSelectionChange // ← NEW: callback to notify selection changes
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
    if (!hoveredObject) return

    startFlyTo(hoveredObject)
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
        camera.position.copy(flyToCameraPos)
        controls.target.copy(flyToTarget)
        finishFly()
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

    // Always update the rotation of the selected object using deltaSeconds
    if (selectedObject) {
      const rotSpeed = selectedObject.userData.rotationSpeed || 0
      selectedObject.rotation.y += rotSpeed * deltaSeconds
      // ensure visibility
      if (!selectedObject.visible) {
        selectedObject.visible = true
      }
    }
  }

  // Called when OrbitControls emits 'start'
  function onControlsStart() {
    // User started interacting manually -> stop automatic tracking so controls take over
    if (isTracking) {
      isTracking = false
    }
    // Ensure controls are enabled for manual interaction
    controls.enabled = true
  }

  // Additional DOM-level detection for manual interaction (covers pointer/touch)
  function onUserInteractionStart() {
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
    goHome
  }
}
