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
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M15 6L9 12L15 18" />
      </svg>
    </button>

    <!-- Stage 1 & 2 Container -->
    <div class="main-panel-container">
      <!-- Stage 1: Solar System Rectangle Button -->
      <div v-if="panelState === 1" class="solar-button-group">
        <button class="collapse-btn-small" @click="panelState = 0" title="Collapse">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
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
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
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
  transition: all 0.45s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.arrow-trigger {
  position: absolute;
  left: -48px;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 96px;
  background: rgba(18, 22, 40, 0.95);
  border: 1px solid rgba(100, 150, 255, 0.4);
  border-right: none;
  border-radius: 12px 0 0 12px;
  color: #88ccff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: -4px 4px 20px rgba(0, 0, 0, 0.6);
}

.arrow-trigger:hover {
  background: rgba(40, 60, 120, 0.95);
  color: white;
}

.solar-button-group {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, rgba(30, 40, 80, 0.95), rgba(20, 25, 50, 0.98));
  backdrop-filter: blur(12px);
  border: 1px solid rgba(100, 150, 255, 0.4);
  border-right: none;
  border-radius: 12px 0 0 12px;
  overflow: hidden;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(100, 150, 255, 0.1);
  animation: slideIn 0.45s cubic-bezier(0.25, 0.8, 0.25, 1);
  width: 190px;
}

.solar-button {
  height: 56px;
  flex: 1;
  background: transparent;
  border: none;
  color: #88ccff;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0 16px 0 16px;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.collapse-btn-small {
  width: 44px;
  height: 56px;
  background: transparent;
  border: none;
  border-right: 1px solid rgba(100, 150, 255, 0.15);
  color: rgba(136, 204, 255, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.collapse-btn-small:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

.solar-button:hover {
  color: #ffffff;
  transform: translateX(-2px);
}

.solar-button .label {
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  white-space: nowrap;
}

.panel-content {
  background: rgba(15, 20, 40, 0.98);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(100, 150, 255, 0.2);
  border-right: none;
  border-radius: 12px 0 0 12px;
  padding: 24px 16px;
  width: 260px;
  box-shadow: -20px 0 50px rgba(0, 0, 0, 0.9);
  animation: slideIn 0.3s ease-out;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  padding: 0 4px;
}

.side-toggle-btn {
  position: absolute;
  left: -48px;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 96px;
  background: rgba(18, 22, 40, 0.95);
  border: 1px solid rgba(100, 150, 255, 0.4);
  border-right: none;
  border-radius: 12px 0 0 12px;
  color: #88ccff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: -4px 4px 20px rgba(0, 0, 0, 0.6);
  z-index: 10;
}

.side-toggle-btn:hover {
  background: rgba(40, 60, 120, 0.95);
  color: white;
}

.panel-title {
  margin: 0;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.planet-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
}

.planet-list::-webkit-scrollbar {
  width: 4px;
}
.planet-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}
.planet-list::-webkit-scrollbar-thumb {
  background: rgba(100, 150, 255, 0.3);
  border-radius: 2px;
}

.combined-planet-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0;
  background: rgba(40, 50, 100, 0.4);
  color: #ddd;
  border: 1px solid rgba(100, 150, 255, 0.25);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s ease;
  overflow: hidden;
  box-sizing: border-box;
}

.combined-planet-button:hover {
  background: rgba(60, 110, 220, 0.5);
  color: #fff;
  border-color: rgba(100, 150, 255, 0.4);
  transform: translateX(4px);
}

.combined-planet-button.active {
  background: #1e88e5;
  color: #fff;
  border-color: #64b5f6;
  font-weight: 600;
}

.planet-label {
  flex: 1;
  padding: 10px 14px;
  font-size: 14px;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.info-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  min-width: 42px;
  background: transparent;
  color: #88ccff;
  border: none;
  border-left: 1px solid rgba(100, 150, 255, 0.15);
  cursor: pointer;
  transition: all 0.2s ease;
}

.info-trigger:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.info-icon {
  font-size: 18px;
  font-weight: bold;
  opacity: 0.7;
  line-height: 1;
}

.info-trigger:hover .info-icon {
  opacity: 1;
  transform: scale(1.1);
}
</style>
