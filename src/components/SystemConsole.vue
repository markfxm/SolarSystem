<template>
  <div class="system-console" :style="{ top: positionTop }">
    <div class="button-stack">
      <!-- Always visible Home button -->
      <button class="console-btn home-btn" @click="$emit('home')">
        {{ t('control.home') }}
      </button>

      <!-- Menu toggle button -->
      <button
        class="console-btn menu-btn"
        :class="{ active: isMenuOpen }"
        @click="toggleMenu"
      >
        {{ t('control.menu') }}
        <span class="arrow" :class="{ open: isMenuOpen }">▶</span>
      </button>
    </div>

    <!-- Expanded Menu -->
    <Transition name="slide-fade">
      <div v-if="isMenuOpen" class="expanded-menu">
        <button
          class="menu-item"
          :class="{ active: showZodiac }"
          @click="$emit('toggle-zodiac')"
        >
          {{ t('control.zodiac') }}
        </button>

        <button
          v-if="hasSelectedPlanet"
          class="menu-item"
          :class="{ active: showGrid }"
          @click="$emit('toggle-grid')"
        >
          {{ t('control.grid') }}
        </button>

        <button
          class="menu-item"
          :class="{ active: showHolo }"
          @click="$emit('toggle-holo')"
        >
          {{ t('control.holographic') }}
        </button>

        <button
          class="menu-item speed-trigger"
          :class="{ active: isSpeedOpen }"
          @click="toggleSpeed"
        >
          {{ t('control.speed') }}
          <span class="arrow" :class="{ open: isSpeedOpen }">▶</span>
        </button>
      </div>
    </Transition>

    <!-- Time Control Panel (Secondary Expansion) -->
    <!-- We'll keep this as a separate component but managed by SystemConsole -->
    <TimeControlPanel
      ref="speedPanel"
      v-show="isMenuOpen"
      class="nested-speed-panel"
      @speed-change="(v) => $emit('speed-change', v)"
      @reset="$emit('reset')"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { t } from '../utils/i18n.js'
import TimeControlPanel from './TimeControlPanel.vue'

const props = defineProps({
  showZodiac: Boolean,
  showGrid: Boolean,
  showHolo: Boolean,
  hasSelectedPlanet: Boolean,
  positionTop: {
    type: String,
    default: '35%'
  }
})

const emit = defineEmits([
  'home',
  'toggle-zodiac',
  'toggle-grid',
  'toggle-holo',
  'speed-change',
  'reset'
])

const isMenuOpen = ref(false)
const isSpeedOpen = ref(false)
const speedPanel = ref(null)

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
  if (!isMenuOpen.value) {
    isSpeedOpen.value = false
    if (speedPanel.value) {
      speedPanel.value.setOpen(false)
    }
  }
}

function toggleSpeed() {
  isSpeedOpen.value = !isSpeedOpen.value
  if (speedPanel.value) {
    speedPanel.value.setOpen(isSpeedOpen.value)
  }
}

function resetSpeedVisuals() {
  if (speedPanel.value) {
    speedPanel.value.resetVisuals()
  }
}

defineExpose({
  resetSpeedVisuals
})
</script>

<style scoped>
.system-console {
  position: absolute;
  left: 0;
  z-index: 1000;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 1vw;
  pointer-events: none;
}

.button-stack {
  display: flex;
  flex-direction: column;
  gap: 0.8vh;
}

.console-btn {
  pointer-events: auto;
  min-width: 5vw;
  padding: 1.2vh 1vw;
  font-size: clamp(10px, 1.2vh, 14px);
  font-weight: 700;
  color: #fff;
  background: rgba(18, 22, 40, 0.9);
  border: 1px solid rgba(100, 150, 255, 0.3);
  border-left: none;
  border-radius: 0 1.2vh 1.2vh 0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0.4vh 0.4vh 2vh rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
}

.home-btn {
  border-color: rgba(100, 150, 255, 0.5);
  background: rgba(30, 60, 150, 0.85);
}

.home-btn:hover {
  background: rgba(50, 100, 240, 0.95);
  transform: translateX(6px);
  box-shadow: 8px 4px 25px rgba(50, 100, 240, 0.4);
}

.menu-btn.active {
  background: rgba(60, 80, 160, 0.9);
  border-color: rgba(100, 150, 255, 0.8);
}

.menu-btn:hover {
  background: rgba(40, 50, 100, 0.95);
  transform: translateX(4px);
}

.arrow {
  font-size: 10px;
  transition: transform 0.3s ease;
  display: inline-block;
  margin-left: 8px;
  opacity: 0.7;
}

.arrow.open {
  transform: rotate(90deg);
}

.expanded-menu {
  pointer-events: auto;
  margin-top: calc(1.2vh * 2 + 1.2vh + 10px); /* Adjust to align with menu button */
  display: flex;
  flex-direction: column;
  gap: 0.5vh;
  background: rgba(15, 20, 35, 0.95);
  border: 1px solid rgba(100, 150, 255, 0.25);
  border-radius: 1.2vh;
  padding: 0.8vh;
  box-shadow: 1vh 1vh 4vh rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(15px);
  min-width: 8vw;
}

.menu-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(100, 150, 255, 0.1);
  color: #88ccff;
  padding: 0.8vh 1vw;
  border-radius: 0.8vh;
  cursor: pointer;
  text-align: left;
  font-size: clamp(10px, 1.1vh, 13px);
  font-weight: 600;
  transition: all 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  white-space: nowrap;
}

.menu-item:hover {
  background: rgba(100, 150, 255, 0.15);
  color: #fff;
  border-color: rgba(100, 150, 255, 0.3);
  transform: translateX(4px);
}

.menu-item.active {
  background: rgba(100, 150, 255, 0.25);
  border-color: rgba(100, 150, 255, 0.6);
  color: #fff;
  box-shadow: 0 0 15px rgba(100, 150, 255, 0.2);
}

/* Slide Transition */
.slide-fade-enter-active {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}

/* Adjust TimeControlPanel position when used inside SystemConsole */
.nested-speed-panel {
  margin-top: calc(1.2vh * 2 + 1.2vh + 10px);
}

:deep(.panel-wrapper) {
  position: relative !important;
  top: 0 !important;
  left: 0 !important;
  transform: translateX(-20px) !important;
  opacity: 0;
  transition: all 0.45s cubic-bezier(0.25, 0.8, 0.25, 1);
  pointer-events: none;
}

:deep(.panel-wrapper.is-open) {
  transform: translateX(0) !important;
  opacity: 1;
  pointer-events: auto;
}

/* Hide the original toggle button of TimeControlPanel when nested */
:deep(.toggle-button) {
  display: none !important;
}
</style>
