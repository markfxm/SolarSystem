<script setup>
import { computed } from 'vue'
import { PLANET_DATA } from '../data/planetData.js'
import { currentLang, t } from '../utils/i18n.js'

const props = defineProps({
  planetName: String
})

const emit = defineEmits(['close', 'land'])

const planet = computed(() => {
  if (!props.planetName) return null
  const langData = PLANET_DATA[currentLang.value] || PLANET_DATA['en']
  return langData[props.planetName] || null
})
</script>

<template>
  <div class="tour-panel-root">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="planet"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[40] pointer-events-auto"
        @click="$emit('close')"
      ></div>
    </Transition>

    <!-- Panel -->
    <Transition name="slide">
      <div
        v-if="planet"
        class="fixed right-0 top-0 h-full w-full sm:w-[380px] md:w-[420px] bg-black/95 backdrop-blur-2xl border-l border-white/10 z-50 flex flex-col shadow-2xl pointer-events-auto"
      >
        <button class="close-btn" @click="$emit('close')">&times;</button>

        <div class="flex-1 overflow-y-auto p-8 pt-20">
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
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.tour-panel-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 40;
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 24px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 32px;
  cursor: pointer;
  line-height: 1;
  transition: all 0.2s;
  z-index: 10;
}

.close-btn:hover {
  color: white;
  transform: rotate(90deg);
}

.header h2 {
  margin: 0 0 12px 0;
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(45deg, #fff, #a5b4fc);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.divider {
  height: 1px;
  background: linear-gradient(90deg, rgba(255,255,255,0.2), transparent);
  margin-bottom: 24px;
}

.description {
  font-size: 16px;
  line-height: 1.6;
  color: #d1d5db;
  margin-bottom: 32px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 32px;
  background: rgba(255, 255, 255, 0.05);
  padding: 16px;
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
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.value {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.facts-section h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #fbbf24;
}

.facts-section ul {
  padding-left: 20px;
  margin: 0;
}

.facts-section li {
  margin-bottom: 12px;
  font-size: 15px;
  color: #e5e7eb;
  line-height: 1.5;
}

.actions-section {
  margin-top: 32px;
}

.land-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);
}

.land-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(225, 29, 72, 0.5);
  filter: brightness(1.1);
}

/* Animations */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.slide-enter-active, .slide-leave-active {
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-enter-from, .slide-leave-to {
  transform: translateX(100%);
}
</style>
