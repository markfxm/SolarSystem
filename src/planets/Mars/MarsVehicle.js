import * as THREE from 'three'

export const vehicleConfig = { interactionRadius: 4.5, maxForwardSpeed: 18, maxReverseSpeed: 6, acceleration: 4, braking: 8, drag: 2, steeringSpeed: 0.7, mouseSensitivity: 0.008, steeringDamping: 8, steeringReturn: 3, maxWheelAngle: 0.45 }

export function createMarsVehicle(rover, camera, collision, getHeight, scanner) {
  rover.userData.releaseStaticCollider?.()
  const state = { mode: 'ON_FOOT', speed: 0, canEnter: false, exitBlocked: false }
  const position = new THREE.Vector3(), candidate = new THREE.Vector3()
  const offset = new THREE.Vector3(), desired = new THREE.Vector3(), look = new THREE.Vector3()
  let removeCollider = () => {}
  let mouseSteer = 0, steering = 0
  function clearInput() { mouseSteer = 0 }
  function steerMouse(movementX) {
    if (state.mode !== 'IN_VEHICLE' || !Number.isFinite(movementX)) return
    mouseSteer = THREE.MathUtils.clamp(mouseSteer - movementX * vehicleConfig.mouseSensitivity, -1, 1)
  }
  function getPosition() { return rover.getWorldPosition(position) }
  function syncCollider() {
    removeCollider()
    rover.updateWorldMatrix(true, false)
    const box = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 2.05, 0), new THREE.Vector3(4.6, 4.1, 5.7)).applyMatrix4(rover.matrixWorld)
    removeCollider = collision.addBox(box.min, box.max)
  }
  syncCollider()
  function refresh() {
    state.canEnter = state.mode === 'ON_FOOT' && camera.position.distanceTo(getPosition().clone().add(new THREE.Vector3(0, 1.7, 0))) <= vehicleConfig.interactionRadius
  }
  function interact() {
    refresh()
    if (state.mode === 'ON_FOOT') {
      if (!state.canEnter) return false
      state.mode = 'IN_VEHICLE'; state.canEnter = false; state.exitBlocked = false
      clearInput(); steering = 0
      scanner.visible = false
      return true
    }
    getPosition()
    // Try both sides, then front/rear. Reject occupied exits instead of pushing
    // the astronaut through nearby camp equipment or rocks.
    for (const [x, z] of [[-5, 0], [5, 0], [0, -6], [0, 6]]) {
      offset.set(x, 0, z).applyAxisAngle(THREE.Object3D.DEFAULT_UP, rover.rotation.y)
      candidate.copy(position).add(offset)
      candidate.y = getHeight(candidate.x, candidate.z)
      if (!collision.isClear(candidate, 0.5, 1.8)) continue
      camera.position.copy(candidate); camera.position.y += 1.7
      state.mode = 'ON_FOOT'; state.speed = 0; state.exitBlocked = false
      clearInput(); steering = 0
      rover.userData.animateWheels?.(0, 0)
      scanner.visible = true
      return true
    }
    state.exitBlocked = true
    return true
  }
  function update(delta, keys, active) {
    refresh()
    if (state.mode !== 'IN_VEHICLE') return
    let remaining = Math.min(delta, 0.1)
    removeCollider()
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 60); remaining -= dt
      const throttle = active ? Number(!!keys.w) - Number(!!keys.s) : 0
      const target = throttle > 0 ? vehicleConfig.maxForwardSpeed : throttle < 0 ? -vehicleConfig.maxReverseSpeed : 0
      const rate = !throttle ? vehicleConfig.drag : state.speed * throttle < 0 ? vehicleConfig.braking : vehicleConfig.acceleration
      state.speed += THREE.MathUtils.clamp(target - state.speed, -rate * dt, rate * dt)
      const keyboard = Number(!!keys.a) - Number(!!keys.d)
      const targetSteer = active ? (keyboard || mouseSteer) : 0
      steering = THREE.MathUtils.damp(steering, targetSteer, vehicleConfig.steeringDamping, dt)
      mouseSteer *= Math.exp(-vehicleConfig.steeringReturn * dt)
      const turn = steering
      const heading = rover.rotation.y + turn * vehicleConfig.steeringSpeed * Math.min(Math.abs(state.speed) / 5, 1) * Math.sign(state.speed) * dt
      getPosition()
      candidate.copy(position).addScaledVector(offset.set(Math.sin(heading), 0, Math.cos(heading)), state.speed * dt)
      candidate.y = getHeight(candidate.x, candidate.z)
      // Conservative circular footprint covers the full rover at any yaw.
      if (collision.isClear(candidate, 3.7, 4.1, true)) {
        rover.userData.animateWheels?.(Math.hypot(candidate.x - position.x, candidate.z - position.z) * Math.sign(state.speed), steering * vehicleConfig.maxWheelAngle)
        rover.position.add(candidate.sub(position)); rover.rotation.y = heading
        getPosition()
        const forwardX = Math.sin(heading), forwardZ = Math.cos(heading)
        const rise = getHeight(position.x + forwardX * 2, position.z + forwardZ * 2) - getHeight(position.x - forwardX * 2, position.z - forwardZ * 2)
        const cross = getHeight(position.x + forwardZ * 2, position.z - forwardX * 2) - getHeight(position.x - forwardZ * 2, position.z + forwardX * 2)
        rover.rotation.order = 'YXZ'
        rover.rotation.x = THREE.MathUtils.damp(rover.rotation.x, -Math.atan2(rise, 4), 5, dt)
        rover.rotation.z = THREE.MathUtils.damp(rover.rotation.z, Math.atan2(cross, 4), 5, dt)
      } else {
        state.speed = 0
        rover.userData.animateWheels?.(0, steering * vehicleConfig.maxWheelAngle)
      }
    }
    syncCollider()
    getPosition()
    desired.copy(position).add(offset.set(0, 7, -12).applyAxisAngle(THREE.Object3D.DEFAULT_UP, rover.rotation.y))
    desired.y = Math.max(desired.y, getHeight(desired.x, desired.z) + 2)
    camera.position.lerp(desired, 1 - Math.exp(-5 * delta))
    camera.position.y = Math.max(camera.position.y, getHeight(camera.position.x, camera.position.z) + 0.5)
    look.copy(position).add(offset.set(0, 2.5, 5).applyAxisAngle(THREE.Object3D.DEFAULT_UP, rover.rotation.y))
    const rotation = camera.quaternion.clone()
    camera.lookAt(look)
    camera.quaternion.slerpQuaternions(rotation, camera.quaternion.clone(), 1 - Math.exp(-7 * delta))
  }
  return { state, getPosition, interact, update, steerMouse, clearInput, dispose: () => removeCollider() }
}
