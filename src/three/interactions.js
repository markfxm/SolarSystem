import * as THREE from 'three'

export function createInteractions({
  engine,
  planets,
  planetNames,
  timeController,
  onHoverNameChange
}) {
  const { camera, controls, renderer, scene } = engine

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

    flyFromCameraPos = camera.position.clone()
    flyFromTarget = controls.target.clone()

    flyToCameraPos = cameraPos
    flyToTarget = lookAt

    flyStartMs = performance.now()
    flyTargetBody = body
    flyCameraOffset = cameraPos.clone().sub(body.position)

    isFlying = true
    isTracking = true
    trackingLastPosition = null

    prevControlsState = {
      enableRotate: controls.enableRotate,
      enablePan: controls.enablePan,
      enableZoom: controls.enableZoom,
      enableDamping: controls.enableDamping,
      minDistance: controls.minDistance,
      maxDistance: controls.maxDistance
    }

    controls.enableRotate = false
    controls.enablePan = false
    controls.enableZoom = false
    controls.enableDamping = false
    controls.minDistance = minDistance

    const dist = flyFromCameraPos.distanceTo(flyToCameraPos)
    flyDurationMs = Math.min(4500, Math.max(1200, dist * 3))
  }

  function finishFly() {
    isFlying = false

    if (prevControlsState) {
      Object.assign(controls, prevControlsState)
      prevControlsState = null
    }

    trackingLastPosition = null
    timeController?.unfreeze()

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

    if (selectedObject && selectedObject !== hoveredObject) {
      selectedObject.scale.set(1, 1, 1)
    }

    selectedObject = hoveredObject
    startFlyTo(selectedObject)
  }

  /* ─────────────────────────────
     Public API
  ───────────────────────────── */

  function focusPlanetById(id) {
    const target = planets.find(
      p => p.userData.name === id
    )
    if (!target) return

    if (selectedObject && selectedObject !== target) {
      selectedObject.scale.set(1, 1, 1)
    }

    selectedObject = target
    startFlyTo(target)
  }

  function update() {
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
  }

  function dispose() {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('click', onClick)
  }

  /* ─────────────────────────────
     Init
  ───────────────────────────── */

  const HOME_CAMERA_POS = new THREE.Vector3(0, 300, 1200)
  const HOME_LOOK_AT = new THREE.Vector3(0, 0, 0)

  function goHome() {
    timeController?.freeze()

    // cancel selection & tracking
    selectedObject = null
    isTracking = false
    trackingLastPosition = null

    // cancel fly state
    isFlying = false
    flyTargetBody = null
    flyCameraOffset = null

    // restore controls immediately
    if (prevControlsState) {
        Object.assign(controls, prevControlsState)
        prevControlsState = null
    }

    // start smooth fly back to home
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

  return {
    update,
    dispose,
    focusPlanetById,
    goHome
  }
}
