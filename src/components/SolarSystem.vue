<template>
  <div class="solar-system-root">
    <div ref="container" class="three-container"></div>

    <!-- HUD -->
    <div class="hud">
      <div class="time">{{ currentTime }}</div>
      <div v-if="hoveredPlanetName" class="hover-name">
        {{ hoveredPlanetName }}
      </div>
    </div>

    <!-- Navigation Panel -->
    <PlanetNavigationPanel
      :selectedBody="selectedPlanetId"
      @select="onPlanetSelected"
    />

    <TimeControlPanel
      @real-time="timeController.setRealTime()"
      @fast-time="timeController.setFastSpeed()"
      @home="interactions.goHome()"
    />

  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, onUnmounted } from 'vue'

import PlanetNavigationPanel from './PlanetNavigationPanel.vue'
import TimeControlPanel from './TimeControlPanel.vue'

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

const planetNames = {
  sun: 'Sun',
  mercury: 'Mercury',
  venus: 'Venus',
  earth: 'Earth',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune'
}

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
  pointer-events: none;
  font-family: system-ui, sans-serif;
}

.time {
  font-size: 14px;
  opacity: 0.85;
}

.hover-name {
  margin-top: 6px;
  font-size: 20px;
  font-weight: 600;
}
</style>
