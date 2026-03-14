<template>
  <div class="system-console" :style="{ top: positionTop }">
    <div class="tron-container">
      <!-- Animated Border -->
      <div class="energy-border"></div>

      <div class="button-stack">
        <!-- Always visible Home button -->
        <button class="console-btn home-btn" @click="$emit('home')">
          <span class="btn-text">{{ t('control.home') }}</span>
          <div class="hover-glow"></div>
        </button>

        <!-- Menu toggle button -->
        <button
          class="console-btn menu-btn"
          :class="{ active: isMenuOpen }"
          @click="toggleMenu"
        >
          <span class="btn-text">{{ t('control.menu') }}</span>
          <span class="tron-arrow" :class="{ open: isMenuOpen }"></span>
          <div class="hover-glow"></div>
        </button>
      </div>

      <!-- Expanded Menu -->
      <Transition name="tron-slide">
        <div v-if="isMenuOpen" class="expanded-menu">
          <div class="menu-grid">
            <button
              class="menu-item"
              :class="{ active: showZodiac }"
              @click="$emit('toggle-zodiac')"
            >
              <div class="item-inner">
                <span class="indicator"></span>
                <span class="label">{{ t('control.zodiac') }}</span>
              </div>
            </button>

            <button
              v-if="hasSelectedPlanet"
              class="menu-item"
              :class="{ active: showGrid }"
              @click="$emit('toggle-grid')"
            >
              <div class="item-inner">
                <span class="indicator"></span>
                <span class="label">{{ t('control.grid') }}</span>
              </div>
            </button>

            <button
              class="menu-item"
              :class="{ active: showHolo }"
              @click="$emit('toggle-holo')"
            >
              <div class="item-inner">
                <span class="indicator"></span>
                <span class="label">{{ t('control.holographic') }}</span>
              </div>
            </button>

            <button
              class="menu-item speed-trigger"
              :class="{ active: isSpeedOpen }"
              @click="toggleSpeed"
            >
              <div class="item-inner">
                <span class="indicator"></span>
                <span class="label">{{ t('control.speed') }}</span>
                <span class="mini-arrow" :class="{ open: isSpeedOpen }"></span>
              </div>
            </button>

            <!-- Embedded vertical speed control -->
            <div class="speed-control-wrapper">
              <TimeControlPanel
                ref="speedPanel"
                :vertical="true"
                @speed-change="$emit('speed-change', $event)"
                @reset="$emit('reset')"
              />
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { t } from '../utils/i18n'
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
  'reset',
  'toggle-speed'
])

const isMenuOpen = ref(false)
const isSpeedOpen = ref(false)
const speedPanel = ref(null)

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
  if (!isMenuOpen.value) {
    isSpeedOpen.value = false
    emit('toggle-speed', false)
  }
}

function toggleSpeed() {
  isSpeedOpen.value = !isSpeedOpen.value
  if (speedPanel.value) {
    speedPanel.value.setOpen(isSpeedOpen.value)
  }
}

function closeSpeed() {
  isSpeedOpen.value = false
  if (speedPanel.value) {
    speedPanel.value.setOpen(false)
  }
}

function resetSpeedVisuals() {
  if (speedPanel.value) {
    speedPanel.value.resetVisuals()
  }
}

defineExpose({
  closeSpeed,
  resetSpeedVisuals
})
</script>

<style scoped>
.system-console {
  position: absolute;
  left: 0;
  z-index: 1000;
  pointer-events: none;
}

.tron-container {
  pointer-events: auto;
  position: relative;
  background: rgba(10, 20, 35, 0.4);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(var(--glow-rgb), 0.15);
  border-left: none;
  border-radius: 0 16px 16px 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 20px 0 50px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  /* Fixed width prevents horizontal extension when menu opens (e.g. to fit 'HOLOGRAPHIC' label) */
  width: 185px;
  box-sizing: border-box;
}

/* Hexagon Pattern Background */
.tron-container::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image:
    url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 1L2 6v10l10 5 10-5V6L12 1z' fill='none' stroke='rgba(var(--glow-rgb),0.03)' stroke-width='1'/%3E%3C/svg%3E");
  background-size: 32px 32px;
  pointer-events: none;
}

/* Energy Flow Animation on Border */
.energy-border {
  position: absolute;
  top: 0; bottom: 0; right: 0;
  width: 2px;
  background: linear-gradient(to bottom, transparent, var(--glow-color), transparent);
  background-size: 100% 200%;
  animation: flow 3s linear infinite;
}

@keyframes flow {
  0% { background-position: 0% 0%; }
  100% { background-position: 0% 200%; }
}

.button-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  z-index: 2;
  margin-bottom: 4px;
}

.console-btn {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(var(--glow-rgb), 0.2);
  border-radius: 4px;
  color: rgba(var(--glow-rgb), 0.8);
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

.btn-text {
  position: relative;
  z-index: 1;
}

.hover-glow {
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(var(--glow-rgb), 0.15), transparent);
  transition: left 0.5s ease;
}

.console-btn:hover .hover-glow {
  left: 100%;
}

.console-btn:hover {
  background: rgba(var(--glow-rgb), 0.08);
  border-color: var(--glow-color);
  color: #fff;
  text-shadow: 0 0 10px rgba(var(--glow-rgb), 0.5);
  transform: translateX(4px);
}

.home-btn {
  background: rgba(var(--glow-rgb), 0.1);
  border-color: rgba(var(--glow-rgb), 0.3);
}

.menu-btn.active {
  background: rgba(var(--glow-rgb), 0.15);
  border-color: var(--glow-color);
  color: #fff;
}

.tron-arrow {
  width: 6px; height: 6px;
  border-top: 2px solid currentColor;
  border-right: 2px solid currentColor;
  transform: rotate(45deg);
  transition: transform 0.3s ease;
  margin-left: 10px;
}

.tron-arrow.open {
  transform: rotate(135deg);
}

.expanded-menu {
  margin-top: 16px;
  border-top: 1px solid rgba(var(--glow-rgb), 0.15);
  padding-top: 12px;
  position: relative;
  z-index: 2;
  max-height: 420px;
  overflow: hidden;
}

.menu-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.menu-item {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.item-inner {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.indicator {
  width: 4px; height: 4px;
  background: rgba(var(--glow-rgb), 0.25);
  border-radius: 50%;
  transition: all 0.3s ease;
}

.label {
  color: rgba(var(--glow-rgb), 0.6);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.menu-item:hover .item-inner {
  background: rgba(var(--glow-rgb), 0.05);
  border-color: rgba(var(--glow-rgb), 0.25);
}

.menu-item:hover .label {
  color: #fff;
}

.menu-item.active .indicator {
  background: var(--glow-color);
  box-shadow: 0 0 8px var(--glow-color);
  transform: scale(1.5);
}

.menu-item.active .label {
  color: var(--glow-color);
  font-weight: 800;
}

.mini-arrow {
  margin-left: auto;
  width: 0; height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 4px solid rgba(var(--glow-rgb), 0.5);
  transition: transform 0.3s ease;
}

.mini-arrow.open {
  transform: rotate(180deg);
}

.speed-control-wrapper {
  padding: 0 4px;
}

/* Tron Slide Animation */
.tron-slide-enter-active, .tron-slide-leave-active {
  transition:
    opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    margin-top 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    padding-top 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.tron-slide-enter-from, .tron-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
  margin-top: 0;
  padding-top: 0;
  border-color: transparent;
}
</style>
