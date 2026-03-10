<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { PLANET_DATA } from '../data/planetData.js'
import { currentLang, t } from '../utils/i18n.js'

const props = defineProps({
  planetName: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close', 'land'])

const planet = computed(() => {
  const langData = PLANET_DATA[currentLang.value] || PLANET_DATA['en']
  return langData[props.planetName] || null
})

// Resize Logic
const panelWidth = ref(280) // default width
const isResizing = ref(false)
let startX = 0
let startW = 0

function startResize(e) {
  isResizing.value = true
  startX = e.clientX
  startW = panelWidth.value
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault() // prevent selection
}

function onResize(e) {
  if (!isResizing.value) return
  // Delta calculation: Moving mouse Left (negative X change) -> Increases width
  const delta = startX - e.clientX
  const newWidth = startW + delta
  
  if (newWidth >= 200 && newWidth <= 600) {
    panelWidth.value = newWidth
  }
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}
</script>

<template>
  <transition name="slide-fade">
    <div 
      v-if="planet" 
      class="tour-panel"
      :style="{ width: panelWidth + 'px' }"
    >
      <div class="resize-handle" @mousedown="startResize"></div>
      <button class="close-btn" @click="$emit('close')">&times;</button>
      
      <div class="header">
        <h2>{{ planet.displayName }}</h2>
        <div class="divider"></div>
      </div>

      <div class="content">
        <p class="description">{{ planet.description }}</p>

        <div class="stats-grid">
          <div class="stat-item">
            <span class="label">{{ t('info.radius') }}</span>
            <span class="value">{{ planet.radius }}</span>
          </div>
          <div class="stat-item">
            <span class="label">{{ t('info.temp') }}</span>
            <span class="value">{{ planet.temp }}</span>
          </div>
          <div class="stat-item">
            <span class="label">{{ t('info.orbit') }}</span>
            <span class="value">{{ planet.orbit }}</span>
          </div>
        </div>

        <div class="facts-section">
          <h3>{{ t('info.did_you_know') }}</h3>
          <ul>
            <li v-for="(fact, index) in planet.facts" :key="index">
              {{ fact }}
            </li>
          </ul>
        </div>

        <div v-if="planetName === 'mars'" class="actions-section">
          <button class="land-btn" @click="$emit('land')">
            🚀 {{ t('info.land_btn') }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.tour-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  right: 20px;
  /* width is dynamic via style binding */
  max-height: calc(100vh - 40px);
  background: rgba(20, 20, 30, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  color: #fff;
  padding: 24px;
  font-family: 'Inter', sans-serif;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow-y: auto;
  z-index: 1000;
  pointer-events: auto;
}

.resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  width: 10px; /* target area size */
  height: 100%;
  cursor: w-resize;
  /* Visual indicator is optional: transparent or thin line */
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Optional: small visual bar in the center of handle */
.resize-handle::after {
  content: '';
  display: block;
  width: 4px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  transition: background 0.2s;
}

.resize-handle:hover::after {
  background: rgba(255, 255, 255, 0.5);

}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
  transition: color 0.2s;
}

.close-btn:hover {
  color: white;
}

.header h2 {
  margin: 0 0 12px 0;
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(45deg, #fff, var(--glow-color));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.divider {
  height: 1px;
  background: linear-gradient(90deg, rgba(255,255,255,0.2), transparent);
  margin-bottom: 20px;
}

.description {
  font-size: 15px;
  line-height: 1.6;
  color: #d1d5db;
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.05);
  padding: 12px;
  border-radius: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.label {
  font-size: 11px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.value {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.facts-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #fbbf24;
}

.facts-section ul {
  padding-left: 20px;
  margin: 0;
}

.facts-section li {
  margin-bottom: 8px;
  font-size: 14px;
  color: #e5e7eb;
  line-height: 1.5;
}

.actions-section {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

.land-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, var(--glow-color) 0%, var(--glow-secondary) 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(var(--glow-rgb), 0.3);
}

.land-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(var(--glow-rgb), 0.5);
  filter: brightness(1.1);
}

.land-btn:active {
  transform: translateY(0);
}

/* Animation */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease-out;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(30px);
  opacity: 0;
}
</style>
