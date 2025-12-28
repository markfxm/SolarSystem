<template>
  <!-- wrapper: hidden to left when closed, slides in when open -->
  <div class="panel-wrapper" :class="{ 'is-open': isOpen }" @click.stop>
    <!-- Toggle Button on the left edge (arrow points right when closed) -->
    <button
      class="toggle-button"
      @click.stop="togglePanel"
      :style="{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }"
      aria-label="toggle time panel"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M9 6L15 12L9 18" />
      </svg>
    </button>

    <!-- panel content (was .time-panel/.panel before) -->
    <div class="panel-content">
      <div class="panel">
        <div class="panel-title">{{ t('control.speed') }}</div>

        <div class="slider-wrap" ref="wrap" @mousedown.prevent="startDrag($event)" @touchstart.prevent="startDrag($event)">
          <div class="slider-track" ref="track" @click.stop="onTrackClick($event)"></div>

          <!-- preset markers (inclusive of endpoints now) -->
          <button
            class="preset"
            v-for="p in presets"
            :key="p.val"
            :style="{ bottom: (mapped(p.norm) * 100) + '%' }"
            @click.stop="setByPos(p.norm)"
            :title="p.label"
            aria-label="preset"
          >
            <span class="preset-dot"></span>
          </button>

          <!-- knob: arrow placed to the left of the track -->
          <div class="knob" :style="{ bottom: (mapped(pos) * 100) + '%' }" ref="knob" @mousedown.stop.prevent="startDrag($event)" @touchstart.stop.prevent="startDrag($event)">
            <div class="knob-arrow" aria-hidden="true"></div>
          </div>
        </div>

        <!-- current numeric display -->
        <div class="current">×{{ formattedMultiplier }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { t } from '../utils/i18n.js'

const emit = defineEmits(['speed-change'])

// NEW: open state for left-side collapsible panel
const isOpen = ref(false)
function togglePanel() {
  isOpen.value = !isOpen.value
}

// slider state: pos in [0,1], 0 => bottom (x1), 1 => top (1,000,000)
const pos = ref(0) // default at bottom => real time
const wrap = ref(null)
const track = ref(null)
const knob = ref(null)

const MIN = 1
const MAX = 1000000

// include endpoints (bottom/top) so snapping and clicking include them
// store logical positions as 'norm' (0..1). Display position will be compressed by mapped().
const presets = [
  { val: 1, norm: 0, label: 'x1' },
  { val: 250000, norm: (250000 - MIN) / (MAX - MIN), label: 'x250,000' },
  { val: 500000, norm: (500000 - MIN) / (MAX - MIN), label: 'x500,000' },
  { val: 750000, norm: (750000 - MIN) / (MAX - MIN), label: 'x750,000' },
  { val: 1000000, norm: 1, label: 'x1,000,000' }
]

// display mapping
const PAD_BOTTOM = 8 / 320; // Approximately 0.025, matching the track's bottom inset
const PAD_TOP = 81 / 320; // Approximately 0.253, adjusted for track top inset plus preset centering and height to avoid protrusion
function mapped(norm) {
  return PAD_BOTTOM + (1 - PAD_BOTTOM - PAD_TOP) * clamp(norm, 0, 1)
}

const multiplier = computed(() => {
  // linear mapping for presets simplicity
  const m = Math.round(MIN + pos.value * (MAX - MIN))
  return m
})

const formattedMultiplier = computed(() => {
  return multiplier.value.toLocaleString()
})

// emit initial state (real time)
emit('speed-change', multiplier.value)

let dragging = false
const SNAP_THRESHOLD = 0.03 // if within 3% of full range, snap to preset

function clamp(v, a = 0, b = 1) {
  return Math.max(a, Math.min(b, v))
}

function updatePosFromClientY(clientY) {
  const el = track.value || wrap.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const relative = (clientY - rect.top) / rect.height // 0 top -> 1 bottom
  const inverted = 1 - relative // want 0 bottom, 1 top
  pos.value = clamp(inverted, 0, 1)
  emit('speed-change', multiplier.value)
}

const initialPos = ref(0)
const initialClientY = ref(0)
function startDrag(e) {
  dragging = true
  addMoveListeners()
  initialClientY.value = e.touches ? e.touches[0].clientY : e.clientY
  initialPos.value = pos.value
}

function onMove(e) {
  if (!dragging) return
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  const el = track.value || wrap.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const deltaY = initialClientY.value - clientY // Positive delta moves up (higher pos)
  const scale = rect.height // Use track height for sensitivity
  const deltaNorm = deltaY / scale // Normalized delta (fraction of height)
  pos.value = clamp(initialPos.value + deltaNorm, 0, 1)
  emit('speed-change', multiplier.value)
}

function stopDrag() {
  if (!dragging) return
  dragging = false
  // snap to nearest preset if close enough
  snapToPreset()
  removeMoveListeners()
}

function snapToPreset() {
  if (!presets || presets.length === 0) return
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
    emit('speed-change', Math.round(MIN + pos.value * (MAX - MIN)))
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

function onTrackClick(e) {
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  updatePosFromClientY(clientY)
  snapToPreset() // if user clicks near a preset, snap immediately
}

function setByPos(p) {
  pos.value = clamp(p, 0, 1)
  emit('speed-change', multiplier.value)
}

onBeforeUnmount(() => {
  removeMoveListeners()
})
</script>

<style scoped>
/* wrapper that slides in/out from left */
.panel-wrapper {
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateX(-100%) translateY(-50%);
  z-index: 120;
  display: flex;
  transition: transform 0.45s cubic-bezier(0.25, 0.8, 0.25, 1);
  align-items: center;
  pointer-events: auto;
}

.panel-wrapper.is-open {
  transform: translateX(0) translateY(-50%);
}

/* toggle button (anchored to right edge of wrapper so it stays visible when hidden) */
.toggle-button {
  position: absolute;
  right: -48px; /* sticks outside the left edge when wrapper is translated */
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 96px;
  background: rgba(18, 22, 40, 0.95);
  border: 1px solid rgba(100, 150, 255, 0.4);
  border-left: none;
  border-radius: 0 12px 12px 0;
  color: #88ccff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 4px 4px 20px rgba(0, 0, 0, 0.6);
}
.toggle-button:hover { background: rgba(40, 60, 120, 0.95); color: #fff; }

/* panel content (holds the old .panel) */
.panel-content {
  background: transparent;
  border-radius: 12px;
  box-sizing: border-box;
}

/* visible panel - compact card */
.panel {
  position: relative;
  background: rgba(18, 22, 40, 0.85);
  padding: 12px;
  padding-bottom: 12px;
  border-radius: 12px;
  border: 1px solid rgba(100, 150, 255, 0.08);
  box-shadow: 0 6px 24px rgba(0,0,0,0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 92px;
  box-sizing: border-box;
}

/* panel title */
.panel-title {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  color: #cfe8ff;
  font-size: 13px;
  font-weight: 700;
  user-select: none;
  pointer-events: none;
  z-index: 30;
  margin: 0;
}

/* slider area */
.slider-wrap {
  position: relative;
  width: 56px;
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  padding-top: 48px;
  padding-bottom: 8px;
}

.slider-track {
  position: absolute;
  left: 50%;
  top: 48px;
  bottom: 8px;
  transform: translateX(-50%);
  width: 8px;
  background: linear-gradient(180deg, rgba(100,150,255,0.25), rgba(255,255,255,0.04));
  border-radius: 8px;
  box-shadow: inset 0 0 6px rgba(0,0,0,0.6);
  z-index: 1;
  border: 1px solid rgba(255,255,255,0.03);
}

/* knob & arrow */
.knob {
  position: absolute;
  left: calc(50% - 40px);
  transform: translateY(-50%);
  width: 36px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  touch-action: none;
  pointer-events: auto;
  z-index: 60;
}
.knob:active { cursor: grabbing; }

.knob-arrow {
  width: 28px;
  height: 16px;
  background: linear-gradient(90deg, #2b6ef6, #64b5f6);
  -webkit-clip-path: polygon(0 0, 76% 0, 100% 50%, 76% 100%, 0 100%);
  clip-path: polygon(0 0, 76% 0, 100% 50%, 76% 100%, 0 100%);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(30,100,220,0.35);
  border: 1px solid rgba(255,255,255,0.06);
  transition: transform .08s ease;
}
.knob:hover .knob-arrow { transform: translateX(2px); }
.knob:active .knob-arrow { transform: translateX(4px); }

/* presets */
.preset {
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  z-index: 20;
}
.preset-dot {
  width: 10px;
  height: 10px;
  background: linear-gradient(90deg, #88bfff, #2b6ef6);
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(43,110,246,0.22);
  border: 1px solid rgba(255,255,255,0.06);
}

/* current display */
.current {
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  user-select: none;
}
</style>
