import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Static expedition hardware; placement, collision and lifetime belong to MarsExpedition.
export function createMarsRover() {
  const rover = new THREE.Group()
  rover.name = 'Nomad six-wheel rover'
  let seed = 71
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  function texture(draw, size = 512) {
    const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size
    draw(canvas.getContext('2d'), size)
    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = 4
    return map
  }
  const finishMap = texture((ctx, size) => {
    ctx.fillStyle = '#e6e3da'; ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 5500; i++) {
      ctx.fillStyle = i % 7 ? 'rgba(102,76,51,0.10)' : 'rgba(49,46,40,0.32)'
      ctx.fillRect(random() * size, random() * size, 0.5 + random() * 2, 0.5 + random() * 2)
    }
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = 'rgba(61,54,43,0.22)'
      ctx.fillRect(random() * size, random() * size, 2 + random() * 13, 0.6)
    }
    // Abrasion at panel edges, without painting large rust patches.
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = 'rgba(89,72,53,0.28)'
      ctx.fillRect(random() * size, random() < 0.5 ? random() * 12 : size - random() * 12, 1 + random() * 6, 1)
    }
    for (let i = 0; i < 140; i++) {
      const px = random() * size, py = random() < 0.5 ? random() * 22 : size - random() * 22
      ctx.fillStyle = 'rgba(91,64,40,0.28)'; ctx.fillRect(px, py, 3 + random() * 15, 1 + random() * 3)
      ctx.fillStyle = 'rgba(227,210,177,0.6)'; ctx.fillRect(px, py + 2, 2 + random() * 7, 1)
    }
  })
  const reliefMap = texture((ctx, size) => {
    ctx.fillStyle = '#bcbcbc'; ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 6500; i++) {
      const value = 130 + Math.floor(random() * 95)
      ctx.fillStyle = `rgb(${value},${value},${value})`
      ctx.fillRect(random() * size, random() * size, 1, 1)
    }
  }, 256)
  reliefMap.colorSpace = THREE.NoColorSpace
  const rubberMap = texture((ctx, size) => {
    ctx.fillStyle = '#8a7c6a'; ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 8500; i++) {
      ctx.fillStyle = i % 3 ? 'rgba(153,114,78,0.24)' : 'rgba(20,22,23,0.4)'
      ctx.fillRect(random() * size, random() * size, 1 + random() * 3, 1 + random() * 2)
    }
  })
  function metal(name, color, roughness, metalness, dust = 0) {
    const material = new THREE.MeshStandardMaterial({ name, color, roughness, metalness, map: finishMap, bumpMap: reliefMap, bumpScale: 0.009, roughnessMap: reliefMap, vertexColors: true })
    material.userData.dust = dust
    return material
  }
  const m = {
    paint: metal('Rover / ceramic painted alloy', 0xd4d1c3, 0.9, 0.22, 0.24),
    skirt: metal('Rover / dusty lower armor', 0xbcb29d, 0.93, 0.25, 0.48),
    frame: metal('Rover / graphite chassis', 0x555952, 0.72, 0.64, 0.28),
    steel: metal('Rover / machined titanium', 0x9d9c90, 0.48, 0.82, 0.1),
    orange: metal('Rover / oxide red equipment', 0xa74625, 0.86, 0.15, 0.13),
    rubber: new THREE.MeshStandardMaterial({ name: 'Rover / dust embedded rubber', color: 0xb4ada3, map: rubberMap, bumpMap: reliefMap, bumpScale: 0.018, roughness: 0.98, vertexColors: true }),
    composite: new THREE.MeshStandardMaterial({ name: 'Rover / composite housings', color: 0x272d2c, roughness: 0.86, vertexColors: true }),
    glass: new THREE.MeshPhysicalMaterial({ name: 'Rover / tinted laminated glass', color: 0x23393d, metalness: 0.18, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.7, vertexColors: true }),
    led: new THREE.MeshStandardMaterial({ name: 'Rover / recessed LED cells', color: 0xffead3, emissive: 0xffddae, emissiveIntensity: 3.2, roughness: 0.3, toneMapped: false, vertexColors: true }),
  }
  // Bake static parts by material. Wheels remain six independently named assemblies.
  const batches = new Map()
  const sources = new Set()
  const transform = new THREE.Object3D()
  const unitBox = new THREE.BoxGeometry(1, 1, 1)
  sources.add(unitBox)
  function part(geo, position, material, rotation = [0, 0, 0], scale = [1, 1, 1], target = batches) {
    sources.add(geo)
    transform.position.set(...position); transform.rotation.set(...rotation); transform.scale.set(...scale); transform.updateMatrix()
    const baked = geo.index ? geo.toNonIndexed() : geo.clone()
    baked.applyMatrix4(transform.matrix)
    const colors = new Float32Array(baked.attributes.position.count * 3)
    const tint = new THREE.Color(), dust = new THREE.Color(0xac8461)
    for (let i = 0; i < baked.attributes.position.count; i++) {
      const y = baked.attributes.position.getY(i), up = Math.max(0, baked.attributes.normal.getY(i))
      const amount = (material.userData.dust || 0) * (0.2 + up * 0.45 + Math.max(0, 2.3 - y) * 0.22)
      tint.setRGB(1, 1, 1).lerp(dust, amount).toArray(colors, i * 3)
    }
    baked.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    if (!target.has(material)) target.set(material, [])
    target.get(material).push(baked)
  }
  function box(size, pos, material = m.paint, rotation, target) { part(unitBox, pos, material, rotation, size, target) }
  function armor(size, pos, material = m.paint, bevel = 0.025, rotation) {
    part(new RoundedBoxGeometry(...size, 1, bevel), pos, material, rotation)
  }
  function cylinder(radius, length, pos, material = m.frame, rotation = [0, 0, 0], target = batches, segments = 16) {
    part(new THREE.CylinderGeometry(radius, radius, length, segments), pos, material, rotation, undefined, target)
  }
  function rod(start, end, radius = 0.04, material = m.frame) {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end), delta = b.clone().sub(a)
    const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()))
    cylinder(radius, delta.length(), a.add(b).multiplyScalar(0.5).toArray(), material, [rotation.x, rotation.y, rotation.z], batches, 10)
  }
  function tube(points, radius = 0.028, material = m.composite) {
    part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 18, radius, 6, false), [0, 0, 0], material)
  }
  const bolts = []
  function bolt(pos, axis = 'z', radius = 0.033) {
    transform.position.set(...pos); transform.scale.set(radius, 0.024, radius)
    transform.rotation.set(axis === 'z' ? Math.PI / 2 : 0, 0, axis === 'x' ? Math.PI / 2 : 0)
    transform.updateMatrix(); bolts.push(transform.matrix.clone())
  }
  function flush(parent, collection) {
    for (const [material, parts] of collection) {
      const geometry = mergeGeometries(parts)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.name = material.name
      mesh.castShadow = material !== m.led; mesh.receiveShadow = true
      parent.add(mesh)
      parts.forEach(part => part.dispose())
    }
  }

  // 1. Low, raked pressure cabin above a segmented load-bearing deck.
  armor([2.92, 0.46, 5.18], [0, 1.96, -0.02], m.frame)
  armor([2.96, 0.23, 2.4], [0, 2.23, 1.27], m.paint)
  armor([2.86, 0.16, 2.35], [0, 2.21, -1.15], m.skirt)
  const cabin = new THREE.BoxGeometry(2.7, 1.12, 2.65)
  const positions = cabin.attributes.position
  for (let i = 0; i < positions.count; i++) {
    if (positions.getY(i) > 0) {
      positions.setX(i, positions.getX(i) * 0.93)
      if (positions.getZ(i) > 0) positions.setZ(i, positions.getZ(i) - 0.5)
    }
  }
  cabin.computeVertexNormals()
  part(cabin, [0, 2.88, 0.8], m.paint)
  armor([2.58, 0.13, 2.24], [0, 3.48, 0.55], m.paint, 0.025)
  const rake = -Math.atan2(0.5, 1.12)
  // Windshield lies on the sloped cabin face; gasket, frame and glass have real depth.
  armor([2.43, 1.13, 0.07], [0, 2.94, 1.88], m.frame, 0.025, [rake, 0, 0])
  for (const side of [-1, 1]) {
    armor([1.105, 0.94, 0.026], [side * 0.587, 2.95, 1.922], m.glass, 0.008, [rake, 0, 0])
    rod([side * 0.22, 2.52, 2.17], [side * 0.91, 2.65, 2.125], 0.015, m.frame)
    rod([side * 0.83, 2.66, 2.12], [side * 0.91, 3.08, 1.93], 0.019, m.composite)
    for (const h of [2.46, 3.4]) bolt([side * 1.16, h, h > 3 ? 1.72 : 2.145])
    // Access hatch, its inset side window, hinge pins and grab handle.
    armor([0.075, 1.02, 1.35], [side * 1.313, 2.87, 0.25], m.frame, 0.015, [0, 0, side * 0.084])
    armor([0.06, 0.96, 1.29], [side * 1.351, 2.87, 0.25], m.paint, 0.012, [0, 0, side * 0.084])
    box([0.026, 0.38, 0.84], [side * 1.37, 3.12, 0.31], m.frame, [0, 0, side * 0.084])
    box([0.018, 0.3, 0.72], [side * 1.389, 3.12, 0.31], m.glass, [0, 0, side * 0.084])
    for (const h of [2.54, 3.13]) cylinder(0.045, 0.18, [side * 1.397, h, -0.35], m.steel)
    rod([side * 1.41, 2.69, 0.48], [side * 1.41, 2.69, 0.76], 0.027, m.frame)
    for (const depth of [-1.86, -0.68, 0.55, 1.75]) {
      armor([0.18, 0.29, 1.09], [side * 1.47, 2.075, depth], m.skirt, 0.018)
      for (const offset of [-0.42, 0.42]) bolt([side * 1.573, 2.08, depth + offset], 'x')
    }
  }
  armor([2.91, 0.62, 0.3], [0, 1.98, 2.43], m.skirt, 0.025)
  box([2.68, 0.17, 0.25], [0, 1.59, 2.46], m.frame)
  box([1.63, 0.46, 0.025], [0, 2, 2.596], m.paint)
  for (const side of [-1, 1]) {
    bolt([side * 0.73, 2.17, 2.62]); bolt([side * 0.73, 1.83, 2.62])
    // Protected tow eyes and recessed 2 x 4 LED modules.
    const tow = new THREE.TorusGeometry(0.105, 0.036, 6, 16)
    part(tow, [side * 0.96, 1.46, 2.51], m.steel)
    armor([0.48, 0.3, 0.15], [side * 1.17, 2.01, 2.6], m.frame, 0.024)
    box([0.39, 0.215, 0.022], [side * 1.17, 2.01, 2.683], m.glass)
    for (let row = 0; row < 2; row++) for (let col = 0; col < 4; col++) {
      box([0.071, 0.06, 0.018], [side * 1.17 - 0.138 + col * 0.092, 1.965 + row * 0.09, 2.7], m.led)
    }
    rod([side * 1.39, 1.84, 2.72], [side * 0.95, 1.84, 2.72], 0.022, m.frame)
  }

  // 2. Continuous chassis rails, rocker/bogie links, steering knuckles and actuators.
  for (const side of [-1, 1]) {
    box([0.19, 0.26, 4.72], [side * 0.97, 1.38, -0.05], m.frame)
    const pivot = [side * 1.35, 1.48, 0.2]
    rod(pivot, [side * 1.43, 1.15, 1.9], 0.115)
    rod(pivot, [side * 1.43, 1.2, -0.95], 0.115)
    rod([side * 1.43, 1.2, -0.95], [side * 1.46, 0.94, -1.9], 0.095)
    rod([side * 1.43, 1.2, -0.95], [side * 1.46, 0.94, 0], 0.095)
    cylinder(0.21, 0.23, pivot, m.steel, [0, 0, Math.PI / 2])
    cylinder(0.16, 0.19, [side * 1.46, 1.2, -0.95], m.steel, [0, 0, Math.PI / 2])
    for (const depth of [-1.9, 0, 1.9]) {
      rod([side * 0.98, 1.37, depth], [side * 1.82, 0.94, depth], 0.09)
      cylinder(0.13, 0.37, [side * 1.48, 0.99, depth], m.frame)
      rod([side * 1.08, 1.78, depth - 0.3], [side * 1.39, 1.3, depth - 0.05], 0.067)
      rod([side * 1.39, 1.3, depth - 0.05], [side * 1.58, 0.96, depth + 0.13], 0.036, m.steel)
      box([0.22, 0.15, 0.32], [side * 1.06, 1.73, depth - 0.3], m.steel)
      tube([[side * 1.14, 1.72, depth], [side * 1.43, 1.55, depth + 0.22], [side * 1.57, 1.03, depth + 0.1]], 0.023)
    }
  }
  for (const depth of [-2.03, -0.85, 0.5, 1.97]) box([2.22, 0.17, 0.16], [0, 1.36, depth], m.frame)
  armor([1.83, 0.12, 3.35], [0, 1.17, -0.12], m.skirt, 0.014)
  const treadMatrices = [], treadColors = []
  const wheelBindings = []
  const treadGeo = new THREE.BoxGeometry(0.31, 0.095, 0.15)
  for (const side of [-1, 1]) for (const [index, depth] of [-1.9, 0, 1.9].entries()) {
    const wheel = new THREE.Group()
    wheel.name = `Wheel ${side < 0 ? 'left' : 'right'} ${['rear', 'middle', 'front'][index]}`
    wheel.position.set(side * 1.82, 0.94, depth)
    rover.add(wheel)
    wheel.rotation.order = 'YXZ'
    const binding = { wheel, front: index === 2, boltStart: bolts.length, treadStart: treadMatrices.length }
    wheelBindings.push(binding)
    const wheelParts = new Map()
    // Lathed shoulder profile gives rounded sidewalls without balloon-like tires.
    const tireProfile = [[0.46, -0.35], [0.73, -0.35], [0.84, -0.28], [0.87, -0.2], [0.87, 0.2], [0.84, 0.28], [0.73, 0.35], [0.46, 0.35]]
    part(new THREE.LatheGeometry(tireProfile.map(p => new THREE.Vector2(...p)), 40), [0, 0, 0], m.rubber, [0, 0, Math.PI / 2], undefined, wheelParts)
    cylinder(0.485, 0.71, [0, 0, 0], m.frame, [0, 0, Math.PI / 2], wheelParts, 32)
    cylinder(0.415, 0.045, [side * 0.368, 0, 0], m.skirt, [0, 0, Math.PI / 2], wheelParts, 32)
    cylinder(0.19, 0.1, [side * 0.396, 0, 0], m.frame, [0, 0, Math.PI / 2], wheelParts)
    cylinder(0.125, 0.024, [side * 0.45, 0, 0], m.steel, [0, 0, Math.PI / 2], wheelParts)
    for (const radius of [0.49, 0.69]) part(new THREE.TorusGeometry(radius, 0.021, 6, 36), [side * 0.354, 0, 0], radius < 0.5 ? m.skirt : m.rubber, [0, Math.PI / 2, 0], undefined, wheelParts)
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2
      bolt([side * 2.218, 0.94 + Math.cos(a) * 0.32, depth + Math.sin(a) * 0.32], 'x', 0.038)
      box([0.025, 0.055, 0.1], [side * 0.397, Math.cos(a) * 0.39, Math.sin(a) * 0.39], m.frame, [a, 0, 0], wheelParts)
    }
    flush(wheel, wheelParts)
    // Staggered chevrons leave an open center channel and deep dust-filled grooves.
    for (let i = 0; i < 28; i++) for (const lane of [-1, 1]) {
      const a = (i + (lane > 0 ? 0.32 : 0)) / 28 * Math.PI * 2
      transform.position.set(side * 1.82 + lane * 0.176, 0.94 + Math.cos(a) * 0.882, depth + Math.sin(a) * 0.882)
      transform.rotation.set(a, lane * 0.34, 0); transform.scale.set(1, 1, 1); transform.updateMatrix()
      treadMatrices.push(transform.matrix.clone())
      treadColors.push(new THREE.Color().setRGB(0.78 + random() * 0.18, 0.72 + random() * 0.14, 0.63 + random() * 0.12))
    }
  }

  // 3. Roof instruments, flank radiators and a rear mission equipment rack.
  for (const side of [-1, 1]) {
    rod([side * 1.16, 3.59, -0.57], [side * 1.16, 3.59, 1.56], 0.033)
    for (const depth of [-0.5, 1.4]) rod([side * 1.16, 3.46, depth], [side * 1.16, 3.59, depth], 0.028)
    armor([0.14, 0.74, 1.13], [side * 1.28, 2.71, -1.32], m.frame, 0.02)
    for (let i = 0; i < 10; i++) box([0.043, 0.055, 1.01], [side * 1.36, 2.4 + i * 0.063, -1.32], m.steel, [0, 0, side * 0.2])
    tube([[side * 1.15, 3.5, -0.4], [side * 1.37, 3.32, -0.6], [side * 1.43, 2.34, -0.65], [side * 1.4, 2.28, -1.93]])
    armor([0.93, 0.63, 1.01], [side * 0.59, 2.64, -1.93], m.orange, 0.032)
    box([0.95, 0.075, 1.025], [side * 0.59, 2.79, -1.93], m.frame)
    for (const offset of [-0.3, 0.3]) {
      box([0.08, 0.64, 1.035], [side * 0.59 + offset, 2.64, -1.93], m.frame)
      box([0.12, 0.17, 0.04], [side * 0.59 + offset, 2.76, -2.465], m.steel)
    }
    rod([side * 0.76, 3.02, -1.93], [side * 0.42, 3.02, -1.93], 0.025, m.frame)
    rod([side * 1.4, 2.32, -2.47], [side * 1.4, 2.79, -2.47], 0.042)
  }
  rod([-1.4, 2.79, -2.47], [1.4, 2.79, -2.47], 0.042)
  // Offset articulated mast: three different optics avoid a robot-face silhouette.
  armor([0.47, 0.14, 0.47], [0.45, 3.61, 0.65], m.frame)
  cylinder(0.14, 0.24, [0.45, 3.78, 0.65], m.steel)
  box([0.13, 0.65, 0.16], [0.45, 4.15, 0.65], m.paint)
  cylinder(0.15, 0.26, [0.45, 4.43, 0.65], m.frame, [0, 0, Math.PI / 2])
  armor([0.95, 0.32, 0.34], [0.45, 4.64, 0.69], m.paint, 0.025)
  box([0.84, 0.245, 0.024], [0.45, 4.64, 0.872], m.frame)
  for (const [offset, radius] of [[-0.29, 0.091], [0.01, 0.06], [0.29, 0.104]]) {
    cylinder(radius, 0.085, [0.45 + offset, 4.64, 0.913], m.frame, [Math.PI / 2, 0, 0], batches, 24)
    cylinder(radius * 0.75, 0.01, [0.45 + offset, 4.64, 0.96], m.glass, [Math.PI / 2, 0, 0], batches, 24)
  }
  tube([[0.57, 3.68, 0.62], [0.67, 3.96, 0.62], [0.56, 4.18, 0.61], [0.61, 4.47, 0.64]], 0.024)
  cylinder(0.22, 0.13, [-0.72, 3.63, -0.13], m.frame)
  cylinder(0.13, 0.29, [-0.72, 3.84, -0.13], m.steel)
  cylinder(0.31, 0.16, [-0.72, 4.02, -0.13], m.glass, undefined, batches, 32)
  cylinder(0.34, 0.06, [-0.72, 4.13, -0.13], m.paint, undefined, batches, 32)
  cylinder(0.16, 0.17, [0.06, 3.66, -0.22], m.paint)
  cylinder(0.09, 0.3, [-1.06, 2.76, -2.22], m.frame)
  rod([-1.06, 2.9, -2.22], [-1.06, 4.68, -2.22], 0.018, m.steel)
  cylinder(0.035, 0.15, [-1.06, 4.72, -2.22], m.composite)
  // Folded sample manipulator and sealed canister on the rear service plate.
  box([1.28, 0.72, 0.16], [0, 1.97, -2.59], m.frame)
  rod([-0.48, 1.76, -2.69], [0.27, 2.12, -2.69], 0.075, m.steel)
  rod([0.27, 2.12, -2.69], [0.61, 1.84, -2.69], 0.063, m.frame)
  for (const [px, py] of [[-0.48, 1.76], [0.27, 2.12], [0.61, 1.84]]) cylinder(0.12, 0.11, [px, py, -2.66], m.skirt, [Math.PI / 2, 0, 0])
  cylinder(0.2, 0.55, [0.94, 2.51, -0.91], m.steel)

  // 4. Small stencils use a single atlas; weathering stays in shared maps/vertex colors.
  const decalMap = texture((ctx, size) => {
    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = '#303331'; ctx.font = 'bold 76px monospace'; ctx.fillText('NOMAD', 24, 87)
    ctx.font = '22px monospace'; ctx.fillText('MARS EXPEDITION', 27, 126)
    ctx.font = 'bold 75px monospace'; ctx.fillText('A-01', 25, 243)
    ctx.font = '21px monospace'; ctx.fillText('EXPLORE / STUDY / RETURN', 27, 282)
    ctx.fillStyle = '#bcb38a'; ctx.fillRect(0, 350, size, 62)
    ctx.fillStyle = '#343733'
    for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(i * 48, 350); ctx.lineTo(i * 48 + 23, 350); ctx.lineTo(i * 48 - 14, 412); ctx.lineTo(i * 48 - 37, 412); ctx.fill() }
  })
  const decal = new THREE.MeshStandardMaterial({ name: 'Rover / mission stencils', map: decalMap, transparent: true, depthWrite: false, roughness: 0.93, polygonOffset: true, polygonOffsetFactor: -1, vertexColors: true })
  function stencil(size, pos, uvRange, rotation) {
    const geo = new THREE.PlaneGeometry(...size), uv = geo.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setY(i, uvRange[0] + uv.getY(i) * (uvRange[1] - uvRange[0]))
    part(geo, pos, decal, rotation)
  }
  stencil([1.44, 0.45], [0, 2.01, 2.617], [0.72, 1])
  for (const side of [-1, 1]) {
    stencil([0.98, 0.35], [side * 1.39, 2.61, 0.14], [0.42, 0.7], [0, side * Math.PI / 2, 0])
    stencil([0.84, 0.115], [side * 1.564, 2.07, -1.87], [0.195, 0.316], [0, side * Math.PI / 2, 0])
  }
  flush(rover, batches)
  function instances(name, geometry, material, matrices, colors) {
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length)
    mesh.name = name
    matrices.forEach((matrix, i) => { mesh.setMatrixAt(i, matrix); if (colors) mesh.setColorAt(i, colors[i]) })
    mesh.instanceMatrix.needsUpdate = true
    if (colors) mesh.instanceColor.needsUpdate = true
    mesh.castShadow = true; mesh.receiveShadow = true
    rover.add(mesh)
    return mesh
  }
  // Instanced geometries need a white vertex color because they share batched materials.
  for (const geo of [treadGeo]) {
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3))
  }
  const boltGeo = new THREE.CylinderGeometry(1, 1, 1, 6)
  boltGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(boltGeo.attributes.position.count * 3).fill(1), 3))
  const treads = instances('Rover / 336 staggered tread blocks', treadGeo, m.rubber, treadMatrices, treadColors)
  const fasteners = instances('Rover / fasteners', boltGeo, m.steel, bolts)
  const matrix = new THREE.Matrix4(), transformWheel = new THREE.Matrix4()
  for (const binding of wheelBindings) {
    const p = binding.wheel.position
    binding.inverseRest = new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z)
  }
  let roll = 0
  rover.userData.animateWheels = (distance, steering) => {
    roll = (roll + distance / 0.94) % (Math.PI * 2)
    for (const binding of wheelBindings) {
      binding.wheel.rotation.set(roll, binding.front ? steering : 0, 0, 'YXZ')
      binding.wheel.updateMatrix()
      transformWheel.multiplyMatrices(binding.wheel.matrix, binding.inverseRest)
      for (let i = binding.treadStart; i < binding.treadStart + 56; i++) {
        treads.setMatrixAt(i, matrix.multiplyMatrices(transformWheel, treadMatrices[i]))
      }
      for (let i = binding.boltStart; i < binding.boltStart + 10; i++) {
        fasteners.setMatrixAt(i, matrix.multiplyMatrices(transformWheel, bolts[i]))
      }
    }
    treads.instanceMatrix.needsUpdate = true
    fasteners.instanceMatrix.needsUpdate = true
    treads.computeBoundingSphere()
    fasteners.computeBoundingSphere()
  }
  sources.forEach(geo => geo.dispose())
  return rover
}
