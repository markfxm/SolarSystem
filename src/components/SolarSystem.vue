<template>
  <div class="solar-system-root">
    <div ref="container" class="three-container"></div>

    <!-- HUD -->
    <div class="hud">
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
        @click="interactions?.goHome()"
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

      <div v-if="hoveredPlanetName" class="hover-name">
        {{ hoveredPlanetName }}
      </div>
    </div>

    <!-- Top Center Actions -->
    <div class="top-center-actions">
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
      v-if="selectedPlanetId"
      :planetName="selectedPlanetId"
      @close="onPanelClose"
    />

    <!-- Navigation Panel -->
    <PlanetNavigationPanel
      :selectedBody="selectedPlanetId"
      @select="onPlanetSelected"
    />

    <TimeControlPanel
      ref="timePanel"
      @speed-change="onSpeedChange"
      @reset="onReset"
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

import { t, currentLang } from '../utils/i18n.js'
import { captureHighRes, downloadImage } from '../utils/ScreenshotEngine.js'

import { createEngine } from '../three/engine.js'
import { createSolarSystem } from '../three/createSolarSystem.js'
import { createTimeController } from '../three/timeController.js'
import { createInteractions } from '../three/interactions.js'
import { AestheticSnapshotManager } from '../utils/AestheticSnapshot.js'

const container = shallowRef(null)
const timePanel = ref(null)

const hoveredPlanetName = ref('')
const selectedPlanetId = ref(null)
const currentTime = ref('')
const simulationTime = ref('')
const isSimulating = ref(false)
const showStellarModal = ref(false)
const isCapturing = ref(false)
const captureDate = ref(new Date())
const capturedImage = ref('')
const showZodiac = ref(false)

let engine
let solar
let timeController
let sunController
let interactions
let clockTimer

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
}

function onPanelClose() {
  // interactions?.goHome()
  selectedPlanetId.value = null
}

function toggleZodiac() {
  showZodiac.value = !showZodiac.value
  if (solar && solar.zodiacRing) {
    solar.zodiacRing.visible = showZodiac.value
  }
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
    if (obj.userData?.isOrbit && obj.material?.resolution) {
      obj.material.resolution.set(w, h)
    }
  })
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

  solar = await createSolarSystem(engine.scene, t('zodiac_names'))

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
    }
  })

  let frameCount = 0
  engine.start(delta => {
    if (timeController) timeController.update(delta)
    if (interactions) interactions.update(delta)

    // Update simulation time display from controller
    // Throttle: update only every 10 frames to avoid toLocaleString perf hit
    frameCount++
    if (frameCount % 10 === 0 && timeController) {
      try {
        const simDate = timeController.getSimulationDate()
        simulationTime.value = simDate.toLocaleString()
      } catch (e) {
        console.warn('Error updating simulation time', e)
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
})

onUnmounted(() => {
  clearInterval(clockTimer)
  interactions?.dispose()
  engine?.dispose()
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
</style>
