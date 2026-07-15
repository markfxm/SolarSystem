import { unitSphereGeometry, detailSphereGeometry } from './geometries.js'

export function createPlanetDetailController(planetObjects) {
  let activeName = null

  return {
    get activeName() {
      return activeName
    },

    prioritize(name) {
      const nextMesh = planetObjects[name]
      if (!nextMesh) return false

      if (activeName && activeName !== name) {
        const previousMesh = planetObjects[activeName]
        if (previousMesh) previousMesh.geometry = unitSphereGeometry
      }

      nextMesh.geometry = detailSphereGeometry
      activeName = name
      return true
    }
  }
}
