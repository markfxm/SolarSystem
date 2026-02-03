<template>
  <div class="transit-panel" :class="{ visible }">
    <div class="panel-header">
      <h3>{{ t('control.zodiac') }}</h3>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
    
    <div class="panel-content">
      <!-- NEW: Cosmic Insight Section -->
      <div class="insight-section" v-if="dominantElement !== 'none'">
        <div class="vibe-header">
          <span class="vibe-label">{{ t('insight.vibe') }}</span>
          <span class="vibe-value" :class="dominantElement">{{ t('insight.' + dominantElement) }}</span>
        </div>
        <div class="vibe-bar">
          <div v-for="(val, el) in elementBalance" :key="el" 
               class="bar-segment" 
               :class="el"
               :style="{ width: (val / planetCount * 100) + '%' }">
          </div>
        </div>
      </div>

      <div class="section">
        <h4>{{ t('transit.positions') || 'Positions' }}</h4>
        <div class="planet-list">
          <div v-for="(data, id) in chart" :key="id" 
               class="planet-item clickable"
               @click="$emit('focus-planet', id)">
            <span class="p-name">{{ t('planet.' + id) }}</span>
            <span class="p-sign">{{ t('zodiac_names')[data.index] }}</span>
            <span class="p-deg">{{ formatDegree(data.degree) }}</span>
          </div>
        </div>
      </div>

      <div class="section" v-if="aspects.length > 0">
        <h4>{{ t('transit.active_aspects') || 'Active Aspects' }}</h4>
        <div class="aspect-list">
          <div v-for="(item, idx) in aspects" :key="idx" class="aspect-item">
            <span class="a-names">
              <span>{{ t('planet.' + item.p1) }} & {{ t('planet.' + item.p2) }}</span>
              <span class="a-type" :style="{ color: getColor(item.aspect.color) }">
                {{ t(item.aspect.label) }}
              </span>
            </span>
            <span class="a-tip">{{ t('insight.tip_' + item.aspect.type.toLowerCase()) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { t } from '../utils/i18n.js'
import { AstrologyService } from '../utils/AstrologyService.js'

const props = defineProps({
  visible: Boolean,
  chart: Object,
  aspects: Array,
  elementBalance: Object,
  dominantElement: String
})

defineEmits(['close', 'focus-planet'])

const planetCount = computed(() => Object.keys(props.chart).length || 1)

function formatDegree(deg) {
  return AstrologyService.formatDegree(deg)
}

function getColor(hex) {
  return '#' + hex.toString(16).padStart(6, '0')
}
</script>

<style scoped>
.transit-panel {
  position: absolute;
  top: 80px;
  right: -320px;
  width: 280px;
  max-height: 80vh;
  background: rgba(15, 15, 25, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(212, 170, 255, 0.2);
  border-radius: 16px;
  color: #fff;
  transition: right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  z-index: 1001;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}

.transit-panel.visible {
  right: 20px;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  color: #d4aaff;
  letter-spacing: 1px;
}

.close-btn {
  background: none;
  border: none;
  color: #aaa;
  font-size: 24px;
  cursor: pointer;
}

.panel-content {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.section {
  margin-bottom: 24px;
}

.section h4 {
  font-size: 12px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.5);
  margin-bottom: 12px;
  border-left: 2px solid #d4aaff;
  padding-left: 8px;
}

.planet-list, .aspect-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.planet-item {
  display: grid;
  grid-template-columns: 80px 100px 1fr;
  font-size: 14px;
  align-items: center;
  padding: 6px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}
.planet-item.clickable { cursor: pointer; }
.planet-item.clickable:hover { 
  background: rgba(212, 170, 255, 0.15); 
  transform: translateX(4px);
}

.p-name { color: #88ccff; font-weight: 600; }
.p-sign { color: #fff; font-weight: 500; }
.p-deg { color: #aaa; text-align: right; font-family: monospace; }

/* Insight Styles */
.insight-section {
  background: rgba(255, 255, 255, 0.03);
  margin: -16px -16px 20px -16px;
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.vibe-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.vibe-label {
  font-size: 11px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.4);
  letter-spacing: 1px;
}

.vibe-value {
  font-size: 18px;
  font-weight: 700;
  text-shadow: 0 0 10px currentColor;
}

.vibe-value.fire { color: #ff5533; }
.vibe-value.earth { color: #88cc44; }
.vibe-value.air { color: #55aaff; }
.vibe-value.water { color: #aa88ff; }

.vibe-bar {
  height: 4px;
  display: flex;
  border-radius: 2px;
  overflow: hidden;
  background: rgba(255,255,255,0.1);
}

.bar-segment { height: 100%; }
.bar-segment.fire { background: #ff5533; }
.bar-segment.earth { background: #88cc44; }
.bar-segment.air { background: #55aaff; }
.bar-segment.water { background: #aa88ff; }

.aspect-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: rgba(255,255,255,0.05);
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
}

.a-names { color: #eee; display: flex; justify-content: space-between; }
.a-type { font-weight: 600; }

.a-tip {
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  font-style: italic;
  margin-top: 2px;
}
</style>
