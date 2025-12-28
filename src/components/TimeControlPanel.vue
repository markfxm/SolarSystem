<template>
  <div class="time-panel">
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
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { t } from '../utils/i18n.js'

const emit = defineEmits(['speed-change'])

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
/* panel that contains the slider + current readout */
.time-panel {
  position: absolute;
  top: 20%;
  left: 20px;
  z-index: 120;
  pointer-events: auto;
}

/* visible panel - make relative so title can be absolutely positioned */
.panel {
  position: relative;                /* NEW: allow absolute title */
  background: rgba(18, 22, 40, 0.85);
  padding: 12px;                     /* compact base padding */
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

/* panel title: absolute and moved up so it never collides with top preset */
.panel-title {
  position: absolute;
  top: 8px;                          /* moved up */
  left: 50%;
  transform: translateX(-50%);
  color: #cfe8ff;
  font-size: 13px;
  font-weight: 700;
  user-select: none;
  pointer-events: none;
  z-index: 30;                        /* ensure it's above presets */
  margin: 0;
}

/* vertical slider area - push slider down so top endpoint is inside panel */
.slider-wrap {
  position: relative;
  width: 56px;
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  padding-top: 48px;                  /* NEW: extra top space to avoid title overlap */
  padding-bottom: 8px;
}

/* visible track: inset from top/bottom to match slider-wrap padding */
.slider-track {
  position: absolute;
  left: 50%;
  top: 48px;    /* align with slider-wrap padding-top */
  bottom: 8px;
  transform: translateX(-50%);
  width: 8px;
  background: linear-gradient(180deg, rgba(100,150,255,0.25), rgba(255,255,255,0.04));
  border-radius: 8px;
  box-shadow: inset 0 0 6px rgba(0,0,0,0.6);
  z-index: 1;
  border: 1px solid rgba(255,255,255,0.03);
}

/* knob: positioned left of the vertical track so the arrow points right */
.knob {
  position: absolute;
  /* place knob to the left of the centered track:
     track is centered at 50%, track half-width ~4px,
     shift left by about 40px so knob sits left of track */
  left: calc(50% - 40px);
  /* vertically center relative to bottom position */
  transform: translateY(-50%);
  width: 36px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  touch-action: none;
  pointer-events: auto;
  z-index: 60; /* ensure knob above presets */
}
.knob:active { cursor: grabbing; }

/* arrow shape using clip-path for clear right-pointing arrow */
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

/* small hover/press feedback */
.knob:hover .knob-arrow { transform: translateX(2px); }
.knob:active .knob-arrow { transform: translateX(4px); }

/* preset markers - centered ON the track */
.preset {
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%); /* center the dot exactly at position */
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
  z-index: 20; /* below knob but above track */
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
