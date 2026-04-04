<template>
  <div class="solar-system-root">
    <div ref="container" class="three-container"></div>

    <!-- HUD -->
    <div v-if="!isLoading && viewMode === 'solar'" class="hud">
      <div class="time-container">
        <div class="time-real">
          <span class="label">{{ t('control.realTime') || 'Real Time' }}:</span>
          {{ currentTime }}
        </div>
        <div class="time-sim" v-if="isSimulating">
          <span class="label">{{ t('control.simTime') || 'Sim Time' }}:</span>
          {{ simulationTime }}
        </div>
      </div>
      <div v-if="hoveredPlanetName" class="hover-name">
        {{ hoveredPlanetName }}
      </div>
    </div>

    <!-- System Console (Unified Controls) -->
    <SystemConsole
      v-if="!isLoading && viewMode === 'solar'"
      ref="systemConsole"
      :showZodiac="showZodiac"
      :showGrid="showGrid"
      :showHolo="showHolo"
      :hasSelectedPlanet="!!selectedPlanetId"
      positionTop="80px"
      @home="onHomeClick"
      @toggle-zodiac="toggleZodiac"
      @toggle-grid="toggleGrid"
      @toggle-holo="toggleHolo"
      @speed-change="onSpeedChange"
      @reset="onReset"
    />

    <!-- POI Overlay -->
    <svg v-if="selectedPOI && poiUI.visible" class="poi-svg-overlay">
      <path
        :key="selectedPOI?.poiId"
        class="poi-line"
        :d="poiUI.linePath"
      />
    </svg>

    <div v-if="selectedPOI && poiUI.visible" class="poi-panel-wrapper" :style="poiPanelStyle">
      <POIPanel
        v-if="selectedPOI"
        :key="selectedPOI.name"
        :poi="selectedPOI"
        :side="poiUI.side"
        @close="selectedPOI = null"
        @land="onLandOnMars"
        @drag-start="handlePoiDragStart"
      />
    </div>

    <!-- Top Center Actions -->
    <div v-if="!isLoading && viewMode === 'solar'" class="top-center-actions">
      <button 
        class="stellar-btn"
        @click="openStellarModal"
      >
        ✨ {{ t('stellar.btn') }}
      </button>
    </div>

    <!-- Language Panel -->
    <LanguagePanel />

    <!-- Stellar Moment Modal -->
    <StellarMomentModal
      v-if="showStellarModal"
      :currentDate="captureDate"
      :isCapturing="isCapturing"
      :capturedImage="capturedImage"
      @close="closeStellarModal"
      @preview="onStellarPreview"
      @capture="onStellarCapture"
      @download="onStellarDownload"
      @discard="onStellarDiscard"
    />

    <!-- Tour/Info Panel -->
    <TourPanel
      v-if="infoPlanetId"
      :planetName="infoPlanetId"
      @close="onInfoPanelClose"
      @land="onLandOnMars"
    />

    <!-- Cloud Transition Overlay -->
    <div v-if="showCloudOverlay" class="cloud-overlay" :class="{ 'fade-in': cloudFadeIn }">
      <div class="cloud-content">
        <div class="entry-text">{{ enteringText }}</div>
      </div>
    </div>

    <!-- Mars Surface UI -->
    <div v-if="viewMode === 'mars'" class="mars-ui">
      <button class="return-btn" @click="returnToOrbit">
        🛸 {{ t('mars.return_orbit') }}
      </button>
    </div>

    <!-- Navigation Panel -->
    <PlanetNavigationPanel
      v-if="!isLoading && viewMode === 'solar'"
      :selectedBody="selectedPlanetId"
      @select="onPlanetSelected"
      @info="onShowInfo"
    />

    <TransitPanel
      :visible="showTransitPanel"
      :chart="currentChart"
      :aspects="activeAspects"
      :elementBalance="elementBalance"
      :dominantElement="dominantElement"
      @focus-planet="handleFocusPlanet"
      @close="showTransitPanel = false"
    />

    <MarsHUD
      :isVisible="viewMode === 'mars'"
      planetId="mars"
      :planetName="t('planet.mars')"
      :playerPos="marsPlayerPos"
      :playerYaw="marsPlayerYaw"
      :explorationPath="marsPath"
      :landerPos="marsLanderPos"
      @exit="returnToOrbit"
      @clear-path="onClearMarsPath"
    />

    <!-- AI Chat Agent -->
    <ChatAgent v-if="!isLoading && viewMode === 'solar'" />

  </div>
</template>

<script setup>
import { ref, reactive, shallowRef, onMounted, onUnmounted, computed, watch } from 'vue'

import PlanetNavigationPanel from './PlanetNavigationPanel.vue'
import SystemConsole from './SystemConsole.vue'
import LanguagePanel from './LanguagePanel.vue'
import TourPanel from './TourPanel.vue'
import StellarMomentModal from './StellarMomentModal.vue'
import TransitPanel from './TransitPanel.vue'
import MarsHUD from '../planets/Mars/MarsHUD.vue'
import POIPanel from './POIPanel.vue'
import ChatAgent from './ChatAgent.vue'

import { t, currentLang } from '../utils/i18n'
import { captureHighRes, downloadImage } from '../utils/ScreenshotEngine'
import * as THREE from 'three'

import { createEngine } from '../three/engine.js'
import { createSolarSystem } from '../three/createSolarSystem.js'
import { createTimeController } from '../three/timeController.js'
import { createInteractions } from '../three/interactions.js'
import { createMarsSurface } from '../planets/Mars/MarsSurface.js'
import { updatePOIs, refreshPOILabels } from '../utils/POI.js'
import { AestheticSnapshotManager } from '../utils/AestheticSnapshot.js'
import { AstrologyService } from '../utils/AstrologyService.js'

const container = shallowRef(null)
const systemConsole = ref(null)

const hoveredPlanetName = ref('')
const selectedPlanetId = ref(null)
const infoPlanetId = ref(null)
const isLoading = ref(true)
const loadingProgress = ref(0)
const currentTime = ref('')
const simulationTime = ref('')
const isSimulating = ref(false)
const showStellarModal = ref(false)
const isCapturing = ref(false)
const captureDate = ref(new Date())
const capturedImage = ref('')
const showZodiac = ref(false) // Controls 3D features (Ring, Lines, Auras)
const showTransitPanel = ref(false) // Controls UI Panel
const showHolo = ref(false)
const currentChart = shallowRef({})
const activeAspects = shallowRef([])
const elementBalance = shallowRef({ fire: 0, earth: 0, air: 0, water: 0 })
const dominantElement = ref('none')
const showGrid = ref(false)
const selectedPOI = ref(null)
const poiDragOffset = ref({ x: 0, y: 0 })
const isDraggingPoi = ref(false)
const poiDragStartMouse = { x: 0, y: 0 }
const poiDragStartOffset = { x: 0, y: 0 }


const poiUI = reactive({
  id: '',
  visible: false,
  x: 0,
  y: 0,
  side: 'right',
  linePath: '',
  panelX: 0,
  panelY: 0,
  initialSide: 'right'
})
// Optimization: Use reactive for position to avoid 60 object allocations per second
const marsPlayerPos = reactive({ x: 0, y: 0, z: 0 })
const marsPlayerYaw = ref(0)
const marsPath = shallowRef([])
const marsLanderPos = ref({ x: 0, z: -10 })

const poiPanelStyle = computed(() => {
  return {
    position: 'absolute',
    left: `${poiUI.panelX}px`,
    top: `${poiUI.panelY}px`,
    zIndex: 1002,
    pointerEvents: 'none'
  };
});

const viewMode = ref('solar') // 'solar' | 'mars'
const showCloudOverlay = ref(false)
const cloudFadeIn = ref(false)
const isLanding = ref(true)
const enteringText = computed(() => isLanding.value ? t('mars.entering') : t('mars.leaving'))

let engine
let solar
let timeController
let sunController
let lastSimD = 0
let interactions
let marsSurface
let clockTimer
let planetsWithPOIs = []
let _isAuraVisible = false

// Scratch variables for POI projection to minimize GC
const _poiWorldPos = new THREE.Vector3()
let _lastPoiX = -1;
let _lastPoiY = -1;
const _planetWorldPos = new THREE.Vector3()
const _normal = new THREE.Vector3()
const _viewDir = new THREE.Vector3()
const _tempV = new THREE.Vector3()

const planetNames = computed(() => ({
  sun: t('planet.sun'),
  mercury: t('planet.mercury'),
  venus: t('planet.venus'),
  earth: t('planet.earth'),
  mars: t('planet.mars'),
  jupiter: t('planet.jupiter'),
  saturn: t('planet.saturn'),
  uranus: t('planet.uranus'),
  neptune: t('planet.neptune'),
  moon: t('planet.moon')
}))

function startClock() {
  currentTime.value = new Date().toLocaleString()
  return setInterval(() => {
    currentTime.value = new Date().toLocaleString()
  }, 1000)
}

function onPlanetSelected(id) {
  selectedPlanetId.value = id
  interactions?.focusPlanetById(id)

  // Prioritize HQ texture loading for selected planet
  if (solar && solar.prioritizeHQ) {
    solar.prioritizeHQ(id)
  }
}

function onShowInfo(id) {
  infoPlanetId.value = id
  if (solar && solar.prioritizeHQ) {
    solar.prioritizeHQ(id)
  }
}

function onInfoPanelClose() {
  infoPlanetId.value = null
}

async function onLandOnMars(coords = null) {
  if (viewMode.value === 'mars') return
  infoPlanetId.value = null // Close the panel
  selectedPOI.value = null // Close POI prompt

  isLanding.value = true
  showCloudOverlay.value = true
  setTimeout(() => { cloudFadeIn.value = true }, 10)

  await new Promise(r => setTimeout(r, 2000))

  const MARS_RADIUS = 3389500;
  const DEG_PER_METER = 180 / (Math.PI * MARS_RADIUS);
  const targetCoords = (coords && coords.lat !== undefined) ? coords : null;

  if (!marsSurface) {
    const options = {};
    if (targetCoords) {
      options.spawnX = (targetCoords.lon - 226.2) / DEG_PER_METER;
      options.spawnZ = (18.65 - targetCoords.lat) / DEG_PER_METER;
    }
    marsSurface = createMarsSurface(engine.renderer, options)
  } else if (targetCoords) {
    const tx = (targetCoords.lon - 226.2) / DEG_PER_METER;
    const tz = (18.65 - targetCoords.lat) / DEG_PER_METER;
    marsSurface.teleport(tx, tz);
  }
  const lPos = marsSurface.getLanderPosition()
  if (lPos) {
    marsLanderPos.value = { x: lPos.x, y: lPos.y, z: lPos.z }
  }

  viewMode.value = 'mars'
  engine.setActiveScene(marsSurface.scene, marsSurface.camera)
  if (interactions) interactions.setEnabled(false)

  window.addEventListener('keydown', marsSurface.onKeyDown)
  window.addEventListener('keyup', marsSurface.onKeyUp)
  window.addEventListener('mousemove', marsSurface.onMouseMove)

  // Request pointer lock on first click when in Mars mode
  const requestLock = () => {
    if (viewMode.value === 'mars' && marsSurface.requestPointerLock) {
      marsSurface.requestPointerLock()
    }
  }
  container.value.addEventListener('click', requestLock)
  marsSurface._requestLockRef = requestLock // Keep ref for removal

  cloudFadeIn.value = false
  setTimeout(() => { showCloudOverlay.value = false }, 2000)
}

function onClearMarsPath() {
  if (marsSurface) {
    marsSurface.clearPath()
    marsPath.value = []
  }
}

function returnToOrbit() {
  isLanding.value = false
  showCloudOverlay.value = true
  setTimeout(() => { cloudFadeIn.value = true }, 10)

  if (document.exitPointerLock) {
    document.exitPointerLock()
  }

  setTimeout(() => {
    viewMode.value = 'solar'
    engine.setActiveScene()
    if (interactions) interactions.setEnabled(true)

    window.removeEventListener('keydown', marsSurface.onKeyDown)
    window.removeEventListener('keyup', marsSurface.onKeyUp)
    window.removeEventListener('mousemove', marsSurface.onMouseMove)
    if (marsSurface._requestLockRef) {
      container.value.removeEventListener('click', marsSurface._requestLockRef)
    }

    // Clear exploration history when returning to orbit
    marsSurface.clearPath()
    marsPath.value = []

    marsSurface.dispose()
    marsSurface = null

    cloudFadeIn.value = false
    setTimeout(() => { showCloudOverlay.value = false }, 2000)
  }, 2000)
}

function handleFocusPlanet(name) {
  if (interactions) {
    interactions.focusPlanetById(name)
  }
  if (solar && solar.prioritizeHQ) {
    solar.prioritizeHQ(name)
  }
}

function onHomeClick() {
  selectedPlanetId.value = null
  interactions?.goHome()
}

function toggleZodiac() {
  showZodiac.value = !showZodiac.value
  showTransitPanel.value = showZodiac.value // Open panel when mode starts, but they can close it later
  
  if (solar && solar.zodiacRing) {
    solar.zodiacRing.visible = showZodiac.value
  }
  if (solar && solar.aspectsManager) {
    solar.aspectsManager.setVisible(showZodiac.value)
  }
}

function toggleGrid() {
  showGrid.value = !showGrid.value
  updateGridsVisibility()
}

function toggleHolo() {
  showHolo.value = !showHolo.value

  // Toggle UI Theme
  if (showHolo.value) {
    document.documentElement.classList.add('theme-holographic')
  } else {
    document.documentElement.classList.remove('theme-holographic')
  }

  if (solar && solar.setHolographic) {
    solar.setHolographic(showHolo.value)
  }
}

function updateGridsVisibility() {
  if (!solar) return
  const allPlanets = solar.planets || []
  allPlanets.forEach(p => {
    if (p.userData && p.userData.grid) {
      // Show grid only if global toggle is ON and this planet is currently selected/focused
      p.userData.grid.visible = showGrid.value && (selectedPlanetId.value === p.userData.name)
    }
  })
}

function onSpeedChange(mult) {
  if (!timeController) return
  if (mult === 1) {
    isSimulating.value = false // Hide sim time for real-time
    timeController.setRealTime()
  } else {
    isSimulating.value = true
    timeController.setFastSpeed(mult)
  }
}

function updateOrbitResolution(w, h) {
  if (!engine?.scene) return
  engine.scene.traverse(obj => {
    if (obj.material?.resolution) {
      obj.material.resolution.set(w, h)
    }
  })
}

function handlePoiDragStart(event) {
  isDraggingPoi.value = true
  poiDragStartMouse.x = event.clientX
  poiDragStartMouse.y = event.clientY
  poiDragStartOffset.x = poiDragOffset.value.x
  poiDragStartOffset.y = poiDragOffset.value.y

  window.addEventListener('mousemove', handlePoiDragMove)
  window.addEventListener('mouseup', handlePoiDragEnd)
}

function handlePoiDragMove(event) {
  if (!isDraggingPoi.value) return
  const dx = event.clientX - poiDragStartMouse.x
  const dy = event.clientY - poiDragStartMouse.y
  poiDragOffset.value = {
    x: poiDragStartOffset.x + dx,
    y: poiDragStartOffset.y + dy
  }
}

function handlePoiDragEnd() {
  isDraggingPoi.value = false
  window.removeEventListener('mousemove', handlePoiDragMove)
  window.removeEventListener('mouseup', handlePoiDragEnd)
}

function onReset() {
  if (!timeController) return
  isSimulating.value = false
  timeController.resetTime()

  if (systemConsole.value) {
    systemConsole.value.resetSpeedVisuals()
    systemConsole.value.closeSpeed()
  }
}

function openStellarModal() {
  if (timeController) {
    captureDate.value = timeController.getSimulationDate()
    timeController.freeze() // Freeze time when choosing a moment
  }
  if (interactions) interactions.setEnabled(false) // Disable background interaction
  showStellarModal.value = true
}

function closeStellarModal() {
  showStellarModal.value = false
  capturedImage.value = ''
  if (timeController) {
    timeController.resetTime() // Jump back to real current time and set speed to 1x
    timeController.unfreeze()  // Resume motion
  }
  isSimulating.value = false // Hide sim time HUD as we are back to real-time
  if (interactions) interactions.setEnabled(true) // Re-enable interaction
}

function onStellarPreview(date) {
  if (timeController) {
    timeController.setDate(date)
    // isSimulating.value = true // REMOVED: Don't show sim time HUD for snapshot preview
    captureDate.value = date
  }
}

async function onStellarCapture(date) {
  if (!engine) return
  isCapturing.value = true

  // Ensure scene is aligned to the capture date if provided
  if (date instanceof Date && timeController) {
    timeController.setDate(date)
    captureDate.value = date
  }

  // Wait a frame to let UI update (show 'Capturing...') and scene update
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => setTimeout(r, 100)) // slight buffer for heavy scenes

  const uiElements = document.querySelectorAll('.hud, .language-panel, .tour-panel, .planet-nav-panel, .system-console, .stellar-modal-overlay')
  
  const aesthetic = new AestheticSnapshotManager(engine.scene, engine.camera, solar.planetObjects)

  try {
    // 1. Hide UI
    uiElements.forEach(el => el.style.visibility = 'hidden')

    // 2. Apply Aesthetic Transformation
    aesthetic.apply(date)
    
    // Update orbit resolution for 4K (for any Line2 if present, though we used Line for aesthetic)
    updateOrbitResolution(3840, 2160)
    
    // 3. Capture
    const dataUrl = await captureHighRes(
      engine.renderer,
      engine.scene,
      engine.camera,
      3840,
      2160
    )
    
    if (dataUrl) {
      capturedImage.value = dataUrl
    }
  } catch (e) {
    console.error('Capture failed', e)
  } finally {
    // Restore scene state
    aesthetic.restore()
    aesthetic.dispose()
    // Restore orbit resolution to screen size
    updateOrbitResolution(window.innerWidth, window.innerHeight)
    // Restore UI
    uiElements.forEach(el => el.style.visibility = '')
    isCapturing.value = false
  }
}

function onStellarDownload(imgData) {
  const targetImage = (typeof imgData === 'string' && imgData.startsWith('data:')) ? imgData : capturedImage.value
  
  if (targetImage) {
    // If it's the raw capture, used date-based name. If it's processed, maybe add suffix? 
    // For now simple keep same name or add 'poster' if different?
    // Let's keep it simple.
    downloadImage(targetImage, `stellar-moment-${captureDate.value.toISOString().slice(0,10)}.png`)
  }
}

function onStellarDiscard() {
  capturedImage.value = ''
}

onMounted(async () => {
  const startTime = Date.now()
  clockTimer = startClock()

  engine = createEngine(container.value)

  // Sync initial loader text with localized version
  const loaderTextEl = document.getElementById('initial-loader-text')
  const loaderSubtextEl = document.getElementById('initial-loader-subtext')
  const loaderBarEl = document.getElementById('initial-loader-bar')
  if (loaderTextEl) {
    loaderTextEl.innerText = t('loading.preparing') || 'Mission Control: Preparing Spacecraft...'
  }

  let actualProgress = 0
  let displayedProgress = 0
  const minDelay = 2500
  let loadingComplete = false

  const updateLoaderUI = () => {
    // Calculate time-based progress (0 to 100 over 2.5s)
    const elapsed = Date.now() - startTime
    const timeProgress = Math.min((elapsed / minDelay) * 100, 100)

    // The displayed progress is the minimum of actual assets loaded and the time-based floor
    // BUT we also want it to look smooth, so we lerp towards the target
    const targetProgress = loadingComplete ? 100 : Math.min(actualProgress, timeProgress)

    if (displayedProgress < targetProgress) {
      displayedProgress += (targetProgress - displayedProgress) * 0.1
      if (targetProgress - displayedProgress < 0.1) displayedProgress = targetProgress
    }

    const rounded = Math.round(displayedProgress)
    if (loaderSubtextEl) loaderSubtextEl.innerText = `${rounded}%`
    if (loaderBarEl) loaderBarEl.style.width = `${rounded}%`

    if (displayedProgress < 100 || !loadingComplete || (Date.now() - startTime < minDelay)) {
      requestAnimationFrame(updateLoaderUI)
    } else {
      // Finalizing
      const initialLoader = document.getElementById('initial-loader')
      if (initialLoader) {
        initialLoader.style.opacity = '0'
        setTimeout(() => {
          initialLoader.remove()
          // Start fly-in only after loader is fully gone
          startFlyInAnimation()
        }, 1000)
      }
    }
  }
  requestAnimationFrame(updateLoaderUI)

  solar = await createSolarSystem(engine.scene, t('zodiac_names'), (progress) => {
    actualProgress = progress
    loadingProgress.value = Math.round(progress)
  })

  loadingComplete = true

  const startFlyInAnimation = () => {
    if (engine && engine.camera && engine.controls) {
      const targetPos = new THREE.Vector3(0, 500, 1500)
      const duration = 4000 // Slower, more immersive (from 2s to 4s)
      const startPos = engine.camera.position.clone()
      const startTimeAnim = Date.now()

      // Disable controls during animation
      engine.controls.enabled = false

      const animateCamera = () => {
        const now = Date.now()
        const progress = Math.min((now - startTimeAnim) / duration, 1)

        // Smooth easing (Cubic Out)
        const ease = 1 - Math.pow(1 - progress, 3)

        engine.camera.position.lerpVectors(startPos, targetPos, ease)
        engine.controls.target.set(0, 0, 0) // Ensure looking at sun

        if (progress < 1) {
          requestAnimationFrame(animateCamera)
        } else {
          // Re-enable controls when finished
          engine.controls.enabled = true
        }
      }
      animateCamera()
    }
  }

  isLoading.value = false

  // Pre-cache planets that have POIs to avoid Object.entries() in the render loop
  planetsWithPOIs = Object.entries(solar.planetObjects)
    .filter(([name, mesh]) => mesh.userData.pois)
    .map(([name, mesh]) => ({ name, mesh }));

  // pass the sun mesh as an extra rotating object so it spins with real speed
  timeController = createTimeController(
    solar.planetObjects,
    solar.orbitScale,
    [solar.sun, solar.moon], // Moon also rotates
    solar.moon,
    solar.moonOrbit,
    solar.MOON_ORBIT_RADIUS
  )

  interactions = createInteractions({
    engine,
    planets: [...solar.planets, solar.moon],
    planetNames,
    timeController,
    onHoverNameChange: name => {
      hoveredPlanetName.value = name
    },
    onSelectionChange: name => {
      // keep nav panel selection in sync; empty string -> clear selection
      selectedPlanetId.value = name || null
      if (!name) selectedPOI.value = null
    },
    onPOISelect: poi => {
      if (selectedPOI.value?.poiId !== poi?.poiId) {
        poiDragOffset.value = { x: 0, y: 0 }

        // Determine initial side
        if (poi && engine) {
          poi.dot.getWorldPosition(_poiWorldPos);
          _tempV.copy(_poiWorldPos).project(engine.camera);
          const x = (_tempV.x * 0.5 + 0.5) * window.innerWidth;
          const half = window.innerWidth / 2;

          if (x < half - 100) poiUI.initialSide = 'left';
          else if (x > half + 100) poiUI.initialSide = 'right';
          else poiUI.initialSide = Math.random() > 0.5 ? 'left' : 'right';
        }
      }
      selectedPOI.value = poi
    }
  })

  let frameCount = 0
  engine.start(delta => {
    if (viewMode.value === 'solar') {
      if (timeController) timeController.update(delta)
      if (interactions) interactions.update(delta)

      // Update POI UI if one is selected
      if (selectedPOI.value && engine && solar) {
        const poi = selectedPOI.value;
        const planetMesh = solar.planetObjects[poi.planetName] || (poi.planetName === 'moon' ? solar.moon : null);

        if (planetMesh && poi.dot) {
          poi.dot.getWorldPosition(_poiWorldPos);
          // Optimization: Reuse mesh.position as world position since planets are direct children of the scene
          _planetWorldPos.copy(planetMesh.position);

          // Occlusion check
          _normal.copy(_poiWorldPos).sub(_planetWorldPos).normalize();
          _viewDir.copy(engine.camera.position).sub(_poiWorldPos).normalize();
          const isFacing = _normal.dot(_viewDir) > 0.05;

          if (isFacing) {
            _tempV.copy(_poiWorldPos).project(engine.camera);
            const x = (_tempV.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(_tempV.y * 0.5) + 0.5) * window.innerHeight;

            // Performance Boost: Only update reactive UI state if position moved significantly (>0.1px)
            // This eliminates hundreds of redundant SVG path recalculations and Vue reactivity triggers
            // per second during slow movements or when the camera is nearly stationary.
            if (Math.abs(x - _lastPoiX) > 0.1 || Math.abs(y - _lastPoiY) > 0.1 || poiUI.id !== poi.poiId) {
              _lastPoiX = x;
              _lastPoiY = y;
              poiUI.id = poi.poiId;

              _tempV.copy(_planetWorldPos).project(engine.camera);
              const px = (_tempV.x * 0.5 + 0.5) * window.innerWidth;

              // Side logic: panel is either to the left or right of the POI
              const side = poiUI.initialSide;
              const panelWidth = 280;
              const marginX = 100;
              const marginY = -120; // Default height offset

              // Current Panel position
              let panelX = (side === 'left') ? (x - panelWidth - marginX) : (x + marginX);
              let panelY = y + marginY;

              // Apply drag offset
              panelX += poiDragOffset.value.x;
              panelY += poiDragOffset.value.y;

              // Flip side if dragged across the POI
              const currentSide = (panelX + panelWidth / 2 < x) ? 'left' : 'right';

              // Optimized: Update reactive properties directly to eliminate per-frame object allocations
              poiUI.visible = true;
              poiUI.x = x;
              poiUI.y = y;
              poiUI.side = currentSide;
              poiUI.panelX = panelX;
              poiUI.panelY = panelY;

              // 3-Point Path: POI -> Near Top Corner -> Far Top Corner
              // Optimized: Inline coordinate math in the template string to avoid p1/p2/p3 object creation
              if (currentSide === 'left') {
                poiUI.linePath = `M ${x} ${y} L ${panelX + panelWidth} ${panelY} L ${panelX} ${panelY}`;
              } else {
                poiUI.linePath = `M ${x} ${y} L ${panelX} ${panelY} L ${panelX + panelWidth} ${panelY}`;
              }
            }
          } else {
            poiUI.visible = false;
          }
        }
      } else {
        poiUI.visible = false;
      }

      // Update POIs visibility and labels
      if (planetsWithPOIs.length > 0) {
        for (let i = 0; i < planetsWithPOIs.length; i++) {
          const p = planetsWithPOIs[i];
          updatePOIs(p.mesh.userData.pois, engine.camera, p.mesh.position, p.name);
        }
      }
    } else if (viewMode.value === 'mars' && marsSurface) {
      marsSurface.update(delta)
      const pPos = marsSurface.camera.position
      // Optimization: Mutate reactive properties directly
      marsPlayerPos.x = pPos.x
      marsPlayerPos.y = pPos.y
      marsPlayerPos.z = pPos.z
      marsPlayerYaw.value = marsSurface.camera.rotation.y
      const currentPath = marsSurface.getExplorationPath();
      // Optimization: Avoid shallow copy spread; MarsHUD handles the array
      if (currentPath.length !== marsPath.value.length) {
        marsPath.value = currentPath;
      }

      const lPos = marsSurface.getLanderPosition()
      if (lPos) {
        marsLanderPos.value = { x: lPos.x, y: lPos.y, z: lPos.z }
      }
    }

    // Update simulation time display from controller
    // Throttle: update only every 30 frames to avoid toLocaleString perf hit
    frameCount++
    const d = timeController?.getSimulationD() || 0
    const hasTimeMoved = Math.abs(d - lastSimD) > 1e-8
    lastSimD = d

    if (frameCount % 30 === 0 && timeController) {
      try {
        const simDate = timeController.getSimulationDate()
        const newSimTime = simDate.toLocaleString()
        // Optimization: Throttled reactivity trigger
        if (simulationTime.value !== newSimTime) {
          simulationTime.value = newSimTime
        }
      } catch (e) {
        console.warn('Error updating simulation time', e)
      }
    }

    if (showZodiac.value && solar?.aspectsManager && timeController) {
      _isAuraVisible = true
      // Performance Optimization: Decouple heavy calculations from visual updates.
      // Calculations run at ~12fps to save CPU, while visuals run at 60fps for smoothness.
      if (frameCount % 5 === 0 && hasTimeMoved) {
        const chart = AstrologyService.calculateGeocentricChart(d, solar.planetObjects, currentChart.value)
        const aspects = AstrologyService.calculateAspects(chart)
        const vibe = AstrologyService.calculateElementBalance(chart, elementBalance.value)

        dominantElement.value = vibe.dominant

        // Update values used by both UI and 3D visual managers
        currentChart.value = { ...chart }
        elementBalance.value = { ...vibe.balance }
        activeAspects.value = aspects
      }

      // Visual updates (aura pulsing and line synchronization) run every frame (60fps)
      // for perfect synchronization with planet movement and camera rotation.
      solar.aspectsManager.update(activeAspects.value)
      solar.auraManager.update(currentChart.value, dominantElement.value, showZodiac.value)
    } else if (solar?.auraManager && _isAuraVisible) {
      // Ensure visual state is cleaned up immediately when toggled off, but only once.
      solar.auraManager.hideAll()
      _isAuraVisible = false
    }
  })
  window.addEventListener('resize', () => {
    updateOrbitResolution(window.innerWidth, window.innerHeight)
  })

  // Watch for language changes to update Zodiac names and POI labels
  watch(currentLang, () => {
    if (solar) {
      if (solar.zodiacRing) {
        solar.zodiacRing.updateLabels(t('zodiac_names'))
      }
      // Refresh POI labels for all relevant planets
      if (planetsWithPOIs.length > 0) {
        planetsWithPOIs.forEach(({ mesh }) => {
          if (mesh.userData.pois) {
            refreshPOILabels(mesh.userData.pois)
          }
        })
      }
    }
  })

  // Watch for selection or grid toggle changes
  watch([selectedPlanetId, showGrid], () => {
    updateGridsVisibility()
  })
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handlePoiDragMove)
  window.removeEventListener('mouseup', handlePoiDragEnd)
  clearInterval(clockTimer)
  interactions?.dispose()
  engine?.dispose()
  if (marsSurface) {
    window.removeEventListener('keydown', marsSurface.onKeyDown)
    window.removeEventListener('keyup', marsSurface.onKeyUp)
    window.removeEventListener('mousemove', marsSurface.onMouseMove)
    marsSurface.dispose()
  }
})
</script>

<style scoped>
.solar-system-root {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.three-container {
  width: 100%;
  height: 100%;
}

.hud {
  position: absolute;
  top: 16px;
  left: 16px;
  color: #fff;
  pointer-events: none;
  font-family: system-ui, sans-serif;
  z-index: 1000;
}

.time-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.time-real, .time-sim {
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-real {
  opacity: 0.7;
}

.time-sim {
  font-size: 15px;
  color: var(--glow-color);
  font-weight: 600;
}

.top-center-actions {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
  z-index: 1000;
}

.top-actions-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.6;
}


/* 保留 hover-name 样式 */
.hover-name {
  margin-top: 6px;
  font-size: 20px;
  font-weight: 600;
}

.stellar-btn {
  pointer-events: auto;
  padding: 8px 16px;
  font-size: 13px;
  text-transform: none;
  letter-spacing: normal;
  font-weight: 600;
  color: #fff;
  background: rgba(180, 150, 100, 0.2);
  border: 1px solid rgba(255, 200, 100, 0.25);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
}

.stellar-btn:hover {
  background: rgba(50, 60, 110, 0.9);
  transform: translateY(-2px);
  border-color: rgba(100, 180, 255, 0.6);
  box-shadow: 0 6px 20px rgba(0, 100, 255, 0.3);
}

.stellar-btn:active {
  transform: translateY(1px);
}

/* Cloud Overlay */
.cloud-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #8a4b38; /* Dusty Mars atmosphere color */
  opacity: 0;
  pointer-events: none;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 2s ease-in-out;
}

.cloud-overlay.fade-in {
  opacity: 1;
  pointer-events: auto;
}

.cloud-content {
  text-align: center;
}

.entry-text {
  color: #fff;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 4px;
  text-shadow: 0 0 20px rgba(0,0,0,0.5);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

/* Mars Surface UI */
.mars-ui {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  z-index: 1000;
  pointer-events: none;
}

.return-btn {
  pointer-events: auto;
  padding: 12px 24px;
  background: rgba(30, 30, 40, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 30px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.3s;
}

.return-btn:hover {
  background: rgba(60, 60, 80, 0.9);
  transform: translateY(-2px);
  border-color: #fff;
}

/* POI Overlay Styles */
.poi-svg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1001;
}

.poi-line {
  fill: none;
  stroke: var(--glow-color);
  stroke-width: 2;
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: grow-line 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  filter: drop-shadow(0 0 5px rgba(var(--glow-rgb), 0.8));
}

@keyframes grow-line {
  to { stroke-dashoffset: 0; }
}

.poi-panel-wrapper {
  pointer-events: none;
}


</style>
