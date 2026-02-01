<template>
  <div
    class="panel-wrapper"
    :class="{ 'is-open': isOpen }"
    @click.stop
  >
    <!-- Toggle Button -->
    <button
      class="toggle-button"
      @click="togglePanel"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        :style="{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }"
      >
        <path d="M15 18L9 12L15 6" />
      </svg>
    </button>

    <!-- Panel Content -->
    <div class="panel-content">
      <h3 class="panel-title">{{ title }}</h3>

      <ul class="planet-list">
        <li
          v-for="body in bodies"
          :key="body.id"
          class="planet-item"
        >
          <button
            class="planet-button"
            :class="{ active: selectedBody === body.id }"
            @click="$emit('select', body.id)"
          >
            {{ body.label }}
          </button>
        </li>
      </ul>
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
defineEmits(['select'])

const isOpen = ref(false)
const togglePanel = () => { isOpen.value = !isOpen.value }

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
  top: 53%;
  right: 0;
  transform: translateX(100%) translateY(-50%);
  z-index: 100;
  display: flex;
  transition: transform 0.45s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.panel-wrapper.is-open {
  transform: translateX(0) translateY(-50%);
}

.toggle-button {
  position: absolute;
  left: -48px;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 96px;
  background: rgba(30, 40, 80, 0.95);
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

.toggle-button:hover {
  background: rgba(50, 80, 160, 0.95);
  color: #ffffff;
}

.panel-content {
  background: rgba(20, 25, 50, 0.97);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(100, 150, 255, 0.3);
  border-radius: 16px 0 0 16px;
  padding: 24px 20px;
  width: 220px;
  min-width: 220px;
  max-width: 220px;
  box-sizing: border-box;
}

.panel-title {
  margin-bottom: 20px;
  color: #88ccff;
  font-size: 19px;
  font-weight: 600;
  text-align: center;
}

.planet-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.planet-button {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  background: rgba(40, 50, 100, 0.5);
  color: #ddd;
  border: 1px solid rgba(100, 150, 255, 0.3);
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
  text-align: left;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-sizing: border-box;
}

.planet-button:hover {
  background: rgba(60, 110, 220, 0.6);
  color: #fff;
  transform: translateX(4px);
}

.planet-button.active {
  background: #1e88e5;
  color: #fff;
  border-color: #64b5f6;
  font-weight: 600;
}
</style>
