import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { makeSurfaceTexture } from './MarsEnvironment.js'

// Modular expedition hardware. Resources are local to one landing site's lifetime.
export function createMarsExpedition(scene, camera, getHeight, x, z) {
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

  // A connected utility pod extends the silhouette instead of one large box.
  const utility = groundGroup(-21, -35, 'Utility module')
  const pod = cylinder(utility, 2.25, 5.5, [0, 3.1, 0]); pod.rotation.x = Math.PI / 2
  for (const depth of [-2.7, 2.7]) ring(utility, 2.25, 0.12, [0, 3.1, depth], materials.dark)
  cable(root, [[x - 15, base.position.y + 1, z - 27], [x - 18, getHeight(x - 18, z - 30) + 0.2, z - 30], [x - 21, utility.position.y + 1, z - 32]], 0.16)

  // Tilted photovoltaic wings, tubular frames, pivot motors and supply cables.
  for (let i = 0; i < 4; i++) {
    const support = groundGroup(-4 + i * 4, -38, 'Solar array')
    cylinder(support, 0.12, 1.9, [0, 0.95, 0], materials.panel)
    cylinder(support, 0.4, 0.1, [0, 0.06, 0], materials.dark)
    const pivot = cylinder(support, 0.24, 0.6, [0, 1.9, 0], materials.dark); pivot.rotation.z = Math.PI / 2
    const cells = group(support, [0, 2.1, 0]); cells.rotation.x = 0.62
    panel(cells, [3.5, 0.13, 4.5], [0, 0, 0], materials.panel, 0.045)
    const sheet = mesh(cells, geometry('solar-sheet', () => new THREE.PlaneGeometry(3.3, 4.3)), [0, 0.076, 0], materials.solar)
    sheet.rotation.x = -Math.PI / 2
    for (const side of [-1, 1]) strut(support, [0, 0.7, 0], [side * 1.2, 1.8, 0.5], 0.055, materials.panel)
    cable(support, [[0, 1.9, 0], [0.3, 0.4, 0.5], [1, 0.08, 1], [3, 0.06, 1]], 0.04)
  }

  // Six-wheel pressurized rover with visible suspension and machined hubs.
  const rover = groundGroup(9, -21, 'Nomad six-wheel rover')
  rover.rotation.y = -0.65
  panel(rover, [2.9, 0.55, 5.3], [0, 1.25, 0], materials.dark, 0.18)
  panel(rover, [3, 1.3, 4.4], [0, 2.05, 0], materials.shell, 0.3)
  const cabin = panel(rover, [2.6, 1.65, 2.9], [0, 3.02, 0.5], materials.shell, 0.42)
  cabin.rotation.x = -0.06
  const windshield = panel(rover, [2.22, 0.96, 0.1], [0, 3.15, 1.92], materials.glass, 0.15)
  windshield.rotation.x = -0.18
  panel(rover, [0.08, 1.02, 0.1], [0, 3.14, 2], materials.dark)
  for (const side of [-1, 1]) {
    panel(rover, [0.08, 0.8, 1.7], [side * 1.3, 3.13, 0.5], materials.glass, 0.025)
    panel(rover, [0.07, 0.14, 0.5], [side * 1.54, 2.17, 0.65], materials.dark)
    strut(rover, [side * 1.45, 1.4, -2], [side * 1.45, 1.4, 2], 0.1, materials.panel)
    panel(rover, [0.55, 0.24, 0.15], [side * 0.98, 2.05, 2.28], materials.amber)
    glow(rover, [side * 0.98, 2.05, 2.42], 0xffce8a, 1.4, 0.23)
    for (const depth of [-1.85, 0, 1.85]) {
      strut(rover, [side * 0.8, 1.6, depth - 0.45], [side * 1.9, 1, depth], 0.12, materials.panel)
      strut(rover, [side * 1.3, 1.7, depth + 0.35], [side * 1.9, 1, depth], 0.065, materials.orange)
      const wheel = group(rover, [side * 1.82, 0.98, depth])
      const tire = cylinder(wheel, 0.94, 0.72, [0, 0, 0], materials.rubber); tire.rotation.z = Math.PI / 2
      const hub = cylinder(wheel, 0.51, 0.77, [0, 0, 0], materials.panel); hub.rotation.z = Math.PI / 2
      const axle = cylinder(wheel, 0.2, 0.81, [0, 0, 0], materials.dark); axle.rotation.z = Math.PI / 2
      const lip = ring(wheel, 0.7, 0.055, [side * 0.39, 0, 0], materials.dark); lip.rotation.y = Math.PI / 2
      for (let bolt = 0; bolt < 8; bolt++) {
        const a = bolt / 8 * Math.PI * 2
        const screw = cylinder(wheel, 0.055, 0.045, [side * 0.405, Math.cos(a) * 0.35, Math.sin(a) * 0.35], materials.dark)
        screw.rotation.z = Math.PI / 2
      }
    }
  }
  // One draw call for all of the tire tread blocks.
  const treadGeo = new THREE.BoxGeometry(0.76, 0.1, 0.14)
  const treads = new THREE.InstancedMesh(treadGeo, materials.rubber, 6 * 32)
  const dummy = new THREE.Object3D()
  let treadIndex = 0
  for (const side of [-1, 1]) for (const depth of [-1.85, 0, 1.85]) for (let i = 0; i < 32; i++) {
    const a = i / 32 * Math.PI * 2
    dummy.position.set(side * 1.82, 0.98 + Math.cos(a) * 0.955, depth + Math.sin(a) * 0.955)
    dummy.rotation.set(a, 0.16 * side, 0); dummy.updateMatrix(); treads.setMatrixAt(treadIndex++, dummy.matrix)
  }
  treads.castShadow = true; rover.add(treads)
  panel(rover, [2.4, 0.12, 1.8], [0, 3.95, 0.3], materials.dark)
  for (const side of [-1, 1]) strut(rover, [side * 1, 4, -0.7], [side * 1, 4, 1.3], 0.045, materials.panel)
  const sensor = cylinder(rover, 0.2, 0.4, [0, 4.15, 0.4], materials.glass)
  sensor.name = 'Navigation lidar'
  strut(rover, [-1, 2.8, -1.7], [-1, 5.5, -1.7], 0.025, materials.dark)
  panel(rover, [1.7, 0.8, 1.15], [0, 2.9, -1.5], materials.orange, 0.12)
  label(rover, 'NOMAD', '06 / FIELD OPERATIONS', [0, 1.62, 2.68], 1.5)

  // Supply cases and flexible umbilicals give the landing site a lived-in scale.
  for (let i = 0; i < 4; i++) {
    const crate = groundGroup(-6.7 + (i % 2) * 1.2, -19 - Math.floor(i / 2) * 1.1, 'Field supply case')
    panel(crate, [1, 0.7, 0.85], [0, 0.4, 0], i === 0 ? materials.orange : materials.panel, 0.09)
    for (const side of [-1, 1]) {
      panel(crate, [0.08, 0.73, 0.89], [side * 0.33, 0.4, 0], materials.dark)
      panel(crate, [0.18, 0.13, 0.06], [side * 0.33, 0.53, 0.46], materials.shell)
    }
    panel(crate, [0.35, 0.08, 0.1], [0, 0.8, 0], materials.dark)
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
  return {
    signal: signal.position,
    update(time) {
      core.position.y = 5.8 + Math.sin(time * 1.3) * 0.22
      core.rotation.y = time * 0.3
      orbit.rotation.z = time * 0.18
      outer.rotation.x = time * -0.12
      beamMaterial.uniforms.time.value = time
      scanner.position.y = -0.3 + Math.sin(time * 1.4) * 0.003
    },
    dispose() {
      const geometries = new Set(geometryCache.values())
      const usedMaterials = new Set(Object.values(materials))
      for (const parent of [root, scanner]) parent.traverse(object => {
        if (object.geometry) geometries.add(object.geometry)
        if (object.material) usedMaterials.add(object.material)
        if (object.isInstancedMesh) object.dispose()
      })
      const textures = new Set([metalMap, solarMap, scannerMap, glowMap])
      usedMaterials.forEach(material => { if (material.map) textures.add(material.map); material.dispose() })
      textures.forEach(texture => texture.dispose())
      geometries.forEach(geo => geo.dispose())
      root.removeFromParent(); scanner.removeFromParent()
    }
  }
}
