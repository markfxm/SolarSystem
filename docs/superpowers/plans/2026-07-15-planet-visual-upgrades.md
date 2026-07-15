# Planet Visual Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade all planet visuals with color-correct textures, profile-specific surface response, Earth and Sun layers, and close-view detail while preserving the current shared-sphere architecture.

**Architecture:** Keep the default shared unit sphere and introduce one shared high-detail sphere. Centralize texture configuration and planet surface shaders in focused modules; Earth and Sun own their special layers and animation uniforms. Existing `prioritizeHQ()` becomes the single promotion path for high-resolution textures and geometry.

**Tech Stack:** Vue 3, Three.js 0.168, Vite 7, Node test runner, Playwright/Browser QA.

## Global Constraints

- Do not add npm dependencies or imported GLB/GLTF models.
- Do not change orbital scale, astronomy calculations, navigation behavior, POIs, grids, holographic mode, or Mars surface exploration.
- Keep shadow maps disabled in the main solar-system scene.
- Preserve low-resolution initial loading and load high-resolution assets on prioritization.
- Use shared geometry and decorative-layer raycast opt-outs to limit runtime overhead.

---

### Task 1: Texture quality and shared detail geometry

**Files:**
- Create: `src/three/planetTextures.js`
- Modify: `src/three/geometries.js`
- Modify: `src/three/createSolarSystem.js`
- Modify: `src/components/SolarSystem.vue`
- Modify: `src/planets/Saturn/index.js`
- Create: `public/moon.jpg`
- Create: `src/tests/planetTextures.test.js`

**Interfaces:**
- Produces: `LOW_RES_PLANET_MAPS`, `HIGH_RES_PLANET_MAPS`, `configureColorTexture(texture, renderer)`, `configureDataTexture(texture, renderer)`, `unitSphereGeometry`, and `detailSphereGeometry`.
- Consumes: the existing repository-owned `public/hq/8k_moon.jpg` as the source for the derived low-resolution asset.

- [ ] **Step 1: Write failing texture and manifest tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  LOW_RES_PLANET_MAPS,
  configureColorTexture,
  configureDataTexture
} from '../three/planetTextures.js'

const renderer = { capabilities: { getMaxAnisotropy: () => 16 } }

test('Moon uses its own low-resolution texture', () => {
  assert.equal(LOW_RES_PLANET_MAPS.moon, '/moon.jpg')
})

test('color textures use sRGB and capped anisotropy', () => {
  const texture = new THREE.Texture()
  configureColorTexture(texture, renderer)
  assert.equal(texture.colorSpace, THREE.SRGBColorSpace)
  assert.equal(texture.anisotropy, 8)
})

test('data textures remain non-color data', () => {
  const texture = new THREE.Texture()
  configureDataTexture(texture, renderer)
  assert.equal(texture.colorSpace, THREE.NoColorSpace)
  assert.equal(texture.anisotropy, 8)
})
```

- [ ] **Step 2: Run the focused tests and confirm the missing-module failure**

Run: `node --test src/tests/planetTextures.test.js`

Expected: FAIL because `src/three/planetTextures.js` does not exist.

- [ ] **Step 3: Implement texture manifests and configuration**

Create exports with the current map paths, change only Moon low resolution to `/moon.jpg`, set `texture.colorSpace`, and set anisotropy to `Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() || 1)`. Export `detailSphereGeometry = new THREE.SphereGeometry(1, 96, 96)` next to the existing `48 x 48` geometry and precompute both bounding spheres.

- [ ] **Step 4: Generate the low-resolution Moon asset**

Run:

```powershell
python -c "from PIL import Image; im=Image.open(r'public/hq/8k_moon.jpg'); im.thumbnail((2048,1024), Image.Resampling.LANCZOS); im.save(r'public/moon.jpg', quality=85, optimize=True, progressive=True)"
```

Expected: `public/moon.jpg` exists, is at most `2048 x 1024`, and is substantially smaller than the 8K source.

- [ ] **Step 5: Wire the manifest and color configuration into loading**

Change `createSolarSystem(scene, renderer, zodiacNames, onProgress)` to import the manifests and configure every loaded color texture. Configure Saturn's alpha texture as data in its task-local loading path. Update the only caller in `SolarSystem.vue` to pass `engine.renderer`.

- [ ] **Step 6: Run tests and build**

Run: `node --test src/tests/planetTextures.test.js`

Expected: 3 tests PASS.

Run: `npm run build`

Expected: Vite exits 0.

- [ ] **Step 7: Commit the verified texture foundation**

```powershell
git add -- src/three/planetTextures.js src/three/geometries.js src/three/createSolarSystem.js src/components/SolarSystem.vue src/planets/Saturn/index.js src/tests/planetTextures.test.js public/moon.jpg
git commit -m "feat: improve planet texture quality"
```

---

### Task 2: Profile-specific planet surface material

**Files:**
- Create: `src/planets/materials/PlanetSurfaceMaterial.js`
- Modify: `src/planets/base/BasePlanet.js`
- Create: `src/tests/planetSurfaceMaterial.test.js`

**Interfaces:**
- Produces: `PLANET_SURFACE_PROFILES`, `getPlanetSurfaceProfile(name)`, and `createPlanetSurfaceMaterial(name, dayTexture, nightTexture)`.
- Consumes: color-correct textures from Task 1.

- [ ] **Step 1: Write failing profile and uniform tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  getPlanetSurfaceProfile,
  createPlanetSurfaceMaterial
} from '../planets/materials/PlanetSurfaceMaterial.js'

test('planet families select intentional surface profiles', () => {
  assert.equal(getPlanetSurfaceProfile('mars').kind, 'rocky')
  assert.equal(getPlanetSurfaceProfile('earth').kind, 'terrestrial')
  assert.equal(getPlanetSurfaceProfile('jupiter').kind, 'gas')
  assert.equal(getPlanetSurfaceProfile('neptune').kind, 'ice')
})

test('rocky surfaces carry more micro detail than gas giants', () => {
  assert.ok(getPlanetSurfaceProfile('mercury').detailStrength > getPlanetSurfaceProfile('saturn').detailStrength)
})

test('Earth material retains day and night texture uniforms', () => {
  const day = new THREE.Texture()
  const night = new THREE.Texture()
  const material = createPlanetSurfaceMaterial('earth', day, night)
  assert.equal(material.uniforms.dayTexture.value, day)
  assert.equal(material.uniforms.nightTexture.value, night)
  assert.equal(material.uniforms.useNight.value, true)
})
```

- [ ] **Step 2: Run and confirm the missing-module failure**

Run: `node --test src/tests/planetSurfaceMaterial.test.js`

Expected: FAIL because the material module does not exist.

- [ ] **Step 3: Implement the material profiles and shader**

Implement four frozen profiles. The shader must retain day/night terminator behavior, derive restrained micro-normal variation from neighboring/luminance derivatives for rocky and terrestrial profiles, apply roughness-controlled Blinn-Phong specular response, and keep gas/ice profiles smooth. Keep shader code self-contained and do not add texture downloads.

- [ ] **Step 4: Replace BasePlanet's inline shader**

Import `createPlanetSurfaceMaterial`, remove the inline shader strings, and preserve the existing uniform names so `updateHQ()` continues replacing `dayTexture` and `nightTexture` without API changes.

- [ ] **Step 5: Run focused and existing tests**

Run: `node --test src/tests/planetSurfaceMaterial.test.js src/tests/pr145Review.test.js`

Expected: all tests PASS.

Run: `npm run build`

Expected: Vite exits 0 with shader source bundled successfully.

- [ ] **Step 6: Commit the surface-material upgrade**

```powershell
git add -- src/planets/materials/PlanetSurfaceMaterial.js src/planets/base/BasePlanet.js src/tests/planetSurfaceMaterial.test.js
git commit -m "feat: add planet surface material profiles"
```

---

### Task 3: Earth atmosphere, clouds, and visual updates

**Files:**
- Create: `src/planets/Earth/EarthMaterials.js`
- Modify: `src/planets/Earth/index.js`
- Create: `src/tests/earthVisuals.test.js`

**Interfaces:**
- Produces: `createEarthAtmosphereMaterial()`, `createEarthCloudMaterial()`, `Earth.updateVisuals(deltaSeconds)`, and child meshes named `earthAtmosphere` and `earthClouds`.
- Consumes: `unitSphereGeometry` and the terrestrial surface material from Tasks 1-2.

- [ ] **Step 1: Write failing Earth-layer tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { Earth } from '../planets/Earth/index.js'

test('Earth creates atmosphere and cloud shells', () => {
  const earth = new Earth(3, new THREE.Scene())
  const mesh = earth.create(new THREE.Texture(), new THREE.Texture())
  assert.ok(mesh.getObjectByName('earthAtmosphere'))
  assert.ok(mesh.getObjectByName('earthClouds'))
})

test('Earth visual update advances cloud time', () => {
  const earth = new Earth(3, new THREE.Scene())
  earth.create(new THREE.Texture(), new THREE.Texture())
  const before = earth.cloudMaterial.uniforms.time.value
  earth.updateVisuals(0.5)
  assert.equal(earth.cloudMaterial.uniforms.time.value, before + 0.5)
})
```

- [ ] **Step 2: Run and confirm missing-layer/update failures**

Run: `node --test src/tests/earthVisuals.test.js`

Expected: FAIL because the new named layers and `updateVisuals` method are absent.

- [ ] **Step 3: Implement focused Earth materials**

Create a transparent back-side Fresnel atmosphere shader with day-side attenuation and a transparent front-side procedural cloud shader using deterministic multi-octave value noise. Both shaders use `depthWrite: false`; the cloud shell uses low opacity and a scale near `1.012`, while the atmosphere uses a scale near `1.05`.

- [ ] **Step 4: Replace the uniform blue shell and add animation**

Create named atmosphere/cloud meshes, disable their raycasts, keep their transforms static, store the cloud material on the Earth instance, and make `updateVisuals(deltaSeconds)` advance only the cloud time uniform.

- [ ] **Step 5: Run tests and build**

Run: `node --test src/tests/earthVisuals.test.js src/tests/planetSurfaceMaterial.test.js`

Expected: all tests PASS.

Run: `npm run build`

Expected: Vite exits 0.

- [ ] **Step 6: Commit the Earth upgrade**

```powershell
git add -- src/planets/Earth/EarthMaterials.js src/planets/Earth/index.js src/tests/earthVisuals.test.js
git commit -m "feat: add layered Earth visuals"
```

---

### Task 4: Animated Sun surface and corona

**Files:**
- Create: `src/planets/Sun/SunMaterials.js`
- Modify: `src/planets/Sun/index.js`
- Create: `src/tests/sunVisuals.test.js`

**Interfaces:**
- Produces: `createSunSurfaceMaterial(texture)`, `createSunCoronaMaterial()`, `Sun.updateVisuals(deltaSeconds)`, and a child mesh named `sunCorona`.
- Consumes: `unitSphereGeometry` and color-correct Sun textures.

- [ ] **Step 1: Write failing Sun visual tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { Sun } from '../planets/Sun/index.js'

test('Sun creates an animated surface and corona', () => {
  const sun = new Sun(10, new THREE.Scene())
  const mesh = sun.create(new THREE.Texture())
  assert.ok(mesh.material.uniforms.time)
  assert.ok(mesh.getObjectByName('sunCorona'))
})

test('Sun visual update advances surface and corona time', () => {
  const sun = new Sun(10, new THREE.Scene())
  sun.create(new THREE.Texture())
  sun.updateVisuals(0.25)
  assert.equal(sun.originalMaterial.uniforms.time.value, 0.25)
  assert.equal(sun.coronaMaterial.uniforms.time.value, 0.25)
})
```

- [ ] **Step 2: Run and confirm missing-uniform/corona failures**

Run: `node --test src/tests/sunVisuals.test.js`

Expected: FAIL because the Sun still uses `MeshBasicMaterial`.

- [ ] **Step 3: Implement Sun shaders**

Create a texture-backed surface shader with low-amplitude animated procedural granulation and a transparent back-side Fresnel corona shader. Keep the effect bounded and dependency-free; set `depthWrite: false` only on the corona.

- [ ] **Step 4: Integrate updates and HQ replacement**

Store named corona/material references, disable corona raycasting, advance both time uniforms in `updateVisuals`, and update `Sun.updateHQ()` to replace `originalMaterial.uniforms.map.value` while preserving holographic switching.

- [ ] **Step 5: Run tests and build**

Run: `node --test src/tests/sunVisuals.test.js src/tests/earthVisuals.test.js`

Expected: all tests PASS.

Run: `npm run build`

Expected: Vite exits 0.

- [ ] **Step 6: Commit the Sun upgrade**

```powershell
git add -- src/planets/Sun/SunMaterials.js src/planets/Sun/index.js src/tests/sunVisuals.test.js
git commit -m "feat: animate the Sun surface and corona"
```

---

### Task 5: Close-view detail promotion and frame integration

**Files:**
- Create: `src/three/planetDetail.js`
- Modify: `src/three/createSolarSystem.js`
- Modify: `src/components/SolarSystem.vue`
- Create: `src/tests/planetDetail.test.js`

**Interfaces:**
- Produces: `createPlanetDetailController(planetObjects)` with `prioritize(name)` and `activeName`, plus `solar.updateVisuals(deltaSeconds)`.
- Consumes: `unitSphereGeometry`, `detailSphereGeometry`, planet instances, and existing `prioritizeHQ(name)` calls.

- [ ] **Step 1: Write failing promotion tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { unitSphereGeometry, detailSphereGeometry } from '../three/geometries.js'
import { createPlanetDetailController } from '../three/planetDetail.js'

test('prioritizing one body promotes it and demotes the previous body', () => {
  const earth = new THREE.Mesh(unitSphereGeometry)
  const mars = new THREE.Mesh(unitSphereGeometry)
  const detail = createPlanetDetailController({ earth, mars })
  detail.prioritize('earth')
  assert.equal(earth.geometry, detailSphereGeometry)
  detail.prioritize('mars')
  assert.equal(earth.geometry, unitSphereGeometry)
  assert.equal(mars.geometry, detailSphereGeometry)
})

test('unknown bodies leave the current detail body unchanged', () => {
  const earth = new THREE.Mesh(unitSphereGeometry)
  const detail = createPlanetDetailController({ earth })
  detail.prioritize('earth')
  detail.prioritize('pluto')
  assert.equal(detail.activeName, 'earth')
})
```

- [ ] **Step 2: Run and confirm the missing-controller failure**

Run: `node --test src/tests/planetDetail.test.js`

Expected: FAIL because `planetDetail.js` does not exist.

- [ ] **Step 3: Implement the detail controller**

Promote only known body meshes, demote the prior active mesh, reuse the two exported geometries, and never allocate geometry during prioritization.

- [ ] **Step 4: Integrate detail and visual updates**

In `createSolarSystem`, construct the detail controller after body creation. Make `prioritizeHQ(name)` promote detail before starting the existing HQ load. Return `updateVisuals(deltaSeconds)` that calls the Earth and Sun instance methods directly. In the `engine.start` solar-mode branch, call `solar.updateVisuals(delta)` once per frame.

- [ ] **Step 5: Run the complete automated verification**

Run:

```powershell
node --test src/tests/*.test.js
npm run build
git diff --check
```

Expected: all Node tests PASS, Vite exits 0, and `git diff --check` produces no errors.

- [ ] **Step 6: Commit the integrated close-view upgrade**

```powershell
git add -- src/three/planetDetail.js src/three/createSolarSystem.js src/components/SolarSystem.vue src/tests/planetDetail.test.js
git commit -m "feat: promote close-view planet detail"
```

---

### Task 6: Browser visual QA and final verification

**Files:**
- Modify only if QA exposes an in-scope rendering defect.
- Keep screenshots and temporary scripts outside the repository.

**Interfaces:**
- Validates: initial scene render, Earth selection, Sun selection, texture loading, close-view geometry, console health, and narrow viewport stability.

- [ ] **Step 1: Start the Vite development server**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite reports a reachable localhost URL without startup errors.

- [ ] **Step 2: Validate with the in-app Browser plugin**

Follow the Browser skill exactly. Test flow: app loads -> solar-system scene renders -> select Earth and inspect atmosphere/cloud limb -> select Sun and inspect animated surface/corona -> selected body remains interactive without console errors.

Check desktop `1440 x 900` and one narrow viewport around `768 x 900`. Record page identity, meaningful DOM, no framework overlay, console warnings/errors, screenshots, and interaction state changes.

- [ ] **Step 3: Fix only reproducible in-scope defects with a regression test first**

For any behavior defect, add a focused Node test that fails for the observed reason before changing production code. For shader-only visual defects, record before/after screenshots and make the smallest constant or material-state adjustment.

- [ ] **Step 4: Run fresh final verification**

Run:

```powershell
node --test src/tests/*.test.js
npm run build
git diff --check
git status --short --branch
```

Expected: zero test failures, build exit code 0, no whitespace errors, and only intentional branch changes.

- [ ] **Step 5: Review the six requirements against the implementation**

Confirm one-by-one: Moon/color/anisotropy; rocky detail; Earth layers; Sun layers; gas/ice profiles; close-view shared detail. Report any remaining browser/GPU-specific risk explicitly.
