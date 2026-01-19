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

      <div v-if="hoveredPlanetName" class="hover-name">
        {{ hoveredPlanetName }}
      </div>
    </div>

    <!-- Language Panel -->
    <LanguagePanel />

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
import { ref, shallowRef, onMounted, onUnmounted, computed } from 'vue'

import PlanetNavigationPanel from './PlanetNavigationPanel.vue'
import TimeControlPanel from './TimeControlPanel.vue'
import LanguagePanel from './LanguagePanel.vue'
import TourPanel from './TourPanel.vue'

import { t, currentLang } from '../utils/i18n.js'

import { createEngine } from '../three/engine.js'
import { createSolarSystem } from '../three/createSolarSystem.js'
import { createTimeController } from '../three/timeController.js'
import { createInteractions } from '../three/interactions.js'

const container = shallowRef(null)
const timePanel = ref(null)

const hoveredPlanetName = ref('')
const selectedPlanetId = ref(null)
const currentTime = ref('')
const simulationTime = ref('')
const isSimulating = ref(false)

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
  neptune: t('planet.neptune')
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

function onSpeedChange(mult) {
  if (!timeController) return
  if (mult === 1) {
    isSimulating.value = true
    timeController.setRealTime()
  } else {
    isSimulating.value = true
    timeController.setFastSpeed(mult)
  }
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

onMounted(async () => {
  clockTimer = startClock()

  engine = createEngine(container.value)

  solar = await createSolarSystem(engine.scene)

  // pass the sun mesh as an extra rotating object so it spins with real speed
  timeController = createTimeController(
    solar.planetObjects,
    solar.orbitScale,
    [solar.sun]
  )

  interactions = createInteractions({
    engine,
    planets: solar.planets,
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

/* 保留 hover-name 样式 */
.hover-name {
  margin-top: 6px;
  font-size: 20px;
  font-weight: 600;
}
</style>
