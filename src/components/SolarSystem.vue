<template>
  <div class="solar-system-root">
    <div ref="container" class="three-container"></div>

    <!-- Loading Screen -->
    <div v-if="isLoading" class="loading-screen">
      <div class="loader-content">
        <div class="loader-spinner"></div>
        <div class="loader-text">{{ t('loading.preparing') || 'Mission Control: Preparing Spacecraft...' }}</div>
        <div class="loader-subtext">{{ loadingProgress }}%</div>
      </div>
    </div>

    <!-- HUD -->
    <div v-if="viewMode === 'solar'" class="hud">
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
      <button
        class="home-btn"
        @click="onHomeClick"
      >
        {{ t('control.home') }}
      </button>

      <button
        class="zodiac-toggle-btn"
        :class="{ active: showZodiac }"
        @click="toggleZodiac"
      >
        {{ t('control.zodiac') }}
      </button>

      <button
        v-if="selectedPlanetId"
        class="grid-toggle-btn"
        :class="{ active: showGrid }"
        @click="toggleGrid"
      >
        {{ t('control.grid') }}
      </button>

      <div v-if="hoveredPlanetName" class="hover-name">
        {{ hoveredPlanetName }}
      </div>
    </div>

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
    <div v-if="viewMode === 'solar'" class="top-center-actions">
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
      v-if="viewMode === 'solar'"
      :selectedBody="selectedPlanetId"
      @select="onPlanetSelected"
      @info="onShowInfo"
    />

    <TimeControlPanel
      v-if="viewMode === 'solar'"
      ref="timePanel"
      @speed-change="onSpeedChange"
      @reset="onReset"
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

  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, onUnmounted, computed, watch } from 'vue'

import PlanetNavigationPanel from './PlanetNavigationPanel.vue'
import TimeControlPanel from './TimeControlPanel.vue'
import LanguagePanel from './LanguagePanel.vue'
import TourPanel from './TourPanel.vue'
import StellarMomentModal from './StellarMomentModal.vue'
import TransitPanel from './TransitPanel.vue'
import MarsHUD from '../planets/Mars/MarsHUD.vue'
import POIPanel from './POIPanel.vue'

import { t, currentLang } from '../utils/i18n.js'
import { captureHighRes, downloadImage } from '../utils/ScreenshotEngine.js'
import * as THREE from 'three'

import { createEngine } from '../three/engine.js'
import { createSolarSystem } from '../three/createSolarSystem.js'
import { createTimeController } from '../three/timeController.js'
import { createInteractions } from '../three/interactions.js'
import { createMarsSurface } from '../planets/Mars/MarsSurface.js'
import { updatePOIs } from '../utils/POI.js'
import { AestheticSnapshotManager } from '../utils/AestheticSnapshot.js'
import { AstrologyService } from '../utils/AstrologyService.js'

const container = shallowRef(null)
const timePanel = ref(null)

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
const currentChart = ref({})
const activeAspects = ref([])
const elementBalance = ref({ fire: 0, earth: 0, air: 0, water: 0 })
const dominantElement = ref('none')
const showGrid = ref(false)
const selectedPOI = ref(null)
const poiDragOffset = ref({ x: 0, y: 0 })
const isDraggingPoi = ref(false)
const poiDragStartMouse = { x: 0, y: 0 }
const poiDragStartOffset = { x: 0, y: 0 }

const poiUI = ref({
  visible: false,
  x: 0,
  y: 0,
  side: 'right',
  linePath: '',
  panelX: 0,
  panelY: 0,
  initialSide: 'right'
})
const marsPlayerPos = ref({ x: 0, z: 0 })
const marsPlayerYaw = ref(0)
const marsPath = ref([])
const marsLanderPos = ref({ x: 0, z: -10 })

const poiPanelStyle = computed(() => {
  return {
    position: 'absolute',
    left: `${poiUI.value.panelX}px`,
    top: `${poiUI.value.panelY}px`,
    zIndex: 1002,
    pointerEvents: 'none'
  };
});

const viewMode = ref('solar') // 'solar' | 'mars'
const showCloudOverlay = ref(false)
const cloudFadeIn = ref(false)
const enteringText = ref('')

let engine
let solar
let timeController
let sunController
let interactions
let marsSurface
let clockTimer
let planetsWithPOIs = []

// Scratch variables for POI projection to minimize GC
const _poiWorldPos = new THREE.Vector3()
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

  enteringText.value = t('mars.entering')
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
  // Force reset the slider component if needed? 
  // Ideally TimeControlPanel should update itself if we pass props back, 
  // but for now the panel emits speed-change when slider moves, so reset logic might need to be two-way.
  // Actually, timeController.resetTime() resets internal state.
  // The panel slider position also needs to be reset visually.
  const panelRef = timePanel.value
  if (panelRef && panelRef.resetVisuals) {
    panelRef.resetVisuals()
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

  const uiElements = document.querySelectorAll('.hud, .language-panel, .tour-panel, .planet-nav-panel, .time-control-panel, .stellar-modal-overlay')
  
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
  clockTimer = startClock()

  engine = createEngine(container.value)

  solar = await createSolarSystem(engine.scene, t('zodiac_names'), (progress) => {
    loadingProgress.value = Math.round(progress)
  })
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

          if (x < half - 100) poiUI.value.initialSide = 'left';
          else if (x > half + 100) poiUI.value.initialSide = 'right';
          else poiUI.value.initialSide = Math.random() > 0.5 ? 'left' : 'right';
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
          planetMesh.getWorldPosition(_planetWorldPos);

          // Occlusion check
          _normal.copy(_poiWorldPos).sub(_planetWorldPos).normalize();
          _viewDir.copy(engine.camera.position).sub(_poiWorldPos).normalize();
          const isFacing = _normal.dot(_viewDir) > 0.05;

          if (isFacing) {
            _tempV.copy(_poiWorldPos).project(engine.camera);
            const x = (_tempV.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(_tempV.y * 0.5) + 0.5) * window.innerHeight;

            _tempV.copy(_planetWorldPos).project(engine.camera);
            const px = (_tempV.x * 0.5 + 0.5) * window.innerWidth;

            // Side logic: panel is either to the left or right of the POI
            const side = poiUI.value.initialSide;
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

            // 3-Point Path: POI -> Near Top Corner -> Far Top Corner
            let p1 = { x, y };
            let p2, p3;

            if (currentSide === 'left') {
              p2 = { x: panelX + panelWidth, y: panelY };
              p3 = { x: panelX, y: panelY };
            } else {
              p2 = { x: panelX, y: panelY };
              p3 = { x: panelX + panelWidth, y: panelY };
            }

            poiUI.value = {
              ...poiUI.value,
              visible: true,
              x, y,
              side: currentSide,
              linePath: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`,
              panelX,
              panelY
            };
          } else {
            poiUI.value.visible = false;
          }
        }
      } else {
        poiUI.value.visible = false;
      }

      // Update POIs visibility and labels
      if (planetsWithPOIs.length > 0) {
        planetsWithPOIs.forEach(({ name, mesh }) => {
          updatePOIs(mesh.userData.pois, engine.camera, mesh.position, name)
        })
      }
    } else if (viewMode.value === 'mars' && marsSurface) {
      marsSurface.update(delta)
      const pPos = marsSurface.camera.position
      marsPlayerPos.value = { x: pPos.x, y: pPos.y, z: pPos.z }
      marsPlayerYaw.value = marsSurface.camera.rotation.y
      const currentPath = marsSurface.getExplorationPath();
      if (currentPath.length !== marsPath.value.length) {
        marsPath.value = [...currentPath];
      }

      const lPos = marsSurface.getLanderPosition()
      if (lPos) {
        marsLanderPos.value = { x: lPos.x, y: lPos.y, z: lPos.z }
      }
    }

    // Update simulation time display from controller
    // Throttle: update only every 30 frames to avoid toLocaleString perf hit
    frameCount++
    if (frameCount % 30 === 0 && timeController) {
      try {
        const simDate = timeController.getSimulationDate()
        simulationTime.value = simDate.toLocaleString()
      } catch (e) {
        console.warn('Error updating simulation time', e)
      }
    }

    if (showZodiac.value && solar?.aspectsManager && timeController) {
      // Throttle heavy astrological calculations to ~10-12fps to save CPU
      // Pulse animations in auraManager still look okay at this rate,
      // but the calculation overhead is significantly reduced.
      if (frameCount % 5 === 0) {
        const date = timeController.getSimulationDate()
        const chart = AstrologyService.calculateGeocentricChart(date)
        const aspects = AstrologyService.calculateAspects(chart)
        const vibe = AstrologyService.calculateElementBalance(chart)

        currentChart.value = chart
        activeAspects.value = aspects
        elementBalance.value = vibe.balance
        dominantElement.value = vibe.dominant

        solar.aspectsManager.update(aspects)
        solar.auraManager.update(chart, vibe.dominant, showZodiac.value)
      }
    } else if (solar?.auraManager) {
      // Only call hideAll if it was previously visible (throttle/guard redundant calls)
      if (frameCount % 60 === 0) {
        solar.auraManager.hideAll()
      }
    }
  })
  window.addEventListener('resize', () => {
    updateOrbitResolution(window.innerWidth, window.innerHeight)
  })

  // Watch for language changes to update Zodiac names
  watch(currentLang, () => {
    if (solar && solar.zodiacRing) {
      solar.zodiacRing.updateLabels(t('zodiac_names'))
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
  pointer-events: none; /* 保持父层不可点，子元素可覆盖 */
  font-family: system-ui, sans-serif;

  display: flex;
  flex-direction: column;
  align-items: flex-start; /* 左对齐 */
  gap: 8px;
  z-index: 1000; /* Ensure on top of PlanetSurface overlay */
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
  color: #88ccff;
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

/* Home 按钮左对齐并可点击 */
.home-btn {
  margin-top: 0;
  align-self: flex-start; /* 确保左对齐 */
  pointer-events: auto; /* 允许点击 */
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: rgba(30,30,40,0.9);
  border: 1px solid rgba(120,160,255,0.35);
  border-radius: 10px;
  cursor: pointer;
  transition: background .18s ease, transform .18s ease;
}
.home-btn:hover {
  background: rgba(60,100,220,0.9);
  transform: translateY(-2px);
}

.zodiac-toggle-btn {
  margin-top: 0;
  align-self: flex-start;
  pointer-events: auto;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: rgba(30,30,40,0.9);
  border: 1px solid rgba(212,170,255,0.35);
  border-radius: 10px;
  cursor: pointer;
  transition: all .18s ease;
}

.zodiac-toggle-btn.active {
  background: rgba(212,170,255,0.25);
  border-color: rgba(212,170,255,0.8);
  box-shadow: 0 0 15px rgba(212,170,255,0.3);
}

.zodiac-toggle-btn:hover {
  background: rgba(212,170,255,0.4);
  transform: translateY(-2px);
}

.grid-toggle-btn {
  margin-top: 0;
  align-self: flex-start;
  pointer-events: auto;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: rgba(30,30,40,0.9);
  border: 1px solid rgba(150,255,200,0.35);
  border-radius: 10px;
  cursor: pointer;
  transition: all .18s ease;
}

.grid-toggle-btn.active {
  background: rgba(150,255,200,0.25);
  border-color: rgba(150,255,200,0.8);
  box-shadow: 0 0 15px rgba(150,255,200,0.3);
}

.grid-toggle-btn:hover {
  background: rgba(150,255,200,0.4);
  transform: translateY(-2px);
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

/* Loading Screen */
.loading-screen {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, #0a0a1a 0%, #000000 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loader-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.loader-spinner {
  width: 60px;
  height: 60px;
  border: 3px solid rgba(100, 180, 255, 0.1);
  border-top: 3px solid #64b4ff;
  border-radius: 50%;
  animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  box-shadow: 0 0 20px rgba(100, 180, 255, 0.2);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loader-text {
  color: #fff;
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-shadow: 0 0 10px rgba(100, 180, 255, 0.5);
}

.loader-subtext {
  color: #64b4ff;
  font-size: 14px;
  font-family: monospace;
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
  stroke: #00A3FF;
  stroke-width: 2;
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: grow-line 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  filter: drop-shadow(0 0 5px rgba(0, 163, 255, 0.8));
}

@keyframes grow-line {
  to { stroke-dashoffset: 0; }
}

.poi-panel-wrapper {
  pointer-events: none;
}

</style>
