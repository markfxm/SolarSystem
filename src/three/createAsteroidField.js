import * as THREE from 'three'

const BASE_GEOMETRY_COUNT = 4
const MEDIUM_COUNT_PER_GEOMETRY = 51
const DISTANT_DEBRIS_COUNT = 2100
const HERO_COUNT = 3
const TAU = Math.PI * 2
const INTERACTIVE_INSTANCES_PER_BATCH = 12
const ORBITAL_SPRING = 12
const ORBITAL_DAMPING = 7

function createRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function deformGeometry(seed) {
  const geometry = new THREE.IcosahedronGeometry(1, 2)
  const positions = geometry.getAttribute('position')

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    const z = positions.getZ(i)
    const broad = Math.sin(x * 3.17 + y * 4.31 + z * 2.73 + seed * 1.91)
    const fine = Math.sin(x * 8.13 - y * 6.47 + z * 7.29 + seed * 3.07)
    const radius = 0.88 + broad * 0.18 + fine * 0.1
    positions.setXYZ(i, x * radius, y * radius, z * radius)
  }

  positions.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function clusteredRadius(random, orbitScale) {
  const cluster = random()
  const center = cluster < 0.4 ? 2.35 : cluster < 0.76 ? 2.7 : 3.02
  return orbitScale * (center + (random() - 0.5) * 0.18)
}

function makeBatch(geometry, material, count, random, orbitScale) {
  const mesh = new THREE.InstancedMesh(geometry, material, count)
  const dummy = new THREE.Object3D()
  const positions = new Float32Array(count * 3)
  const rotations = new Float32Array(count * 3)
  const rotationSpeeds = new Float32Array(count * 3)
  const scales = new Float32Array(count * 3)
  const orbitalRadii = new Float32Array(count)
  const orbitalPhases = new Float32Array(count)
  const angularVelocities = new Float32Array(count)
  const inclinations = new Float32Array(count)
  // Performance Optimization: Pre-calculate static radius * sin(inclination) and radius * cos(inclination)
  // terms to eliminate 2 trig functions per instance in every 60fps animation frame.
  const sinIncRadii = new Float32Array(count)
  const cosIncRadii = new Float32Array(count)
  const pointerOffsets = new Float32Array(count * 3)
  const pointerVelocities = new Float32Array(count * 3)
  const rotationImpulses = new Float32Array(count * 3)
  const interactive = new Uint8Array(count)
  const color = new THREE.Color()

  for (let i = 0; i < count; i++) {
    const angle = random() * TAU
    const radius = clusteredRadius(random, orbitScale)
    const offset = i * 3
    const inclination = (random() - 0.5) * 0.09
    orbitalRadii[i] = radius
    orbitalPhases[i] = angle
    angularVelocities[i] = (0.006 + random() * 0.012) * (radius / orbitScale) ** -0.5
    inclinations[i] = inclination
    const sinInc = Math.sin(inclination)
    const cosInc = Math.cos(inclination)
    sinIncRadii[i] = radius * sinInc
    cosIncRadii[i] = radius * cosInc
    const sinAngle = Math.sin(angle)
    positions[offset] = Math.cos(angle) * radius
    positions[offset + 1] = sinAngle * sinIncRadii[i]
    positions[offset + 2] = sinAngle * cosIncRadii[i]

    rotations[offset] = random() * TAU
    rotations[offset + 1] = random() * TAU
    rotations[offset + 2] = random() * TAU
    rotationSpeeds[offset] = (random() - 0.5) * 0.055
    rotationSpeeds[offset + 1] = (random() - 0.5) * 0.055
    rotationSpeeds[offset + 2] = (random() - 0.5) * 0.055

    const size = 1.25 + Math.pow(random(), 2.4) * 3.9
    scales[offset] = size * (0.76 + random() * 0.56)
    scales[offset + 1] = size * (0.66 + random() * 0.5)
    scales[offset + 2] = size * (0.76 + random() * 0.56)
    interactive[i] = i < INTERACTIVE_INSTANCES_PER_BATCH ? 1 : 0

    dummy.position.fromArray(positions, offset)
    dummy.rotation.set(rotations[offset], rotations[offset + 1], rotations[offset + 2])
    dummy.scale.fromArray(scales, offset)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
    color.setScalar(0.78 + random() * 0.18)
    mesh.setColorAt(i, color)
  }

  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere()
  mesh.layers.enable(2)
  mesh.name = 'asteroid-medium-instanced'
  mesh.raycast = () => {}
  mesh.userData.animation = {
    dummy,
    positions,
    rotations,
    rotationSpeeds,
    scales,
    orbitalRadii,
    orbitalPhases,
    angularVelocities,
    inclinations,
    sinIncRadii,
    cosIncRadii,
    pointerOffsets,
    pointerVelocities,
    rotationImpulses,
    interactive
  }
  return mesh
}

function makeHeroMesh(geometry, random) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x51483f,
    roughness: 0.97,
    metalness: 0.01
  })
  const mesh = new THREE.InstancedMesh(geometry, material, HERO_COUNT)
  const dummy = new THREE.Object3D()
  const positions = new Float32Array([
    -167, 70, 461,
    4, 66, 433,
    -90, 92, 509
  ])
  const rotations = new Float32Array(HERO_COUNT * 3)
  const rotationSpeeds = new Float32Array(HERO_COUNT * 3)
  const pointerOffsets = new Float32Array(HERO_COUNT * 3)
  const pointerVelocities = new Float32Array(HERO_COUNT * 3)
  const rotationImpulses = new Float32Array(HERO_COUNT * 3)
  const interactive = new Uint8Array(HERO_COUNT).fill(1)
  const scales = new Float32Array([
    8.5, 6.7, 7.8,
    6.2, 8.1, 6.8,
    4.8, 3.7, 5.4
  ])
  const color = new THREE.Color()

  for (let i = 0; i < HERO_COUNT; i++) {
    const offset = i * 3
    rotations[offset] = random() * TAU
    rotations[offset + 1] = random() * TAU
    rotations[offset + 2] = random() * TAU
    rotationSpeeds[offset] = (random() - 0.5) * 0.035
    rotationSpeeds[offset + 1] = (random() - 0.5) * 0.035
    rotationSpeeds[offset + 2] = (random() - 0.5) * 0.035
    dummy.position.fromArray(positions, offset)
    dummy.rotation.set(rotations[offset], rotations[offset + 1], rotations[offset + 2])
    dummy.scale.fromArray(scales, offset)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
    color.setScalar(0.82 + random() * 0.12)
    mesh.setColorAt(i, color)
  }

  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere()
  mesh.layers.enable(2)
  mesh.name = 'asteroid-hero-instanced'
  mesh.raycast = () => {}
  mesh.userData.animation = {
    dummy,
    positions,
    rotations,
    rotationSpeeds,
    scales,
    pointerOffsets,
    pointerVelocities,
    rotationImpulses,
    interactive
  }
  return mesh
}

function animateInstances(mesh, deltaSeconds, pointerState, camera) {
  const {
    dummy,
    positions,
    rotations,
    rotationSpeeds,
    scales,
    orbitalRadii,
    orbitalPhases,
    angularVelocities,
    sinIncRadii,
    cosIncRadii,
    pointerOffsets,
    pointerVelocities,
    rotationImpulses,
    interactive
  } = mesh.userData.animation
  const pointerRadius = 34

  // Performance Optimization: Hoist frame-invariant spring and damping values outside the instance loop.
  // This eliminates up to 206 Math.exp calls and redundant multiplications per frame.
  const springDelta = ORBITAL_SPRING * deltaSeconds
  const damping = pointerOffsets ? Math.exp(-ORBITAL_DAMPING * deltaSeconds) : 0

  for (let i = 0; i < mesh.count; i++) {
    const offset = i * 3
    if (orbitalPhases) {
      orbitalPhases[i] += angularVelocities[i] * deltaSeconds
      const phase = orbitalPhases[i]
      const cosPhase = Math.cos(phase)
      const sinPhase = Math.sin(phase)
      positions[offset] = cosPhase * orbitalRadii[i]
      positions[offset + 1] = sinPhase * sinIncRadii[i]
      positions[offset + 2] = sinPhase * cosIncRadii[i]
    }

    if (pointerOffsets && interactive[i] && pointerState.active) {
      pointerState.toAsteroid.set(positions[offset], positions[offset + 1], positions[offset + 2])
        .sub(pointerState.raycaster.ray.origin)
      const alongRay = pointerState.toAsteroid.dot(pointerState.raycaster.ray.direction)
      if (alongRay > 0) {
        pointerState.closestPoint.copy(pointerState.raycaster.ray.direction)
          .multiplyScalar(alongRay)
          .add(pointerState.raycaster.ray.origin)
        pointerState.repulsion.set(positions[offset], positions[offset + 1], positions[offset + 2])
          .sub(pointerState.closestPoint)
        const distance = pointerState.repulsion.length()
        if (distance < pointerRadius) {
          if (distance < 0.001) pointerState.repulsion.copy(pointerState.cameraRight)
          else pointerState.repulsion.multiplyScalar(1 / distance)
          const force = ((pointerRadius - distance) / pointerRadius) ** 2 * 10
          pointerVelocities[offset] += (pointerState.repulsion.x * force - pointerOffsets[offset]) * springDelta
          pointerVelocities[offset + 1] += (pointerState.repulsion.y * force - pointerOffsets[offset + 1]) * springDelta
          pointerVelocities[offset + 2] += (pointerState.repulsion.z * force - pointerOffsets[offset + 2]) * springDelta
          rotationImpulses[offset + 1] += force * pointerState.motion * 0.002
        }
      }
    }

    if (pointerOffsets) {
      pointerVelocities[offset] = (pointerVelocities[offset] - pointerOffsets[offset] * springDelta) * damping
      pointerVelocities[offset + 1] = (pointerVelocities[offset + 1] - pointerOffsets[offset + 1] * springDelta) * damping
      pointerVelocities[offset + 2] = (pointerVelocities[offset + 2] - pointerOffsets[offset + 2] * springDelta) * damping
      pointerOffsets[offset] += pointerVelocities[offset] * deltaSeconds
      pointerOffsets[offset + 1] += pointerVelocities[offset + 1] * deltaSeconds
      pointerOffsets[offset + 2] += pointerVelocities[offset + 2] * deltaSeconds
      rotationImpulses[offset] *= damping
      rotationImpulses[offset + 1] *= damping
      rotationImpulses[offset + 2] *= damping
    }

    rotations[offset] += (rotationSpeeds[offset] + (rotationImpulses ? rotationImpulses[offset] : 0)) * deltaSeconds
    rotations[offset + 1] += (rotationSpeeds[offset + 1] + (rotationImpulses ? rotationImpulses[offset + 1] : 0)) * deltaSeconds
    rotations[offset + 2] += (rotationSpeeds[offset + 2] + (rotationImpulses ? rotationImpulses[offset + 2] : 0)) * deltaSeconds
    dummy.position.set(
      positions[offset] + (pointerOffsets ? pointerOffsets[offset] : 0),
      positions[offset + 1] + (pointerOffsets ? pointerOffsets[offset + 1] : 0),
      positions[offset + 2] + (pointerOffsets ? pointerOffsets[offset + 2] : 0)
    )
    dummy.rotation.set(rotations[offset], rotations[offset + 1], rotations[offset + 2])
    dummy.scale.fromArray(scales, offset)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
}

export function createAsteroidField({ orbitScale = 260, seed = 0x51a7e, pointerElement } = {}) {
  const random = createRandom(seed)
  const group = new THREE.Group()
  group.name = 'procedural-asteroid-field'

  const distantPositions = new Float32Array(DISTANT_DEBRIS_COUNT * 3)
  const distantRadii = new Float32Array(DISTANT_DEBRIS_COUNT)
  const distantPhases = new Float32Array(DISTANT_DEBRIS_COUNT)
  const distantAngularVelocities = new Float32Array(DISTANT_DEBRIS_COUNT)
  const distantInclinations = new Float32Array(DISTANT_DEBRIS_COUNT)
  // Performance Optimization: Pre-calculate static radius * sin(inclination) and radius * cos(inclination)
  // for distant debris to eliminate 4,200 dynamic trig calls per 60fps animation update.
  const distantSinIncRadii = new Float32Array(DISTANT_DEBRIS_COUNT)
  const distantCosIncRadii = new Float32Array(DISTANT_DEBRIS_COUNT)
  for (let i = 0; i < DISTANT_DEBRIS_COUNT; i++) {
    const angle = random() * TAU
    const radius = clusteredRadius(random, orbitScale)
    const inclination = (random() - 0.5) * 0.045
    distantRadii[i] = radius
    distantPhases[i] = angle
    distantAngularVelocities[i] = (0.003 + random() * 0.006) * (radius / orbitScale) ** -0.5
    distantInclinations[i] = inclination
    const sinInc = Math.sin(inclination)
    const cosInc = Math.cos(inclination)
    distantSinIncRadii[i] = radius * sinInc
    distantCosIncRadii[i] = radius * cosInc
    const sinAngle = Math.sin(angle)
    distantPositions[i * 3] = Math.cos(angle) * radius
    distantPositions[i * 3 + 1] = sinAngle * distantSinIncRadii[i]
    distantPositions[i * 3 + 2] = sinAngle * distantCosIncRadii[i]
  }
  const distantGeometry = new THREE.BufferGeometry()
  distantGeometry.setAttribute('position', new THREE.BufferAttribute(distantPositions, 3))
  distantGeometry.computeBoundingSphere()
  const distantMaterial = new THREE.PointsMaterial({
    color: 0x8a8177,
    size: 1,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.42,
    depthWrite: false
  })
  const distantDebris = new THREE.Points(distantGeometry, distantMaterial)
  distantDebris.name = 'asteroid-distant-particles'
  distantDebris.raycast = () => {}
  distantDebris.matrixAutoUpdate = false
  distantDebris.userData.animation = {
    distantRadii,
    distantPhases,
    distantAngularVelocities,
    distantInclinations,
    distantSinIncRadii,
    distantCosIncRadii
  }
  group.add(distantDebris)

  const baseGeometries = Array.from(
    { length: BASE_GEOMETRY_COUNT },
    (_, index) => deformGeometry(index + 1)
  )
  const mediumMeshes = baseGeometries.map((geometry, index) => {
    const material = new THREE.MeshStandardMaterial({
      color: [0x49433d, 0x403c39, 0x51483f, 0x45403b][index],
      roughness: 0.95,
      metalness: 0.015
    })
    const mesh = makeBatch(geometry, material, MEDIUM_COUNT_PER_GEOMETRY, random, orbitScale)
    group.add(mesh)
    return mesh
  })

  const heroMesh = makeHeroMesh(baseGeometries[2], random)
  group.add(heroMesh)

  const sunlight = new THREE.PointLight(0xffc27a, 2500000, orbitScale * 5.3, 2)
  sunlight.name = 'asteroid-sunlight'
  sunlight.layers.set(2)
  group.add(sunlight)

  // A restrained bounced-light term keeps foreground silhouettes readable while
  // the warm point light still determines their sun-facing highlights.
  const ambientBounce = new THREE.AmbientLight(0x8a7564, 2)
  ambientBounce.name = 'asteroid-ambient-bounce'
  ambientBounce.layers.set(2)
  group.add(ambientBounce)

  const pointerState = {
    active: false,
    motion: 0,
    x: 0,
    y: 0,
    raycaster: new THREE.Raycaster(),
    toAsteroid: new THREE.Vector3(),
    closestPoint: new THREE.Vector3(),
    repulsion: new THREE.Vector3(),
    cameraRight: new THREE.Vector3()
  }
  const pointerMove = event => {
    const bounds = pointerElement.getBoundingClientRect()
    const nextX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
    const nextY = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
    const dx = nextX - pointerState.x
    const dy = nextY - pointerState.y
    pointerState.motion = Math.min(1, Math.hypot(dx, dy) * 8)
    pointerState.x = nextX
    pointerState.y = nextY
    pointerState.active = true
  }
  const clearPointer = () => { pointerState.active = false }
  if (pointerElement) {
    pointerElement.addEventListener('pointermove', pointerMove, { passive: true })
    pointerElement.addEventListener('pointerleave', clearPointer, { passive: true })
  }

  const updateDistantDebris = deltaSeconds => {
    for (let i = 0; i < DISTANT_DEBRIS_COUNT; i++) {
      distantPhases[i] += distantAngularVelocities[i] * deltaSeconds
      const phase = distantPhases[i]
      const cosPhase = Math.cos(phase)
      const sinPhase = Math.sin(phase)
      const offset = i * 3
      distantPositions[offset] = cosPhase * distantRadii[i]
      distantPositions[offset + 1] = sinPhase * distantSinIncRadii[i]
      distantPositions[offset + 2] = sinPhase * distantCosIncRadii[i]
    }
    distantGeometry.getAttribute('position').needsUpdate = true
  }

  const update = (deltaSeconds, camera, showHeroes = true) => {
    camera?.layers.enable(2)
    if (camera && pointerState.active) {
      pointerState.raycaster.setFromCamera({ x: pointerState.x, y: pointerState.y }, camera)
      pointerState.cameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize()
    }
    pointerState.motion *= Math.exp(-8 * deltaSeconds)
    updateDistantDebris(deltaSeconds)
    const cameraDistance = camera?.position.length() ?? 0
    const showMedium = cameraDistance < 5000
    for (const mesh of mediumMeshes) {
      mesh.visible = showMedium
      if (showMedium) animateInstances(mesh, deltaSeconds, pointerState, camera)
    }
    heroMesh.visible = Boolean(showHeroes && camera && camera.aspect >= 0.85 && cameraDistance < 1500)
    if (heroMesh.visible) animateInstances(heroMesh, deltaSeconds, pointerState, camera)
  }

  const dispose = () => {
    if (pointerElement) {
      pointerElement.removeEventListener('pointermove', pointerMove)
      pointerElement.removeEventListener('pointerleave', clearPointer)
    }
    distantGeometry.dispose()
    distantMaterial.dispose()
    for (const mesh of mediumMeshes) mesh.material.dispose()
    heroMesh.material.dispose()
    for (const geometry of baseGeometries) geometry.dispose()
  }

  const setPointerNdc = (x, y, motion = 0) => {
    pointerState.motion = Math.min(1, Math.max(pointerState.motion, motion))
    pointerState.x = x
    pointerState.y = y
    pointerState.active = true
  }

  return { group, distantDebris, mediumMeshes, heroMesh, sunlight, update, setPointerNdc, clearPointer, dispose }
}
