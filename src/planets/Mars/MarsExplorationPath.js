const STORAGE_KEY = 'mars_exploration_path'
const MAX_POINTS = 2048

// Ground-plane sampling and persistence, independent of camera height and WebGL.
export function createMarsExplorationPath(storage) {
  let points = [], lastPosition = null, saveTimeout = null, saveFailed = false
  function save() {
    saveTimeout = null
    if (saveFailed) return
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(points))
    } catch (error) {
      saveFailed = true
      console.warn('Failed to save exploration path; keeping this session in memory', error)
    }
  }
  try {
    const saved = storage.getItem(STORAGE_KEY)
    if (saved) {
      const loaded = JSON.parse(saved)
      if (Array.isArray(loaded)) {
        // Read backwards to recover recent distinct points from old duplicate-heavy saves.
        for (let i = loaded.length - 1; i >= 0 && points.length < MAX_POINTS; i--) {
          const point = loaded[i], previous = points[points.length - 1]
          if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z)) continue
          const x = Math.round(point.x), z = Math.round(point.z)
          if (!previous || previous.x !== x || previous.z !== z) points.push({ x, z })
        }
        points.reverse()
      }
      if (JSON.stringify(points) !== saved) save()
    }
  } catch (error) {
    console.warn('Failed to load exploration path', error)
  }
  lastPosition = points.length ? { ...points[points.length - 1] } : null
  return {
    get points() { return points },
    record(position) {
      if (!Number.isFinite(position.x) || !Number.isFinite(position.z)) return
      if (lastPosition) {
        const dx = position.x - lastPosition.x, dz = position.z - lastPosition.z
        if (dx * dx + dz * dz <= 25) return
      }
      points.push({ x: Math.round(position.x), z: Math.round(position.z) })
      if (points.length > MAX_POINTS) points.splice(0, points.length - MAX_POINTS)
      lastPosition = { x: position.x, z: position.z }
      if (saveTimeout === null && !saveFailed) saveTimeout = setTimeout(save, 2000)
    },
    clear(position) {
      points = []
      lastPosition = { x: position.x, z: position.z }
      if (saveTimeout !== null) clearTimeout(saveTimeout)
      saveTimeout = null
      saveFailed = false
      try {
        storage.removeItem(STORAGE_KEY)
      } catch (error) {
        saveFailed = true
        console.warn('Failed to clear saved exploration path', error)
      }
    },
    dispose() {
      if (saveTimeout !== null) {
        clearTimeout(saveTimeout)
        save()
      }
    },
  }
}
