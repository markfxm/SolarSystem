import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { makeSurfaceTexture } from './MarsEnvironment.js'
import { createMarsRover } from './MarsRover.js'

// Modular expedition hardware. Resources are local to one landing site's lifetime.
export function createMarsExpedition(scene, camera, getHeight, x, z, collision, origin = { x: 0, z: 0 }) {
  // Generate GPU geometry near the landing site; exported mission anchors stay global.
  const originX = origin.x, originZ = origin.z, globalHeight = getHeight
  x -= originX; z -= originZ
  getHeight = (lx, lz) => globalHeight(lx + originX, lz + originZ)
  const globalPosition = object => object.position.clone().add(new THREE.Vector3(originX, 0, originZ))
  const root = new THREE.Group()
  root.name = 'Aurora expedition outpost'
  scene.add(root)
  const metalMap = makeSurfaceTexture('metal')
  const solarMap = makeSurfaceTexture('solar')
  const scannerMap = makeSurfaceTexture('scanner')
  const glowMap = makeSurfaceTexture('glow')
  const materials = {
    shell: new THREE.MeshStandardMaterial({ color: 0xd1c5ab, map: metalMap, roughness: 0.56, metalness: 0.32 }),
    panel: new THREE.MeshStandardMaterial({ color: 0x8d938d, map: metalMap, roughness: 0.68, metalness: 0.45 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x252d32, roughness: 0.6, metalness: 0.55 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x171b1c, roughness: 0.98 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xd36e35, map: metalMap, roughness: 0.65, metalness: 0.25 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x173c4b, metalness: 0.45, roughness: 0.14, clearcoat: 1, emissive: 0x153947, emissiveIntensity: 0.3 }),
    blue: new THREE.MeshBasicMaterial({ color: 0x7de4ff }),
    amber: new THREE.MeshBasicMaterial({ color: 0xffc073 }),
    solar: new THREE.MeshStandardMaterial({ map: solarMap, metalness: 0.55, roughness: 0.28, color: 0xc2d6e4, side: THREE.DoubleSide }),
    screen: new THREE.MeshBasicMaterial({ map: scannerMap, toneMapped: false }),
  }
  const removeColliders = []
  function solid(parent, size, center = [0, 0, 0]) {
    if (!collision) return
    parent.updateWorldMatrix(true, false)
    const bounds = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(...center), new THREE.Vector3(...size)).applyMatrix4(parent.matrixWorld)
    const remove = collision.addBox(bounds.min, bounds.max)
    removeColliders.push(remove)
    return remove
  }
  const geometryCache = new Map()
  function geometry(key, create) {
    if (!geometryCache.has(key)) geometryCache.set(key, create())
    return geometryCache.get(key)
  }
  function mesh(parent, geo, position, material = materials.shell) {
    const object = new THREE.Mesh(geo, material)
    object.position.set(...position)
    object.castShadow = true
    object.receiveShadow = true
    parent.add(object)
    return object
  }
  function panel(parent, size, position, material = materials.shell, bevel = 0.08) {
    const radius = Math.min(bevel, Math.min(...size) * 0.45)
    return mesh(parent, geometry(`panel:${size}:${radius}`, () => new RoundedBoxGeometry(...size, 2, radius)), position, material)
  }
  function cylinder(parent, radius, length, position, material = materials.dark, topRadius = radius) {
    return mesh(parent, geometry(`cylinder:${radius}:${topRadius}:${length}`, () => new THREE.CylinderGeometry(topRadius, radius, length, 24)), position, material)
  }
  function ring(parent, radius, tube, position, material = materials.dark) {
    return mesh(parent, geometry(`ring:${radius}:${tube}`, () => new THREE.TorusGeometry(radius, tube, 8, 48)), position, material)
  }
  function strut(parent, start, end, radius = 0.06, material = materials.dark) {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end)
    const mid = a.clone().add(b).multiplyScalar(0.5)
    const object = cylinder(parent, radius, a.distanceTo(b), mid.toArray(), material)
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize())
    return object
  }
  function cable(parent, points, radius = 0.045, material = materials.rubber) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)))
    return mesh(parent, new THREE.TubeGeometry(curve, 24, radius, 6, false), [0, 0, 0], material)
  }
  function group(parent, position) {
    const object = new THREE.Group(); object.position.set(...position); parent.add(object); return object
  }
  function groundGroup(dx, dz, name) {
    const object = group(root, [x + dx, getHeight(x + dx, z + dz), z + dz]); object.name = name; return object
  }
  function label(parent, text, subtext, position, width = 2.3) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 192
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#cfbf9f'; ctx.fillRect(0, 0, 512, 192)
    ctx.fillStyle = '#26343b'; ctx.font = 'bold 64px sans-serif'; ctx.fillText(text, 26, 85)
    ctx.font = '22px monospace'; ctx.fillText(subtext, 28, 139)
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 })
    const sign = mesh(parent, new THREE.PlaneGeometry(width, width * 0.375), position, material)
    sign.castShadow = false
    return sign
  }
  function glow(parent, position, color, size, opacity = 0.3) {
    const material = new THREE.SpriteMaterial({ map: glowMap, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending })
    const sprite = new THREE.Sprite(material); sprite.position.set(...position); sprite.scale.set(size, size, 1); parent.add(sprite); return sprite
  }

  // Pressure vessel with exterior ribs, segmented armor, airlock and telescoping legs.
  const base = groundGroup(-9, -28, 'Aurora habitat')
  const vessel = cylinder(base, 3.2, 8.5, [0, 4.3, 0], materials.shell)
  vessel.rotation.x = Math.PI / 2
  for (const depth of [-4.25, 4.25]) {
    const cap = mesh(base, geometry('habitat-cap', () => new THREE.SphereGeometry(3.15, 32, 20)), [0, 4.3, depth])
    cap.scale.z = 0.22
  }
  for (const depth of [-3.9, -1.3, 1.3, 3.9]) {
    ring(base, 3.24, 0.085, [0, 4.3, depth], materials.dark)
    for (const side of [-1, 1]) {
      const armor = panel(base, [0.15, 2.2, 2.3], [side * 3.12, 4.4, depth > 0 ? depth - 0.2 : depth + 0.2], materials.shell)
      armor.rotation.z = side * -0.06
    }
  }
  for (const side of [-1, 1]) for (const depth of [-3, 3]) {
    strut(base, [side * 2.3, 3, depth], [side * 3.4, 0.25, depth + 0.6], 0.15, materials.panel)
    strut(base, [side * 2.7, 2.7, depth], [side * 3.2, 0.6, depth + 0.5], 0.08, materials.orange)
    cylinder(base, 0.6, 0.18, [side * 3.4, 0.16, depth + 0.6], materials.dark)
  }
  panel(base, [2.4, 3.3, 0.5], [0, 3.5, 4.8], materials.dark, 0.25)
  panel(base, [1.85, 2.8, 0.12], [0, 3.5, 5.08], materials.panel, 0.2)
  panel(base, [1.5, 0.65, 0.1], [0, 4.25, 5.17], materials.glass, 0.14)
  for (const side of [-1, 1]) {
    panel(base, [0.07, 2.75, 0.06], [side * 1.08, 3.5, 5.1], materials.amber)
    strut(base, [side * 1.4, 2.8, 5.3], [side * 1.4, 1.15, 9.2], 0.045, materials.panel)
    for (const depth of [5.5, 7.1, 8.7]) strut(base, [side * 1.4, 0.2 + (9 - depth) * 0.36, depth], [side * 1.4, 1.2 + (9 - depth) * 0.36, depth], 0.035, materials.panel)
  }
  for (let i = 0; i < 8; i++) {
    panel(base, [2.5, 0.15, 0.52], [0, 0.25 + i * 0.24, 9 - i * 0.5], materials.dark)
    panel(base, [2.4, 0.025, 0.055], [0, 0.34 + i * 0.24, 9.2 - i * 0.5], materials.panel)
  }
  label(base, 'AURORA', 'A-01 / MARS RESEARCH', [-1.9, 5.45, 4.94], 1.8)
  label(base, '01', 'AIRLOCK', [1.95, 4, 4.98], 0.85)
  const hatchLight = new THREE.PointLight(0xffad57, 22, 10, 2)
  hatchLight.position.set(0, 3.2, 5.4); base.add(hatchLight)
  for (const side of [-1, 1]) {
    const tank = cylinder(base, 0.55, 2.6, [side * 3.65, 3.2, -1.6], materials.panel)
    for (const h of [2.3, 4.1]) { const belt = ring(base, 0.56, 0.065, [side * 3.65, h, -1.6]); belt.rotation.x = Math.PI / 2 }
    cable(base, [[side * 3.65, 4.5, -1.6], [side * 3.9, 5.1, -1], [side * 3.2, 5.5, 0]], 0.065)
    tank.name = 'Life support cylinder'
  }
  panel(base, [2.6, 0.5, 3.5], [0, 7.5, -1.5], materials.dark)
  for (let i = 0; i < 9; i++) panel(base, [2.35, 0.06, 0.08], [0, 7.79, -2.9 + i * 0.34], materials.panel)
  strut(base, [-1.3, 7.2, -2.4], [-1.3, 13, -2.4], 0.065, materials.panel)
  strut(base, [-1.5, 9, -2.4], [-1.1, 9, -2.4], 0.04, materials.panel)
  glow(base, [-1.3, 13, -2.4], 0xff6c3b, 0.7, 0.7)
  const dishPivot = group(base, [-1.3, 10.2, -2.4]); dishPivot.rotation.set(0.55, -0.45, 0)
  const dishPoints = Array.from({ length: 14 }, (_, i) => { const r = i / 13 * 1.2; return new THREE.Vector2(r, r * r * 0.38) })
  const dishMaterial = materials.panel.clone(); dishMaterial.side = THREE.DoubleSide
  mesh(dishPivot, new THREE.LatheGeometry(dishPoints, 40), [0, 0, 0], dishMaterial)
  for (const a of [0, 2.094, 4.189]) strut(dishPivot, [Math.cos(a) * 1.1, 0.5, Math.sin(a) * 1.1], [0, 1.3, 0], 0.025, materials.panel)
  cylinder(dishPivot, 0.11, 0.3, [0, 1.3, 0], materials.dark)

  solid(base, [8.4, 8, 10], [0, 4, 0])
  solid(base, [2.9, 2.5, 4.6], [0, 1.25, 7])
  // Reachable ground-level upload terminal beside the entrance staircase.
  const terminal = groundGroup(-12, -17, 'Base Terminal')
  panel(terminal, [0.55, 1.2, 0.45], [0, 0.6, 0], materials.dark)
  panel(terminal, [0.8, 0.65, 0.22], [0, 1.5, 0], materials.panel)
  panel(terminal, [0.64, 0.45, 0.03], [0, 1.5, 0.13], materials.blue)
  solid(terminal, [0.8, 1.85, 0.5], [0, 0.925, 0])

  // A connected utility pod extends the silhouette instead of one large box.
  const utility = groundGroup(-21, -35, 'Utility module')
  const pod = cylinder(utility, 2.25, 5.5, [0, 3.1, 0]); pod.rotation.x = Math.PI / 2
  for (const depth of [-2.7, 2.7]) ring(utility, 2.25, 0.12, [0, 3.1, depth], materials.dark)
  cable(root, [[x - 15, base.position.y + 1, z - 27], [x - 18, getHeight(x - 18, z - 30) + 0.2, z - 30], [x - 21, utility.position.y + 1, z - 32]], 0.16)

  solid(utility, [4.5, 5.5, 5.6], [0, 2.75, 0])

  // Tilted photovoltaic wings, tubular frames, pivot motors and supply cables.
  for (let i = 0; i < 4; i++) {
    const support = groundGroup(-4 + i * 4, -38, 'Solar array')
    cylinder(support, 0.12, 1.9, [0, 0.95, 0], materials.panel)
    cylinder(support, 0.4, 0.1, [0, 0.06, 0], materials.dark)
    const pivot = cylinder(support, 0.24, 0.6, [0, 1.9, 0], materials.dark); pivot.rotation.z = Math.PI / 2
    solid(support, [0.8, 1.9, 0.8], [0, 0.95, 0])
    const cells = group(support, [0, 2.1, 0]); cells.rotation.x = 0.62
    panel(cells, [3.5, 0.13, 4.5], [0, 0, 0], materials.panel, 0.045)
    const sheet = mesh(cells, geometry('solar-sheet', () => new THREE.PlaneGeometry(3.3, 4.3)), [0, 0.076, 0], materials.solar)
    sheet.rotation.x = -Math.PI / 2
    solid(cells, [3.5, 0.13, 4.5])
    for (const side of [-1, 1]) strut(support, [0, 0.7, 0], [side * 1.2, 1.8, 0.5], 0.055, materials.panel)
    cable(support, [[0, 1.9, 0], [0.3, 0.4, 0.5], [1, 0.08, 1], [3, 0.06, 1]], 0.04)
  }

  // The visual model keeps the existing landing-site anchor and front direction.
  const rover = createMarsRover()
  rover.position.set(x + 9, getHeight(x + 9, z - 21), z - 21)
  rover.rotation.y = -0.65
  root.add(rover)
  rover.userData.releaseStaticCollider = solid(rover, [4.6, 4.1, 5.7], [0, 2.05, 0])

  // Supply cases and flexible umbilicals give the landing site a lived-in scale.
  for (let i = 0; i < 4; i++) {
    const crate = groundGroup(-6.7 + (i % 2) * 1.2, -19 - Math.floor(i / 2) * 1.1, 'Field supply case')
    panel(crate, [1, 0.7, 0.85], [0, 0.4, 0], i === 0 ? materials.orange : materials.panel, 0.09)
    for (const side of [-1, 1]) {
      panel(crate, [0.08, 0.73, 0.89], [side * 0.33, 0.4, 0], materials.dark)
      panel(crate, [0.18, 0.13, 0.06], [side * 0.33, 0.53, 0.46], materials.shell)
    }
    panel(crate, [0.35, 0.08, 0.1], [0, 0.8, 0], materials.dark)
    solid(crate, [1.1, 0.85, 0.95], [0, 0.425, 0])
  }

  // Signal 01: a damaged deep-space probe exposing a suspended energy core.
  const signal = groundGroup(26, -112, 'Signal 01 / crashed survey probe')
  const wreck = group(signal, [0, 1.2, 0]); wreck.rotation.set(0.22, -0.4, 0.32)
  const hull = cylinder(wreck, 2.7, 2.3, [0, 1, 0], materials.dark, 1.7)
  hull.name = 'Fractured probe housing'
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2
    const petal = panel(wreck, [1.1, 3.7, 0.2], [Math.cos(a) * 2.5, 2.5, Math.sin(a) * 2.5], materials.panel, 0.08)
    petal.rotation.set(Math.sin(a) * 0.5, -a, Math.cos(a) * -0.5)
    strut(wreck, [Math.cos(a), 0, Math.sin(a)], [Math.cos(a) * 4, -0.6, Math.sin(a) * 4], 0.13, materials.shell)
  }
  const core = mesh(signal, new THREE.IcosahedronGeometry(1.05, 3), [0, 5.8, 0], materials.blue)
  const orbit = ring(signal, 2.6, 0.075, [0, 5.8, 0], materials.blue); orbit.rotation.x = 1.2
  const outer = ring(signal, 3.1, 0.035, [0, 5.8, 0], materials.blue); outer.rotation.y = 0.8
  glow(signal, [0, 5.8, 0], 0x4cbfff, 20, 0.75)
  const energyLight = new THREE.PointLight(0x42bfff, 170, 24, 2); energyLight.position.y = 5; signal.add(energyLight)
  const beamMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec2 vUv; uniform float time; void main(){float fade=pow(1.0-vUv.y,2.0); gl_FragColor=vec4(0.16,0.65,1.0,fade*(0.13+0.04*sin(time*1.4)));}',
    transparent: true, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide,
  })
  mesh(signal, new THREE.CylinderGeometry(0.15, 1.4, 58, 32, 1, true), [0, 34, 0], beamMaterial).castShadow = false
  label(wreck, 'KEPLER', 'DEEP SPACE / 07', [0, 1.7, 2.4], 2)

  solid(signal, [8, 7, 8], [0, 3.5, 0])

  // Beveled handheld instrument: rubber bumpers, recessed glass, screws and controls.
  const scanner = group(camera, [0.43, -0.3, -0.85])
  scanner.name = 'Handheld spectral scanner'
  scene.add(camera)
  scanner.scale.setScalar(0.8)
  scanner.rotation.set(-0.24, -0.24, -0.12)
  const sleeve = mesh(scanner, new THREE.CapsuleGeometry(0.09, 0.32, 8, 16), [0.045, -0.19, 0.27], materials.shell)
  sleeve.rotation.x = Math.PI / 2
  for (let i = 0; i < 5; i++) ring(scanner, 0.093, 0.009, [0.045, -0.19, 0.1 + i * 0.024], materials.panel)
  const glove = mesh(scanner, new THREE.CapsuleGeometry(0.072, 0.11, 6, 12), [0.035, -0.12, 0.045], materials.rubber)
  glove.rotation.z = -0.35
  panel(scanner, [0.255, 0.37, 0.13], [0, 0.04, 0], materials.dark, 0.032)
  panel(scanner, [0.235, 0.35, 0.13], [0, 0.04, 0.016], materials.shell, 0.027)
  panel(scanner, [0.2, 0.26, 0.014], [0, 0.065, 0.088], materials.rubber, 0.016)
  mesh(scanner, new THREE.PlaneGeometry(0.176, 0.234), [0, 0.065, 0.097], materials.screen).castShadow = false
  for (const side of [-1, 1]) {
    panel(scanner, [0.035, 0.29, 0.14], [side * 0.12, 0.04, 0], materials.rubber, 0.014)
    for (const h of [-0.1, 0.19]) {
      const screw = cylinder(scanner, 0.006, 0.006, [side * 0.091, h, 0.087], materials.dark); screw.rotation.x = Math.PI / 2
    }
  }
  for (let i = 0; i < 3; i++) {
    const button = cylinder(scanner, 0.015, 0.012, [-0.053 + i * 0.053, -0.104, 0.092], i === 1 ? materials.amber : materials.dark)
    button.rotation.x = Math.PI / 2
  }
  panel(scanner, [0.1, 0.035, 0.09], [0, 0.236, 0], materials.dark, 0.008)
  for (let i = 0; i < 4; i++) {
    const finger = mesh(scanner, new THREE.CapsuleGeometry(0.019, 0.06, 4, 8), [0.115, -0.07 + i * 0.032, 0.015], materials.rubber)
    finger.rotation.x = Math.PI / 2
  }
  cable(scanner, [[-0.1, -0.13, 0], [-0.17, -0.22, 0.06], [-0.09, -0.26, 0.3]], 0.011)
  const signal02 = groundGroup(-65, -155, 'Signal 02 / survey beacon')
  cylinder(signal02, 0.6, 3, [0, 1.5, 0], materials.panel)
  const beacon = mesh(signal02, new THREE.IcosahedronGeometry(0.7, 1), [0, 3.4, 0], materials.blue)
  glow(signal02, [0, 3.4, 0], 0x4cbfff, 12, 0.6)
  signal02.visible = false
  const sweep = panel(scanner, [0.174, 0.008, 0.002], [0, 0.065, 0.1], materials.blue, 0)
  sweep.visible = false
  let scannerStatus = ''
  const signals = [
    { id: 'signal01', position: globalPosition(signal), object: signal,
      scanEffect(pulse) { core.scale.setScalar(1 + pulse * 0.08); energyLight.intensity = 170 + pulse * 80 } },
    { id: 'signal02', position: globalPosition(signal02), object: signal02,
      unlock() { solid(signal02, [1.4, 4.2, 1.4], [0, 2.1, 0]) },
      scanEffect(pulse) { beacon.scale.setScalar(1 + pulse * 0.2) } },
  ]
  return {
    rover, scanner,
    signals,
    baseTarget: globalPosition(terminal),
    shiftOrigin(dx, dz) { root.position.x -= dx; root.position.z -= dz },
    update(time, mission = {}) {
      const scanning = mission.stage === 'scanning' && !mission.paused
      const status = mission.discovered ? 'DATA ACQUIRED' : scanning ? 'SCANNING' : 'READY'
      const screenKey = `${mission.number}:${status}`
      if (mission.number && screenKey !== scannerStatus) {
        scannerStatus = screenKey
        const context = scannerMap.image.getContext('2d')
        context.fillStyle = '#031725'
        context.fillRect(20, 54, 478, 32)
        context.fillRect(20, 434, 478, 34)
        context.fillStyle = '#b7f0ff'; context.font = '18px monospace'
        context.fillText(`CH ${mission.number} / ${status}`, 25, 78)
        context.fillStyle = '#64dfff'; context.font = '19px monospace'
        context.fillText(`SIGNAL ${mission.number}`, 25, 458)
        scannerMap.needsUpdate = true
      }
      sweep.visible = scanning
      sweep.position.y = -0.04 + (mission.progress || 0) * 0.21
      for (const target of signals) {
        if (mission.unlockedTargetIds) {
          const unlocked = mission.unlockedTargetIds.includes(target.id)
          if (unlocked && !target.object.visible) target.unlock?.()
          target.object.visible = unlocked
        }
        const pulse = scanning && mission.activeTarget?.id === target.id ? Math.sin(time * 18) : 0
        target.scanEffect(pulse)
      }
      beacon.rotation.y = time * 0.5
      core.position.y = 5.8 + Math.sin(time * 1.3) * 0.22
      core.rotation.y = time * 0.3
      orbit.rotation.z = time * 0.18
      outer.rotation.x = time * -0.12
      beamMaterial.uniforms.time.value = time
      scanner.position.y = -0.3 + Math.sin(time * 1.4) * 0.003
    },
    dispose() {
      removeColliders.forEach(remove => remove())
      const geometries = new Set(geometryCache.values())
      const usedMaterials = new Set(Object.values(materials))
      for (const parent of [root, scanner]) parent.traverse(object => {
        if (object.geometry) geometries.add(object.geometry)
        if (object.material) usedMaterials.add(object.material)
        if (object.isInstancedMesh) object.dispose()
      })
      const textures = new Set([metalMap, solarMap, scannerMap, glowMap])
      usedMaterials.forEach(material => {
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value)
        material.dispose()
      })
      textures.forEach(texture => texture.dispose())
      geometries.forEach(geo => geo.dispose())
      root.removeFromParent(); scanner.removeFromParent()
    }
  }
}
