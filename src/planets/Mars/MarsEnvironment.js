import * as THREE from 'three'

// Seeded detail keeps the same site stable across frame updates and revisits.
export function marsRandom(seed = 71) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

export function createRockGeometry(detail = 2, seed = 1) {
  const geometry = new THREE.IcosahedronGeometry(1, detail)
  const position = geometry.attributes.position
  const color = new Float32Array(position.count * 3)
  const tone = new THREE.Color()
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i)
    // Continuous deformation preserves shared edges and avoids cracked triangles.
    const shape = 1 + 0.18 * Math.sin(x * 6 + seed) * Math.cos(z * 5 - seed) + 0.12 * Math.sin(y * 9 + x * 4)
    position.setXYZ(i, x * shape, y * shape * 0.72, z * shape)
    const strata = 0.78 + 0.14 * Math.sin(y * 18 + x * 4) + 0.08 * Math.cos(z * 13)
    tone.setRGB(strata, strata * 0.91, strata * 0.83)
    tone.toArray(color, i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(color, 3))
  geometry.computeVertexNormals()
  return geometry
}

// These small canvas textures are instrument readouts and manufactured surface detail.
export function makeSurfaceTexture(kind) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = kind === 'scanner' ? 512 : 256
  const ctx = canvas.getContext('2d')
  const size = canvas.width
  const random = marsRandom(31)
  if (kind === 'glow' || kind === 'dust') {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, kind === 'glow' ? '#fff' : 'rgba(255,255,255,.24)')
    gradient.addColorStop(0.2, 'rgba(255,255,255,.28)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  } else if (kind === 'scanner') {
    ctx.fillStyle = '#031725'
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = '#153e53'
    ctx.lineWidth = 1
    for (let i = 24; i < size; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 95); ctx.lineTo(i, 420); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(24, i); ctx.lineTo(488, i); ctx.stroke()
    }
    ctx.strokeStyle = '#42caff'
    for (let r = 40; r <= 130; r += 45) {
      ctx.beginPath(); ctx.arc(256, 258, r, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(256, 258); ctx.lineTo(330, 160); ctx.stroke()
    ctx.fillStyle = '#b7f0ff'
    ctx.font = 'bold 29px monospace'; ctx.fillText('SPECTRAL SCANNER', 25, 46)
    ctx.font = '18px monospace'; ctx.fillText('CH -- / READY', 25, 78)
    ctx.fillStyle = '#64dfff'
    ctx.beginPath(); ctx.arc(320, 185, 7, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#8ceaff'; ctx.beginPath()
    for (let i = 0; i < 450; i++) {
      const h = 404 - Math.sin(i * 0.07) * 10 - Math.exp(-(((i - 285) / 35) ** 2)) * 75
      if (i === 0) ctx.moveTo(30 + i, h); else ctx.lineTo(30 + i, h)
    }
    ctx.stroke()
    ctx.font = '19px monospace'; ctx.fillText('SIGNAL --', 25, 458)
    ctx.fillStyle = '#ffb658'; ctx.fillRect(25, 481, 170, 5)
  } else if (kind === 'solar') {
    ctx.fillStyle = '#10283e'; ctx.fillRect(0, 0, size, size)
    for (let x = 0; x < 4; x++) for (let y = 0; y < 6; y++) {
      ctx.fillStyle = `rgb(${12 + x * 2}, ${33 + y * 2}, ${57 + x * 3})`
      ctx.fillRect(x * 64 + 3, y * 42 + 3, 58, 36)
      ctx.strokeStyle = '#54728b'; ctx.lineWidth = 0.6
      for (let line = 0; line < 12; line++) {
        ctx.beginPath(); ctx.moveTo(x * 64 + 5, y * 42 + 5 + line * 2.6); ctx.lineTo(x * 64 + 59, y * 42 + 5 + line * 2.6); ctx.stroke()
      }
      ctx.fillStyle = '#a1a8a7'; ctx.fillRect(x * 64 + 19, y * 42 + 3, 1, 36); ctx.fillRect(x * 64 + 43, y * 42 + 3, 1, 36)
    }
  } else {
    ctx.fillStyle = '#b9b2a5'; ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 14000; i++) {
      const value = 110 + Math.floor(random() * 120)
      ctx.fillStyle = `rgba(${value},${value},${value},.24)`
      ctx.fillRect(random() * size, random() * size, 1 + random() * 3, 1)
    }
    for (let i = 0; i < 80; i++) {
      ctx.strokeStyle = `rgba(62,42,25,${random() * 0.18})`
      const x = random() * size, y = random() * size
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + random() * 20, y + random() * 2); ctx.stroke()
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  if (kind === 'metal' || kind === 'solar') texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  return texture
}

export function createMarsLandscape(scene, getHeight, x, z, rockMaterial, collision, origin = { x: 0, z: 0 }) {
  const originX = origin.x, originZ = origin.z, globalHeight = getHeight
  x -= originX; z -= originZ
  getHeight = (lx, lz) => globalHeight(lx + originX, lz + originZ)
  const root = new THREE.Group()
  const removeColliders = []
  root.name = 'Mars geological layers'
  scene.add(root)
  const random = marsRandom(826)
  const baseY = getHeight(x, z)
  const geometries = []
  const materials = []
  // Three eroded ridgelines, each with a different silhouette and atmospheric value.
  for (let layer = 0; layer < 3; layer++) {
    const radius = 340 + layer * 240
    const segments = 360
    const rows = 40
    const vertices = [], colors = [], indices = []
    const color = new THREE.Color()
    for (let row = 0; row <= rows; row++) {
      const v = row / rows
      for (let i = 0; i <= segments; i++) {
        const angle = i / segments * Math.PI * 2
        const ridge = 36 + 24 * Math.sin(angle * 7 + layer * 3) ** 2 + 45 * Math.sin(angle * 3 - layer) ** 4
        const serration = 4 * Math.sin(angle * 37 + layer) + 2 * Math.sin(angle * 71)
        const sunAngle = Math.atan2(Math.sin(angle + 0.13), Math.cos(angle + 0.13))
        const valley = 1 - 0.7 * Math.exp(-(sunAngle * sunAngle) / 0.1)
        const elevation = Math.sin(v * Math.PI) ** 1.8 * (ridge + serration) * (1 + layer * 0.45) * valley
        const r = radius + (v - 0.5) * 230
        vertices.push(x + Math.sin(angle) * r, baseY - 12 + elevation, z - Math.cos(angle) * r)
        const band = 0.8 + 0.06 * Math.sin(elevation * 0.44) + 0.04 * Math.sin(angle * 48 + v * 10)
        color.setRGB(band, band * 0.86, band * 0.73)
        colors.push(color.r, color.g, color.b)
        if (row < rows && i < segments) {
          const a = row * (segments + 1) + i, b = a + segments + 1
          indices.push(a, b, a + 1, a + 1, b, b + 1)
        }
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setIndex(indices); geometry.computeVertexNormals()
    const material = new THREE.MeshStandardMaterial({ color: [0x79452f, 0x975e49, 0xa36e5a][layer], roughness: 1, vertexColors: true, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.receiveShadow = true
    root.add(mesh); geometries.push(geometry); materials.push(material)
  }
  // Dense near-ground scatter is instanced; large outcrops frame the walking corridor.
  for (let variant = 0; variant < 4; variant++) {
    const geometry = createRockGeometry(variant === 0 ? 3 : 1, variant + 5)
    geometries.push(geometry)
    const count = variant === 0 ? 16 : 180
    const mesh = new THREE.InstancedMesh(geometry, rockMaterial, count)
    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2
      const radius = 3 + random() ** 0.6 * 105
      let dx = Math.sin(angle) * radius, dz = Math.cos(angle) * radius
      if (variant === 0 && Math.abs(dx) < 10 && dz < 0) dx += dx < 0 ? -15 : 15
      const scale = variant === 0 ? 0.7 + random() * 2.4 : 0.025 + random() ** 2 * 0.3
      dummy.position.set(x + dx, getHeight(x + dx, z + dz) + scale * 0.16, z + dz)
      dummy.rotation.set(random(), random() * 6.28, random() * 0.6)
      dummy.scale.set(scale * (1 + random()), scale, scale * (0.8 + random()))
      dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix)
      if (collision && variant === 0) {
        if (!geometry.boundingBox) geometry.computeBoundingBox()
        const bounds = geometry.boundingBox.clone().applyMatrix4(dummy.matrix)
        removeColliders.push(collision.addBox(bounds.min, bounds.max))
      }
      mesh.setColorAt(i, new THREE.Color().setScalar(0.65 + random() * 0.5))
    }
    mesh.castShadow = variant === 0
    mesh.receiveShadow = true
    root.add(mesh)
  }
  const dustMap = makeSurfaceTexture('dust')
  const dustMaterial = new THREE.SpriteMaterial({ map: dustMap, color: 0xcf9470, transparent: true, opacity: 0.18, depthWrite: false })
  const dust = []
  for (let i = 0; i < 14; i++) {
    const sprite = new THREE.Sprite(dustMaterial)
    const dx = (random() - 0.5) * 260, dz = -35 - random() * 200
    sprite.position.set(x + dx, getHeight(x + dx, z + dz) + 3, z + dz)
    sprite.scale.set(55 + random() * 70, 5 + random() * 9, 1)
    root.add(sprite)
    dust.push({ sprite, startX: sprite.position.x, phase: random() * 6.28 })
  }
  return {
    shiftOrigin(dx, dz) { root.position.x -= dx; root.position.z -= dz },
    update(time) { for (const item of dust) item.sprite.position.x = item.startX + Math.sin(time * 0.035 + item.phase) * 18 },
    dispose() {
      removeColliders.forEach(remove => remove())
      root.traverse(object => { if (object.isInstancedMesh) object.dispose() })
      geometries.forEach(geometry => geometry.dispose())
      materials.forEach(material => material.dispose())
      dustMap.dispose(); dustMaterial.dispose(); root.removeFromParent()
    }
  }
}
