import * as THREE from 'three'

export function createSunController(planets) {
  const sunDirection = new THREE.Vector3()

  function update() {
    const now = new Date()

    const doy =
      (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
        Date.UTC(now.getUTCFullYear(), 0, 0)) / 86400000

    const declination =
      23.45 * Math.sin((2 * Math.PI * (doy - 81)) / 365)

    const hours =
      now.getUTCHours() + now.getUTCMinutes() / 60

    const longitude = (hours - 12) * 15

    const phi = (90 - declination) * Math.PI / 180
    const theta = longitude * Math.PI / 180

    sunDirection
      .set(
        -Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      )
      .normalize()

    // Push to planet shaders
    planets.forEach(p => {
      if (p.material?.uniforms?.sunDirection) {
        p.material.uniforms.sunDirection.value.copy(sunDirection)
      }
    })
  }

  return { update }
}
