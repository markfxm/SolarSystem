// Static AABBs indexed in horizontal cells. The grounded player is a vertical cylinder.
// Substeps shorter than its radius prevent crossing even thin walls in a long frame.
export function createPlayerCollision({ radius = 0.4, height = 1.8, cellSize = 12 } = {}) {
  const cells = new Map()
  const boxes = new Set()
  function keys(minX, maxX, minZ, maxZ) {
    const result = []
    for (let x = Math.floor(minX / cellSize); x <= Math.floor(maxX / cellSize); x++) {
      for (let z = Math.floor(minZ / cellSize); z <= Math.floor(maxZ / cellSize); z++) result.push(`${x},${z}`)
    }
    return result
  }
  function addBox(min, max, { vehiclePassable = false } = {}) {
    const box = { min: { ...min }, max: { ...max }, vehiclePassable, occupied: [] }
    boxes.add(box)
    indexBox(box)
    return () => {
      boxes.delete(box)
      for (const key of box.occupied) {
        const cell = cells.get(key)
        cell?.delete(box)
        if (cell?.size === 0) cells.delete(key)
      }
    }
  }
  function indexBox(box) {
    box.occupied = keys(box.min.x, box.max.x, box.min.z, box.max.z)
    for (const key of box.occupied) {
      if (!cells.has(key)) cells.set(key, new Set())
      cells.get(key).add(box)
    }
  }
  function shiftOrigin(dx, dz) {
    cells.clear()
    for (const box of boxes) {
      box.min.x -= dx; box.max.x -= dx
      box.min.z -= dz; box.max.z -= dz
      indexBox(box)
    }
  }
  function nearby(x, z) {
    const boxes = new Set()
    for (const key of keys(x - radius, x + radius, z - radius, z + radius)) {
      for (const box of cells.get(key) || []) boxes.add(box)
    }
    return boxes
  }
  function move(position, displacement, groundHeight) {
    const steps = Math.max(1, Math.ceil(Math.hypot(displacement.x, displacement.z) / (radius * 0.5)))
    const dx = displacement.x / steps, dz = displacement.z / steps
    for (let step = 0; step < steps; step++) {
      let x = position.x + dx, z = position.z + dz
      // Re-query after correction; corners can involve several adjacent props.
      for (let pass = 0; pass < 8; pass++) {
        let corrected = false
        const feet = groundHeight(x, z)
        for (const box of nearby(x, z)) {
          if (feet >= box.max.y || feet + height <= box.min.y) continue
          const closestX = Math.max(box.min.x, Math.min(box.max.x, x))
          const closestZ = Math.max(box.min.z, Math.min(box.max.z, z))
          const nx = x - closestX, nz = z - closestZ
          const distance = Math.hypot(nx, nz)
          if (distance >= radius) continue
          if (distance > 0.000001) {
            const correction = (radius - distance + 0.00001) / distance
            x += nx * correction; z += nz * correction
          } else {
            // Recovery if an object was streamed in around the player.
            const edges = [
              { depth: x - box.min.x, x: box.min.x - radius, z },
              { depth: box.max.x - x, x: box.max.x + radius, z },
              { depth: z - box.min.z, x, z: box.min.z - radius },
              { depth: box.max.z - z, x, z: box.max.z + radius },
            ]
            edges.sort((a, b) => a.depth - b.depth)
            x = edges[0].x; z = edges[0].z
          }
          corrected = true
        }
        if (!corrected) break
      }
      position.x = x; position.z = z
    }
    return position
  }
  function isClear(position, clearance = radius, bodyHeight = height, forVehicle = false) {
    for (const key of keys(position.x - clearance, position.x + clearance, position.z - clearance, position.z + clearance)) {
      for (const box of cells.get(key) || []) {
        if (forVehicle && box.vehiclePassable) continue
        if (position.y >= box.max.y || position.y + bodyHeight <= box.min.y) continue
        const x = Math.max(box.min.x, Math.min(box.max.x, position.x))
        const z = Math.max(box.min.z, Math.min(box.max.z, position.z))
        if (Math.hypot(position.x - x, position.z - z) < clearance) return false
      }
    }
    return true
  }
  return { addBox, move, isClear, shiftOrigin, clear: () => { cells.clear(); boxes.clear() } }
}
