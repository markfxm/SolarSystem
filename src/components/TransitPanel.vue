<template>
  <div class="transit-panel" :class="{ visible }">
    <div class="panel-header">
      <h3>{{ t('control.zodiac') }}</h3>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
    
    <div class="panel-content">
      <!-- NEW: Cosmic Archetype Section -->
       <div class="archetype-section" v-if="archetypeKey">
         <div class="archetype-label">{{ t('transit.archetype') }}</div>
         <div class="archetype-value">{{ t('archetype.' + archetypeKey) }}</div>
       </div>

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


      <!-- NEW: Cosmic Report Section (User Manual Style) -->
      <div class="report-section">
        <div class="report-title">{{ t('report.title') }}</div>
        
        <div class="guidance-block">
            <div class="g-label">🚀 {{ t('planet.sun') }}</div>
            <div class="g-text">{{ guidance.sun }}</div>
        </div>

        <div class="guidance-block">
            <div class="g-label">❤️ {{ t('planet.moon') }}</div>
            <div class="g-text">{{ guidance.moon }}</div>
        </div>

        <div class="guidance-block" v-if="guidance.strategy">
            <div class="g-label">⚔️ {{ t('transit.active_aspects') }}</div>
            <div class="g-text">{{ guidance.strategy }}</div>
        </div>
      </div>

      <!-- Toggle Details -->
      <div class="toggle-btn" @click="showDetails = !showDetails">
        {{ showDetails ? t('report.toggle_hide') : t('report.toggle_show') }}
        <span :class="{ rotated: showDetails }">▼</span>
      </div>

      <div v-if="showDetails" class="details-container">
        <div class="section">
            <h4>{{ t('transit.positions') || 'Positions' }}</h4>
            <div class="planet-list">
            <div v-for="(data, id) in chart" :key="id" 
                class="planet-item clickable"
                @click="$emit('focus-planet', id)">
                <div class="planet-row-main">
                <span class="p-name">{{ t('planet.' + id) }}</span>
                <span class="p-sign">{{ t('zodiac_names')[data.index] }}</span>
                <span class="p-deg">{{ formatDegree(data.degree) }}</span>
                </div>
                <div class="planet-row-desc">
                <span class="p-meaning">{{ t('planet_meaning.' + id) }}</span>
                <span class="p-keyword">{{ t('sign_keywords.' + data.signId) }}</span>
                </div>
            </div>
            </div>
        </div>

        <div class="section" v-if="aspects.length > 0">
            <h4>{{ t('transit.active_aspects') || 'Active Aspects' }}</h4>
            <div class="aspect-list">
            <div v-for="(item, idx) in aspects" :key="idx" class="aspect-item">
                <span class="a-names">
                <span>{{ t('planet.' + item.p1) }} & {{ t('planet.' + item.p2) }}</span>
                <span class="a-type" :style="{ color: item.aspect.colorStr }">
                    {{ t(item.aspect.label) }}
                </span>
                </span>
                <span class="a-tip">{{ t('insight.tip_' + item.aspect.type.toLowerCase()) }}</span>
            </div>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
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

const showDetails = ref(false)
const planetCount = computed(() => Object.keys(props.chart).length || 1)

const archetypeKey = computed(() => {
    if (!props.chart || !props.chart.sun) return null;
    return AstrologyService.getArchetype(props.chart.sun.signId, props.dominantElement);
})

const majorAspect = computed(() => {
    return AstrologyService.getMajorAspect(props.aspects);
})

const guidance = computed(() => {
    if (!props.chart || !props.chart.sun || !props.chart.moon) return { sun: '', moon: '', strategy: '' };
    
    // Get raw keys
    const keys = AstrologyService.getCosmicGuidance(props.chart, majorAspect.value);
    
    // Translate
    const strategyVars = keys.strategyKey ? {
        p1: t(`planet.${keys.p1}`),
        p2: t(`planet.${keys.p2}`)
    } : null;

    return {
        sun: t(`guidance.sun.${keys.sunKey}`),
        moon: t(`guidance.moon_deep.${keys.moonKey}`),
        strategy: keys.strategyKey ? t(`guidance.strategy.${keys.strategyKey}`, strategyVars) : t('report.no_aspect')
    };
})

function formatDegree(deg) {
  return AstrologyService.formatDegree(deg)
}
</script>

<style scoped>
/* Report Styles */
.report-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  border-left: 3px solid #d4aaff;
}

.report-title {
  font-size: 11px;
  text-transform: uppercase;
  color: #d4aaff;
  margin-bottom: 6px;
  font-weight: 600;
  letter-spacing: 1px;
}

.report-text p {
  font-size: 13px;
  line-height: 1.5;
  color: #eee;
  margin: 0 0 8px 0;
}
.report-text p:last-child { margin-bottom: 0; }

.guidance-block {
    margin-bottom: 12px;
}
.guidance-block:last-child { margin-bottom: 0; }

.g-label {
    font-size: 10px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 2px;
    letter-spacing: 0.5px;
}

.g-text {
    font-size: 13px;
    line-height: 1.4;
    color: #fff;
    font-weight: 500;
}

.toggle-btn {
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  transition: color 0.2s;
}
.toggle-btn:hover { color: #fff; }
.toggle-btn span { display: inline-block; transition: transform 0.3s; margin-left: 4px; font-size: 10px; }
.toggle-btn span.rotated { transform: rotate(180deg); }

.details-container {
    animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

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

/* Archetype Styles */
.archetype-section {
    background: linear-gradient(135deg, rgba(136, 204, 255, 0.1), rgba(212, 170, 255, 0.1));
    margin: -16px -16px 10px -16px;
    padding: 20px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    text-align: center;
}

.archetype-label {
    font-size: 10px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.6);
    letter-spacing: 1.5px;
    margin-bottom: 6px;
}

.archetype-value {
    font-size: 20px;
    font-weight: 800;
    background: linear-gradient(to right, #ffffff, #d4aaff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 0 20px rgba(212, 170, 255, 0.4);
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
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  padding: 8px 10px;
  border-radius: 6px;
  transition: all 0.2s;
  background: rgba(255,255,255,0.02);
}
.planet-item.clickable { cursor: pointer; }
.planet-item.clickable:hover { 
  background: rgba(212, 170, 255, 0.15); 
  transform: translateX(4px);
}

.planet-row-main {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  align-items: center;
}

.planet-row-desc {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
}

.p-name { color: #88ccff; font-weight: 600; }
.p-sign { color: #fff; font-weight: 500; }
.p-deg { color: #aaa; text-align: right; font-family: monospace; }
.p-meaning { font-style: italic; }
.p-keyword { 
    background: rgba(255, 255, 255, 0.1); 
    padding: 1px 6px; 
    border-radius: 4px; 
    color: #d4aaff; 
}

/* Insight Styles */
.insight-section {
  background: rgba(255, 255, 255, 0.03);
  margin: 0px -16px 20px -16px; /* Adjusted margin to sit below archetype */
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
