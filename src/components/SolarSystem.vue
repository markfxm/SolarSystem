<template>
  <div class="solar-system-root">
    <div ref="container" class="three-container"></div>

    <!-- HUD -->
    <div class="hud">
      <div class="time">{{ currentTime }}</div>
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

    <!-- Navigation Panel -->
    <PlanetNavigationPanel
      :selectedBody="selectedPlanetId"
      @select="onPlanetSelected"
    />

    <TimeControlPanel
      @speed-change="onSpeedChange"
    />

  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, onUnmounted, computed } from 'vue'

import PlanetNavigationPanel from './PlanetNavigationPanel.vue'
import TimeControlPanel from './TimeControlPanel.vue'
import LanguagePanel from './LanguagePanel.vue'

import { t, currentLang } from '../utils/i18n.js'

import { createEngine } from '../three/engine.js'
import { createSolarSystem } from '../three/createSolarSystem.js'
import { createTimeController } from '../three/timeController.js'
import { createSunController } from '../three/sunController.js'
import { createInteractions } from '../three/interactions.js'

const container = shallowRef(null)

const hoveredPlanetName = ref('')
const selectedPlanetId = ref(null)
const currentTime = ref('')

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

function onSpeedChange(mult) {
  if (!timeController) return
  if (mult === 1) {
    timeController.setRealTime()
  } else {
    timeController.setFastSpeed(mult)
  }
}

onMounted(async () => {
  clockTimer = startClock()

  engine = createEngine(container.value)

  solar = await createSolarSystem(engine.scene)

  timeController = createTimeController(
    solar.planetObjects,
    solar.orbitScale
  )

  sunController = createSunController(solar.planets)

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

  engine.start(delta => {
    timeController.update(delta)
    sunController.update()
    interactions.update(delta) // <-- pass delta here
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

.time {
  font-size: 14px;
  opacity: 0.85;
  pointer-events: none;
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
