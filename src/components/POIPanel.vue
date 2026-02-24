<template>
  <div
    class="poi-panel"
    :class="[side]"
  >
    <div class="panel-header" @mousedown="$emit('drag-start', $event)">
      <h3 class="poi-name">{{ name }}</h3>
      <button class="close-btn" @mousedown.stop @click.stop="$emit('close')">×</button>
    </div>

    <div class="panel-content">
      <p class="poi-description">{{ description }}</p>
    </div>

    <div v-if="poi.planetName === 'mars'" class="panel-footer">
      <button class="land-btn" @click="$emit('land', poi)">
        🚀 {{ t('mars.pois.land_here') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { t } from '../utils/i18n.js';

const props = defineProps({
  poi: {
    type: Object,
    required: true
  },
  side: {
    type: String,
    default: 'right' // 'left' or 'right'
  }
});

defineEmits(['close', 'land', 'drag-start']);

const name = computed(() => {
  if (!props.poi) return '';
  const planet = props.poi.planetName;
  return t(`${planet}.pois.${props.poi.poiId}`);
});

const description = computed(() => {
  if (!props.poi) return '';
  const planet = props.poi.planetName;
  return t(`${planet}.pois.${props.poi.poiId}_desc`);
});
</script>

<style scoped>
.poi-panel {
  position: absolute;
  width: 280px;
  background: rgba(10, 20, 35, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 163, 255, 0.4);
  border-top: none; /* Top edge is the SVG line */
  border-radius: 0 0 12px 12px; /* Only bottom corners rounded */
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 163, 255, 0.1);
  color: white;
  padding: 16px;
  z-index: 1002;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  pointer-events: auto;
  transition: opacity 0.3s ease;
  overflow: hidden;
  transform-origin: top;
}

.poi-panel.left {
  /* Positioning handled by parent */
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  padding-top: 4px; /* Space from the SVG line */
  cursor: grab;
  user-select: none;
}

.panel-header:active {
  cursor: grabbing;
}

.poi-name {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #00A3FF;
  text-shadow: 0 0 10px rgba(0, 163, 255, 0.3);
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
  transition: color 0.2s;
}

.close-btn:hover {
  color: white;
}

.poi-description {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.panel-footer {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.land-btn {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #00A3FF 0%, #0066FF 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 15px rgba(0, 102, 255, 0.3);
}

.land-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 163, 255, 0.5);
  filter: brightness(1.1);
}

.land-btn:active {
  transform: translateY(0);
}

/* Entrance Animation: Expand Downwards */
@keyframes expandDown {
  from {
    opacity: 0;
    max-height: 0;
    transform: scaleY(0);
  }
  to {
    opacity: 1;
    max-height: 500px; /* arbitrary large value */
    transform: scaleY(1);
  }
}

.poi-panel {
  animation: expandDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
