<template>
  <div
    class="panel-wrapper"
    :class="[`state-${panelState}`]"
    @click.stop
  >
    <!-- Stage 0: The Arrow Trigger -->
    <button
      v-if="panelState === 0"
      class="arrow-trigger"
      @click="panelState = 1"
      aria-label="open solar system panel"
    >
      <span class="tron-arrow left"></span>
    </button>

    <!-- Stage 1 & 2 Container -->
    <div class="main-panel-container">
      <!-- Stage 1: Solar System Rectangle Button -->
      <div v-if="panelState === 1" class="solar-button-group">
        <button class="collapse-btn-small" @click="panelState = 0" title="Collapse">
          <span class="tron-arrow right"></span>
        </button>
        <button
          class="solar-button"
          @click="panelState = 2"
        >
          <span class="label">{{ title }}</span>
        </button>
      </div>

      <!-- Stage 2: Full List -->
      <div v-if="panelState === 2" class="panel-content">
        <!-- Side Toggle for Stage 2 -->
        <button class="side-toggle-btn" @click="panelState = 1" :title="t('nav.back_to_button')">
          <span class="tron-arrow right"></span>
        </button>

        <div class="panel-header">
           <h3 class="panel-title">{{ title }}</h3>
        </div>

        <ul class="planet-list">
          <li
            v-for="body in bodies"
            :key="body.id"
            class="planet-item"
          >
            <div
              class="combined-planet-button"
              :class="{ active: selectedBody === body.id }"
              @click="$emit('select', body.id)"
            >
              <span class="planet-label">{{ body.label }}</span>
              <button
                class="info-trigger"
                @click.stop="$emit('info', body.id)"
                :title="t('nav.show_info')"
              >
                <span class="info-icon">三</span>
              </button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { t } from '../utils/i18n.js'

defineProps({
  selectedBody: {
    type: String,
    default: null
  }
})
defineEmits(['select', 'info'])

const panelState = ref(0) // 0: Hidden (Arrow), 1: Peeking (Button), 2: Open (List)

const title = computed(() => t('nav_title'))

const bodies = computed(() => [
  { id: 'sun', label: t('planet.sun') },
  { id: 'mercury', label: t('planet.mercury') },
  { id: 'venus', label: t('planet.venus') },
  { id: 'earth', label: t('planet.earth') },
  { id: 'moon', label: t('planet.moon') },
  { id: 'mars', label: t('planet.mars') },
  { id: 'jupiter', label: t('planet.jupiter') },
  { id: 'saturn', label: t('planet.saturn') },
  { id: 'uranus', label: t('planet.uranus') },
  { id: 'neptune', label: t('planet.neptune') }
])
</script>

<style scoped>
.panel-wrapper {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  transition: all 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}

.arrow-trigger {
  position: absolute;
  left: -40px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 80px;
  background: rgba(10, 20, 35, 0.6);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(var(--glow-rgb), 0.3);
  border-right: none;
  border-radius: 8px 0 0 8px;
  color: var(--glow-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: -5px 0 20px rgba(0, 0, 0, 0.4);
}

.arrow-trigger:hover {
  background: rgba(var(--glow-rgb), 0.1);
  border-color: var(--glow-color);
  color: white;
  text-shadow: 0 0 10px var(--glow-color);
}

.solar-button-group {
  display: flex;
  align-items: center;
  background: rgba(10, 20, 35, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(var(--glow-rgb), 0.3);
  border-right: none;
  border-radius: 8px 0 0 8px;
  overflow: hidden;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
  animation: slideIn 0.45s cubic-bezier(0.16, 1, 0.3, 1);
  width: 220px;
  transition: border-color 0.3s ease;
}

.solar-button-group:hover {
  border-color: var(--glow-color);
}

.solar-button {
  height: 50px;
  flex: 1;
  background: transparent;
  border: none;
  color: rgba(var(--glow-rgb), 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0 16px;
  transition: all 0.3s ease;
}

.collapse-btn-small {
  width: 40px;
  height: 50px;
  background: transparent;
  border: none;
  border-right: 1px solid rgba(var(--glow-rgb), 0.15);
  color: rgba(var(--glow-rgb), 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.collapse-btn-small:hover {
  background: rgba(var(--glow-rgb), 0.05);
  color: #fff;
}

.solar-button:hover {
  color: #ffffff;
  background: rgba(var(--glow-rgb), 0.05);
}

.solar-button .label {
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  white-space: nowrap;
}

.panel-content {
  background: rgba(10, 20, 35, 0.7);
  backdrop-filter: blur(25px);
  border: 1px solid rgba(var(--glow-rgb), 0.25);
  border-right: none;
  border-radius: 12px 0 0 12px;
  padding: 24px 16px;
  width: 250px;
  box-shadow: -20px 0 50px rgba(0, 0, 0, 0.6);
  animation: slideIn 0.3s ease-out;
  position: relative;
}

/* Hex Pattern */
.panel-content::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(var(--glow-rgb), 0.04) 1px, transparent 0);
  background-size: 16px 16px;
  pointer-events: none;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.side-toggle-btn {
  position: absolute;
  left: -40px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 80px;
  background: rgba(10, 20, 35, 0.6);
  border: 1px solid rgba(var(--glow-rgb), 0.3);
  border-right: none;
  border-radius: 8px 0 0 8px;
  color: var(--glow-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 10;
}

.side-toggle-btn:hover {
  background: rgba(var(--glow-rgb), 0.15);
  border-color: var(--glow-color);
  color: white;
}

.panel-title {
  margin: 0;
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  text-shadow: 0 0 10px rgba(var(--glow-rgb), 0.4);
}

.planet-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 6px;
  position: relative;
  z-index: 1;
}

.planet-list::-webkit-scrollbar {
  width: 2px;
}
.planet-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}
.planet-list::-webkit-scrollbar-thumb {
  background: rgba(var(--glow-rgb), 0.25);
}

.combined-planet-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0;
  background: rgba(255, 255, 255, 0.02);
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(var(--glow-rgb), 0.15);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.combined-planet-button:hover {
  background: rgba(var(--glow-rgb), 0.08);
  border-color: rgba(var(--glow-rgb), 0.3);
  color: #fff;
  transform: translateX(-4px);
}

.combined-planet-button.active {
  background: rgba(var(--glow-rgb), 0.15);
  border-color: var(--glow-color);
  color: #fff;
  box-shadow: 0 0 15px rgba(var(--glow-rgb), 0.25);
}

.planet-label {
  flex: 1;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  letter-spacing: 1px;
}

.info-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: transparent;
  color: rgba(var(--glow-rgb), 0.45);
  border: none;
  border-left: 1px solid rgba(var(--glow-rgb), 0.15);
  cursor: pointer;
  transition: all 0.2s ease;
}

.info-trigger:hover {
  background: rgba(var(--glow-rgb), 0.1);
  color: var(--glow-color);
}

.info-icon {
  font-size: 16px;
  font-weight: 800;
}

.tron-arrow {
  width: 8px;
  height: 8px;
  border-top: 2px solid currentColor;
  border-right: 2px solid currentColor;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}

.tron-arrow.left {
  transform: rotate(-135deg);
}

.tron-arrow.right {
  transform: rotate(45deg);
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

</style>
