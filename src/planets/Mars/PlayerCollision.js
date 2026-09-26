// Static AABBs indexed in horizontal cells. The grounded player is a vertical cylinder.
// Substeps shorter than its radius prevent crossing even thin walls in a long frame.
export function createPlayerCollision({ radius = 0.4, height = 1.8, cellSize = 12 } = {}) {
  const cells = new Map()
  const boxes = new Set()

  // Performance Optimization: Reusable scratch set to eliminate temporary Set and Array allocations
  // during high-frequency 60fps collision spatial queries.
  const _scratchBoxSet = new Set()

  // Performance Optimization: Fast numeric cell key calculation avoids string interpolation (${x},${z})
  // and eliminates string object allocations in Map key lookups.
  function cellKey(x, z) {
    return (x + 2000000) * 4000000 + (z + 2000000)
  }

  function addBox(min, max, { vehiclePassable = false } = {}) {
    const box = { min: { ...min }, max: { ...max }, vehiclePassable, occupied: [] }
    boxes.add(box)
    indexBox(box)
    return () => {
      boxes.delete(box)
      for (let i = 0; i < box.occupied.length; i++) {
        const key = box.occupied[i]
        const cell = cells.get(key)
        cell?.delete(box)
        if (cell?.size === 0) cells.delete(key)
      }
    }
  }

  function indexBox(box) {
    const minX = Math.floor(box.min.x / cellSize)
    const maxX = Math.floor(box.max.x / cellSize)
    const minZ = Math.floor(box.min.z / cellSize)
    const maxZ = Math.floor(box.max.z / cellSize)

    box.occupied.length = 0
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const key = cellKey(x, z)
        box.occupied.push(key)
        let cell = cells.get(key)
        if (!cell) {
          cell = new Set()
          cells.set(key, cell)
        }
        cell.add(box)
      }
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

  // Performance Optimization: Populates candidate boxes into a reusable scratch Set without heap allocations.
  function populateNearby(x, z, checkRadius = radius) {
    _scratchBoxSet.clear()
    const minX = Math.floor((x - checkRadius) / cellSize)
    const maxX = Math.floor((x + checkRadius) / cellSize)
    const minZ = Math.floor((z - checkRadius) / cellSize)
    const maxZ = Math.floor((z + checkRadius) / cellSize)

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        const cell = cells.get(cellKey(cx, cz))
        if (cell) {
          for (const box of cell) {
            _scratchBoxSet.add(box)
          }
        }
      }
    }
  }

  function move(position, displacement, groundHeight) {
    const dispX = displacement.x
    const dispZ = displacement.z
    // Performance Optimization: Direct sqrt replaces Math.hypot for step count calculation.
    const dispLen = Math.sqrt(dispX * dispX + dispZ * dispZ)
    const steps = Math.max(1, Math.ceil(dispLen / (radius * 0.5)))
    const dx = dispX / steps, dz = dispZ / steps
    const radiusSq = radius * radius

    for (let step = 0; step < steps; step++) {
      let x = position.x + dx, z = position.z + dz
      // Re-query after correction; corners can involve several adjacent props.
      for (let pass = 0; pass < 8; pass++) {
        let corrected = false
        const feet = groundHeight(x, z)
        populateNearby(x, z)

        for (const box of _scratchBoxSet) {
          if (feet >= box.max.y || feet + height <= box.min.y) continue
          const closestX = Math.max(box.min.x, Math.min(box.max.x, x))
          const closestZ = Math.max(box.min.z, Math.min(box.max.z, z))
          const nx = x - closestX, nz = z - closestZ
          const distanceSq = nx * nx + nz * nz

          // Performance Optimization: Compare squared distance first to avoid Math.sqrt on non-colliding AABBs.
          if (distanceSq >= radiusSq) continue

          if (distanceSq > 1e-12) {
            const distance = Math.sqrt(distanceSq)
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
    const clearanceSq = clearance * clearance
    const minX = Math.floor((position.x - clearance) / cellSize)
    const maxX = Math.floor((position.x + clearance) / cellSize)
    const minZ = Math.floor((position.z - clearance) / cellSize)
    const maxZ = Math.floor((position.z + clearance) / cellSize)

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        const cell = cells.get(cellKey(cx, cz))
        if (!cell) continue
        for (const box of cell) {
          if (forVehicle && box.vehiclePassable) continue
          if (position.y >= box.max.y || position.y + bodyHeight <= box.min.y) continue
          const x = Math.max(box.min.x, Math.min(box.max.x, position.x))
          const z = Math.max(box.min.z, Math.min(box.max.z, position.z))
          const dx = position.x - x, dz = position.z - z
          // Performance Optimization: Compare squared distance directly to skip Math.sqrt calculations.
          if (dx * dx + dz * dz < clearanceSq) return false
        }
      }
    }
    return true
  }

  return { addBox, move, isClear, shiftOrigin, clear: () => { cells.clear(); boxes.clear() } }
}
