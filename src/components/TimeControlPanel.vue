<template>
  <div class="time-control-panel" :class="{ 'is-open': isOpen, 'is-vertical': vertical }" @click.stop>
    <div class="industrial-frame">
      <!-- Energy Tank Header (Only in horizontal mode) -->
      <div v-if="!vertical" class="panel-header">
        <div class="title-wrap">
          <span class="glitch-text" :data-text="t('control.speed')">{{ t('control.speed') }}</span>
          <div class="status-dot"></div>
        </div>
        <div class="current-display">
          <span class="unit">×</span>
          <span class="value">{{ formattedMultiplier }}</span>
        </div>
      </div>

      <!-- Equalizer-style Slider Area -->
      <div class="tank-container">
        <!-- Vertical Display (Multiplier value above slider) -->
        <div v-if="vertical" class="vertical-header-display">
          <span class="unit">×</span>
          <span class="value">{{ formattedMultiplier }}</span>
        </div>

        <div class="slider-area" ref="wrap" @mousedown.prevent="startDrag($event)" @touchstart.prevent="startDrag($event)">
          <!-- Ruler Ticks -->
          <div class="ruler-ticks">
            <div v-for="i in 21" :key="i" class="tick" :class="{ major: (i-1) % 5 === 0 }"></div>
          </div>

          <!-- EQ Track Fill (Thick bright line) -->
          <div class="track-wrapper">
            <div class="track-fill" :style="trackStyle"></div>
          </div>

          <!-- Preset Points (Side labels) -->
          <div
            v-for="p in presets"
            :key="p.val"
            class="preset-point"
            :style="getPresetStyle(p.norm)"
            @click.stop="setByPos(p.norm)"
          >
            <span class="node-label">{{ p.label }}</span>
          </div>

          <!-- Solid Circular Knob -->
          <div
            class="indicator-knob"
            :style="knobStyle"
            ref="knob"
          >
            <div class="knob-marker"></div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="panel-footer">
        <button class="tron-btn reset" @click.stop="$emit('reset')">
          <span class="btn-content">{{ t('control.reset') }}</span>
          <div class="btn-border"></div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { t } from '../utils/i18n.js'

const props = defineProps({
  vertical: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['speed-change', 'reset'])

const isOpen = ref(false)
const pos = ref(0)
const wrap = ref(null)
const knob = ref(null)

const MIN = 1
const MAX = 1000000

const presets = [
  { val: 1, norm: 0, label: 'x1' },
  { val: 250000, norm: (250000 - MIN) / (MAX - MIN), label: '250K' },
  { val: 500000, norm: (500000 - MIN) / (MAX - MIN), label: '500K' },
  { val: 750000, norm: (750000 - MIN) / (MAX - MIN), label: '750K' },
  { val: 1000000, norm: 1, label: 'MAX' }
]

const multiplier = computed(() => Math.round(MIN + pos.value * (MAX - MIN)))
const formattedMultiplier = computed(() => multiplier.value.toLocaleString())

const trackStyle = computed(() => {
  if (props.vertical) {
    return { height: (pos.value * 100) + '%', width: '100%', bottom: 0, top: 'auto' }
  }
  return { width: (pos.value * 100) + '%', height: '100%', left: 0 }
})

const knobStyle = computed(() => {
  if (props.vertical) {
    return { bottom: (pos.value * 100) + '%', left: '0', right: '0', width: 'auto', height: '0', transform: 'translateY(50%)' }
  }
  return { left: (pos.value * 100) + '%', top: '0', bottom: '0', width: '0', transform: 'translateX(-50%)' }
})

function getPresetStyle(norm) {
  if (props.vertical) {
    return { bottom: (norm * 100) + '%', left: '50%', top: 'auto' }
  }
  return { left: (norm * 100) + '%', top: '50%' }
}

emit('speed-change', multiplier.value)

let dragging = false
const SNAP_THRESHOLD = 0.03

function clamp(v, a = 0, b = 1) {
  return Math.max(a, Math.min(b, v))
}

const initialPos = ref(0)
const initialCoord = ref(0)

function startDrag(e) {
  dragging = true
  addMoveListeners()
  if (props.vertical) {
    initialCoord.value = e.touches ? e.touches[0].clientY : e.clientY
  } else {
    initialCoord.value = e.touches ? e.touches[0].clientX : e.clientX
  }
  initialPos.value = pos.value
}

function onMove(e) {
  if (!dragging) return
  const el = wrap.value
  if (!el) return
  const rect = el.getBoundingClientRect()

  let deltaNorm = 0
  if (props.vertical) {
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const deltaY = initialCoord.value - clientY // Up is more speed, so initial - current
    const scale = rect.height
    deltaNorm = deltaY / scale
  } else {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const deltaX = clientX - initialCoord.value
    const scale = rect.width
    deltaNorm = deltaX / scale
  }

  pos.value = clamp(initialPos.value + deltaNorm, 0, 1)
  emit('speed-change', multiplier.value)
}

function stopDrag() {
  if (!dragging) return
  dragging = false
  snapToPreset()
  removeMoveListeners()
}

function snapToPreset() {
  let minDist = Infinity
  let nearest = null
  for (const p of presets) {
    const d = Math.abs(pos.value - p.norm)
    if (d < minDist) {
      minDist = d
      nearest = p
    }
  }
  if (nearest && minDist <= SNAP_THRESHOLD) {
    pos.value = nearest.norm
    emit('speed-change', multiplier.value)
  }
}

function addMoveListeners() {
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', stopDrag)
  window.addEventListener('touchmove', onMove, { passive: false })
  window.addEventListener('touchend', stopDrag)
}

function removeMoveListeners() {
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('touchmove', onMove)
  window.removeEventListener('touchend', stopDrag)
}

function setByPos(p) {
  pos.value = clamp(p, 0, 1)
  emit('speed-change', multiplier.value)
}

function resetVisuals() {
  pos.value = 0
}

function setOpen(val) {
  isOpen.value = val
}

onBeforeUnmount(removeMoveListeners)

defineExpose({ resetVisuals, setOpen })
</script>

<style scoped>
.time-control-panel {
  position: relative;
  width: 100%;
  pointer-events: auto;
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  max-height: 0;
}

.time-control-panel.is-open {
  opacity: 1;
  transform: translateY(0);
  max-height: 400px;
  margin-top: 10px;
}

.time-control-panel.is-vertical {
  width: 140px;
}

.industrial-frame {
  background: rgba(10, 15, 25, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(var(--glow-rgb), 0.25);
  border-radius: 4px;
  padding: 16px;
  box-shadow:
    0 0 30px rgba(0, 0, 0, 0.5),
    inset 0 0 15px rgba(var(--glow-rgb), 0.05);
  position: relative;
  overflow: hidden;
}

/* Hexagon background pattern */
.industrial-frame::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image:
    radial-gradient(circle at 2px 2px, rgba(var(--glow-rgb), 0.05) 1px, transparent 0);
  background-size: 24px 24px;
  pointer-events: none;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.glitch-text {
  color: var(--glow-color);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 2px;
  position: relative;
  text-shadow: 0 0 8px rgba(var(--glow-rgb), 0.5);
}

.status-dot {
  width: 6px;
  height: 6px;
  background: var(--glow-color);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--glow-color);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}

.current-display {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: #fff;
}

.current-display .unit {
  font-size: 14px;
  color: rgba(var(--glow-rgb), 0.6);
  font-weight: 700;
}

.current-display .value {
  font-size: 24px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 300;
  letter-spacing: -1px;
}

.tank-container {
  display: flex;
  align-items: center;
  height: 60px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(var(--glow-rgb), 0.15);
  border-radius: 2px;
  padding: 0 4px;
}

.is-vertical .tank-container {
  flex-direction: column;
  height: 180px;
  padding: 8px 0;
}

.slider-area {
  flex: 1;
  width: 100%;
  height: 100%;
  position: relative;
  cursor: crosshair;
}

.preset-point {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 10;
  width: 4px;
  height: 4px;
  background: rgba(var(--glow-rgb), 0.25);
  border-radius: 50%;
}

.node-label {
  position: absolute;
  top: 50%;
  left: 14px;
  transform: translateY(-50%);
  font-size: 10px;
  color: rgba(var(--glow-rgb), 0.6);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
}

.indicator-knob {
  position: absolute;
  z-index: 30;
  pointer-events: none;
}

.track-wrapper {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
}

.is-vertical .track-wrapper {
  left: 50%; right: auto;
  width: 3px;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.1);
}

.track-fill {
  position: absolute;
  background: var(--glow-color);
  box-shadow: 0 0 15px rgba(var(--glow-rgb), 0.5);
}

.knob-marker {
  position: absolute;
  width: 14px;
  height: 14px;
  background: var(--glow-color);
  border: 1px solid #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 12px rgba(var(--glow-rgb), 0.6);
  left: 50%;
}

.scanner-brackets::before, .scanner-brackets::after {
  content: '';
  position: absolute;
  left: 0; right: 0;
  height: 1px;
  background: #00ffff;
}

.scanner-brackets::before { top: 0; }
.scanner-brackets::after { bottom: 0; }

/* Ruler Ticks */
.ruler-ticks {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
}

.is-vertical .ruler-ticks {
  flex-direction: column-reverse;
}

.tick {
  background: rgba(var(--glow-rgb), 0.2);
}

.tick:not(.is-vertical) {
  width: 1px;
  height: 8px;
}

.tick.major:not(.is-vertical) {
  height: 16px;
  background: rgba(var(--glow-rgb), 0.5);
}

.is-vertical .tick {
  height: 1px;
  width: 6px;
}

.is-vertical .tick.major {
  width: 12px;
  background: rgba(var(--glow-rgb), 0.6);
}

.panel-footer {
  margin-top: 25px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

.is-vertical .panel-footer {
  flex-direction: column;
  margin-top: 15px;
}

.vertical-header-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  color: #fff;
  margin-bottom: 12px;
  width: 100%;
}

.vertical-header-display .unit {
  font-size: 10px;
  color: var(--glow-color);
  font-weight: 800;
}

.vertical-header-display .value {
  font-size: 14px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  color: var(--glow-color);
  text-shadow: 0 0 8px rgba(var(--glow-rgb), 0.4);
}

.tron-btn {
  background: transparent;
  border: none;
  padding: 8px 16px;
  color: var(--glow-color);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
}

.btn-border {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  border: 1px solid rgba(var(--glow-rgb), 0.4);
  clip-path: polygon(0 0, 100% 0, 100% 70%, 85% 100%, 0 100%);
}

.tron-btn:hover {
  color: #fff;
  text-shadow: 0 0 10px #fff;
}

.tron-btn:hover .btn-border {
  border-color: var(--glow-color);
  background: rgba(var(--glow-rgb), 0.15);
}

</style>
