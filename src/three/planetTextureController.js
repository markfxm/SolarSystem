export function createPlanetTextureController({
  maps,
  loadTexture,
  planetInstances,
  detailController,
  schedule = callback => requestAnimationFrame(callback),
  onLoaded = () => {},
  onError = () => {}
}) {
  const textures = new Map()
  const pending = new Map()

  const getKeys = name => {
    if (name === 'earth') return ['earth_day', 'earth_night']
    return maps[name] ? [name] : []
  }

  const loadKey = (name, key) => {
    if (textures.has(key)) return Promise.resolve(textures.get(key))
    if (pending.has(key)) return pending.get(key)

    const request = loadTexture(maps[key])
      .then(texture => {
        textures.set(key, texture)
        pending.delete(key)
        onLoaded(name, key)
        return texture
      })
      .catch(error => {
        pending.delete(key)
        onError(name, key, error)
        throw error
      })

    pending.set(key, request)
    return request
  }

  const preload = async name => {
    const keys = getKeys(name)
    if (keys.length === 0) return false
    try {
      await Promise.all(keys.map(key => loadKey(name, key)))
      return true
    } catch (error) {
      return false
    }
  }

  const apply = name => {
    const keys = getKeys(name)
    const instance = planetInstances[name]
    if (!instance || keys.length === 0 || keys.some(key => !textures.has(key))) return false

    detailController.prioritize(name)

    const applyKey = index => {
      const key = keys[index]
      instance.updateHQ(textures.get(key), key.includes('night'))
      if (index + 1 < keys.length) schedule(() => applyKey(index + 1))
    }

    applyKey(0)
    return true
  }

  const prioritize = async name => {
    const loaded = await preload(name)
    return loaded ? apply(name) : false
  }

  return { preload, apply, prioritize }
}
