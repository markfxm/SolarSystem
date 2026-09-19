<script setup>
import { ref, onUnmounted, computed, watch } from 'vue';

const props = defineProps({
  isVisible: Boolean,
  signalPos: { type: Object, default: () => ({ x: 80, z: -180 }) },
  planetId: String,
  planetName: String,
  playerPos: {
    type: Object,
    default: () => ({ x: 0, y: 0, z: 0 })
  },
  playerYaw: {
    type: Number,
    default: 0
  },
  explorationPath: {
    type: Array,
    default: () => []
  },
  landerPos: {
    type: Object,
    default: () => ({ x: 0, z: -10 })
  }
})

import { t } from '../../utils/i18n'

const emit = defineEmits(['exit', 'clear-path', 'continue'])

const isExpanded = ref(false)
const targetDistance = computed(() => Math.round(Math.hypot(props.signalPos.x - props.playerPos.x, props.signalPos.z - props.playerPos.z)))
const handleMapKey = (event) => {
  if (props.isVisible && event.key.toLowerCase() === 'm') toggleExpand()
}
window.addEventListener('keydown', handleMapKey)

const MARS_RADIUS = 3389500; // meters
const DEG_PER_METER = 180 / (Math.PI * MARS_RADIUS);
const BASE_LAT = 18.65;
const BASE_LON = 226.2;

const currentLat = computed(() => {
  // In our engine, -Z is North
  const lat = BASE_LAT + (-props.playerPos.z * DEG_PER_METER);
  const suffix = lat >= 0 ? 'N' : 'S';
  return `${Math.abs(lat).toFixed(4)}° ${suffix}`;
})

const currentLon = computed(() => {
  // X is East
  const lon = (BASE_LON + (props.playerPos.x * DEG_PER_METER) + 360) % 360;
  return `${lon.toFixed(4)}° E`;
})

const zoomLevel = ref(0.4) // Base zoom
const canvasRef = ref(null)

// i18n Caching: Pre-translate static labels to avoid lookup overhead in the 60fps loop
const labels = computed(() => ({
  start: t('mars.start'),
  north: t('mars.north'),
  south: t('mars.south'),
  west: t('mars.west'),
  east: t('mars.east'),
  location: t('mars.location'),
  surface: t('mars.surface'),
  lat: t('mars.lat'),
  lon: t('mars.lon'),
  resetPath: t('mars.reset_path'),
  mapHintExpanded: t('mars.map_hint_expanded'),
  mapHintCollapsed: t('mars.map_hint_collapsed')
}))

const MAP_SIZE = 220
const EXPANDED_MAP_SIZE = 500

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

const handleWheel = (e) => {
  if (!isExpanded.value) return
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  zoomLevel.value = Math.max(0.1, Math.min(10, zoomLevel.value * delta))
}

// Cache canvas context at component level to avoid redundant lookups in the 60fps loop
let cachedCtx = null;

// Performance Optimization: Track last state to skip redundant draws when stationary
const lastState = {
  px: 0,
  pz: 0,
  yaw: 0,
  zoom: 1,
  expanded: false,
  pathLen: 0
}

const drawMap = (force = false) => {
  const canvas = canvasRef.value
  if (!canvas) return
  if (!cachedCtx) cachedCtx = canvas.getContext('2d', { alpha: true });
  const ctx = cachedCtx;

  // Capture reactive values into local variables to minimize proxy overhead
  const expanded = isExpanded.value;
  const size = expanded ? EXPANDED_MAP_SIZE : MAP_SIZE
  const zoom = zoomLevel.value
  const path = props.explorationPath
  const px = props.playerPos?.x ?? 0
  const pz = props.playerPos?.z ?? 0
  const pyaw = props.playerYaw
  const lx = props.landerPos?.x ?? 0
  const lz = props.landerPos?.z ?? 0

  // Dirty check: Only redraw if state changed or forced (e.g. resize)
  if (!force &&
      lastState.px === px &&
      lastState.pz === pz &&
      lastState.yaw === pyaw &&
      lastState.zoom === zoom &&
      lastState.expanded === expanded &&
      lastState.pathLen === path.length) {
    return
  }

  // Update last state
  lastState.px = px
  lastState.pz = pz
  lastState.yaw = pyaw
  lastState.zoom = zoom
  lastState.expanded = expanded
  lastState.pathLen = path.length

  // Ensure canvas dimensions match the internal size (Fixes rectangle bug on first load)
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size
    canvas.height = size
    // Reset context on resize (using consistent alpha option)
    cachedCtx = canvas.getContext('2d', { alpha: true });
  }

  ctx.clearRect(0, 0, size, size)

  // Background
  ctx.fillStyle = 'rgba(0, 20, 40, 0.6)'
  ctx.fillRect(0, 0, size, size)

  // Grid
  ctx.strokeStyle = 'rgba(0, 163, 255, 0.2)'
  ctx.lineWidth = 1
  const gridSize = 50 * zoom
  const offsetX = ((-px * zoom) % gridSize + gridSize) % gridSize
  const offsetZ = ((-pz * zoom) % gridSize + gridSize) % gridSize

  ctx.beginPath()
  for (let x = offsetX; x < size; x += gridSize) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, size)
  }
  for (let y = offsetZ; y < size; y += gridSize) {
    ctx.moveTo(0, y)
    ctx.lineTo(size, y)
  }
  ctx.stroke()

  const centerX = size / 2
  const centerY = size / 2

  // Draw Path
  if (path.length > 0) {
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)'
    ctx.setLineDash([5, 5])
    ctx.lineWidth = 2

    // Only show recent path on small map, or full path on expanded?
    const startIdx = expanded ? 0 : Math.max(0, path.length - 50)

    // Optimized path drawing: Inline coordinate transformation to avoid object allocations
    for (let i = startIdx; i < path.length; i++) {
      const p = path[i]
      const mx = centerX + (p.x - px) * zoom
      const my = centerY + (p.z - pz) * zoom
      if (i === startIdx) ctx.moveTo(mx, my)
      else ctx.lineTo(mx, my)
    }
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Draw Start (Lander) - inline worldToMap logic
  const startPosMX = centerX + (lx - px) * zoom
  const startPosMY = centerY + (lz - pz) * zoom
  ctx.fillStyle = '#ff0000'
  ctx.beginPath()
  ctx.arc(startPosMX, startPosMY, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = '10px Arial'
  ctx.textAlign = 'left'
  ctx.fillText(labels.value.start, startPosMX + 6, startPosMY + 4)

  const signalX = Math.max(18, Math.min(size - 18, centerX + (props.signalPos.x - px) * zoom))
  const signalY = Math.max(25, Math.min(size - 25, centerY + (props.signalPos.z - pz) * zoom))
  ctx.strokeStyle = '#91dcff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(signalX, signalY, 6, 0, Math.PI * 2)
  ctx.stroke()

  // Draw Player Marker (Always at center because we are centering on player)
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(-props.playerYaw) // North is up, so we rotate the marker by yaw

  ctx.fillStyle = '#00A3FF'
  ctx.beginPath()
  ctx.moveTo(0, -8)
  ctx.lineTo(-6, 6)
  ctx.lineTo(6, 6)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // Labels
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.font = '10px monospace'
  ctx.textAlign = 'center'

  // N S W E
  ctx.fillText(labels.value.north, centerX, 15)
  ctx.fillText(labels.value.south, centerX, size - 10)
  ctx.fillText(labels.value.west, 10, centerY + 4)
  ctx.fillText(labels.value.east, size - 15, centerY + 4)

  if (expanded) {
    const dist = Math.sqrt((px - lx) * (px - lx) + (pz - lz) * (pz - lz)).toFixed(1)
    ctx.textAlign = 'left'
    // Dynamic translation: still involves lookup but only when expanded and once per frame
    ctx.fillText(t('mars.dist_start', { dist }), 10, size - 25)
  }
}

let animationFrame
const loop = () => {
  drawMap()
  animationFrame = requestAnimationFrame(loop)
}

const startLoop = () => {
  if (!animationFrame) {
    loop()
  }
}

const stopLoop = () => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
}

// Optimization: Start/Stop rendering loop based on visibility to save CPU/GPU when idle
watch(() => props.isVisible, (visible) => {
  if (visible) startLoop()
  else stopLoop()
}, { immediate: true })

onUnmounted(() => {
  stopLoop()
  window.removeEventListener('keydown', handleMapKey)
})
</script>

<template>
  <Transition name="fade">
    <div v-if="isVisible" class="planet-surface-hud">
      <!-- Location Drawer Overlay (Positioned below Zodiac button) -->
      <div class="location-drawer-container">
        <div class="location-panel">
          <div class="label">{{ labels.location }}</div>
          <div class="value">{{ planetName }} {{ labels.surface }}</div>
          <div class="coords">
            {{ labels.lat }}: {{ currentLat }} | {{ labels.lon }}: {{ currentLon }}
          </div>

          <section class="mission-section">
            <div class="label">{{ t('mars.mission') }}</div>
            <h2>{{ targetDistance < 15 ? t('mars.signal_found') : t('mars.investigate') }}</h2>
            <p>{{ t('mars.mission_desc') }}</p>
          </section>
          <section class="suit-section">
            <div class="label">{{ t('mars.suit_status') }}</div>
            <div class="telemetry"><span>O₂</span><span>98%<meter min="0" max="100" value="98" /></span></div>
            <div class="telemetry"><span>{{ t('mars.pressure') }}</span><span>0.98 atm<meter min="0" max="1" value="0.98" /></span></div>
            <div class="telemetry"><span>{{ t('mars.radiation') }}</span><span>0.12 mSv/h<meter min="0" max="1" value="0.12" /></span></div>
            <div class="telemetry"><span>{{ t('mars.temperature') }}</span><span>−52°C</span></div>
          </section>
          <div class="target-distance">{{ t('mars.target_distance') }} <strong>{{ targetDistance }} m</strong></div>
          <div v-if="planetId === 'mars'" class="history-actions">
            <button class="clear-btn" @click="$emit('clear-path')">{{ labels.resetPath }}</button>
          </div>
        </div>
      </div>

      <!-- Minimap -->
      <div
        v-if="planetId === 'mars'"
        class="minimap-wrapper"
        :class="{ expanded: isExpanded }"
      >
        <div
          class="minimap-container"
          role="button"
          tabindex="0"
          :aria-label="labels.mapHintCollapsed"
          :aria-expanded="isExpanded"
          @keydown.enter="toggleExpand"
          @keydown.space.prevent="toggleExpand"
          @click="toggleExpand"
          @wheel.prevent="handleWheel"
        >
          <canvas ref="canvasRef"></canvas>
        </div>
        <div class="map-hint">{{ isExpanded ? labels.mapHintExpanded : labels.mapHintCollapsed }}</div>
      </div>

      <div class="crosshair" aria-hidden="true">·</div>
      <div class="expedition-actions">
        <div class="control-hint">{{ t('mars.controls') }}</div>
        <div class="action-row">
          <button class="continue-button" @click="emit('continue')">{{ t('mars.continue') }} <span aria-hidden="true">→</span></button>
          <button @click="emit('exit')">{{ t('mars.return_orbit') }}</button>
        </div>
      </div>
      <!-- Scanline / Sci-fi Overlay Effect -->
      <div class="scanlines"></div>
      <div class="vignette"></div>
    </div>
  </Transition>
</template>

<style scoped>
.planet-surface-hud {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Inter', 'Outfit', sans-serif;
  overflow: hidden;
}

/* Container to handle hover state for the partial-hidden panel */
.location-drawer-container {
  position: absolute;
  top: 48px; /* Directly below Zodiac toggle */
  left: 24px; /* Align to screen edge */
  pointer-events: auto; /* Allow hovering */
  display: flex;
  align-items: center;
  transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
}

.location-panel {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  padding: 10px 18px;
  border-left: 4px solid #00A3FF; /* Thicker border */
  border-radius: 0 6px 6px 0;
  box-shadow: 10px 0 30px rgba(0, 0, 0, 0.3);
  
  /* Permanently visible */
  transform: translateX(0);
  transition: transform 0.8s cubic-bezier(0.19, 1, 0.22, 1);
}

.location-panel .label {
  font-size: 9px;
  letter-spacing: 1.5px;
  opacity: 0.6;
}

.location-panel .value {
  font-size: 16px;
  font-weight: 700;
  margin: 4px 0;
  text-transform: uppercase;
  color: #fff;
  white-space: nowrap;
}

.location-panel .coords {
  font-size: 11px;
  font-family: 'Courier New', Courier, monospace;
  opacity: 0.5;
  white-space: nowrap;
  margin-bottom: 8px;
}

.history-actions {
  margin-top: 10px;
  pointer-events: auto;
}

.clear-btn {
  background: rgba(255, 50, 50, 0.2);
  border: 1px solid rgba(255, 50, 50, 0.4);
  color: #ffaaaa;
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: rgba(255, 50, 50, 0.4);
}

.minimap-wrapper {
  position: absolute;
  top: 60px;
  right: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
  transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
}

.minimap-wrapper.expanded {
  top: 50%;
  right: 50%;
  transform: translate(50%, -50%);
}

.minimap-container {
  border: 2px solid rgba(0, 163, 255, 0.5);
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  overflow: hidden;
  pointer-events: auto;
  cursor: pointer;
  transition: border-color 0.4s;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}

.expanded .minimap-container {
  border-color: #00A3FF;
}

.map-hint {
  font-size: 10px;
  opacity: 0.5;
  color: #fff;
  text-shadow: 0 0 4px rgba(0,0,0,0.5);
  white-space: nowrap;
}

/* Sci-fi Overlay Effects */
.scanlines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    rgba(18, 16, 16, 0) 50%,
    rgba(0, 0, 0, 0.1) 50%
  );
  background-size: 100% 4px;
  z-index: -1;
  opacity: 0.05;
  pointer-events: none;
}

.vignette {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, transparent 40%, rgba(0, 0, 0, 0.3) 100%);
  pointer-events: none;
  z-index: -1;
}

/* Animations */
/* Vue Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<style scoped>
.location-panel { width: 276px; padding: 22px; border-left: 3px solid #f08045; border-radius: 12px; background: rgba(19, 24, 28, .78); box-sizing: border-box; }
.location-panel .label { color: #a8c5d5; opacity: 1; font-size: 10px; letter-spacing: 1.6px; }
.location-panel .value { font-size: 19px; margin: 9px 0; }
.location-panel .coords { font-size: 10px; opacity: .8; white-space: normal; line-height: 1.7; }
.mission-section, .suit-section { border-top: 1px solid #ffffff30; margin-top: 21px; padding-top: 20px; }
h2 { font-size: 16px; font-weight: 500; margin: 12px 0 8px; color: #e4f5ff; }
.mission-section p { font-size: 12px; line-height: 1.65; color: #b7c4cc; margin: 0; }
.telemetry { display: flex; justify-content: space-between; font-size: 12px; margin-top: 16px; gap: 16px; }
.telemetry > span:last-child { width: 90px; }
meter { display: block; width: 100%; height: 7px; margin-top: 5px; }
meter::-webkit-meter-bar { background: #405566; border: 0; }
meter::-webkit-meter-optimum-value { background: #8dd9ff; }
.target-distance { display: flex; justify-content: space-between; border-top: 1px solid #ffffff30; margin-top: 20px; padding-top: 18px; font-size: 12px; }
.clear-btn { border: 0; color: #9aaebc; background: transparent; padding: 0; font-size: 10px; }
.crosshair { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); border: 1px solid #d4efffa0; border-radius: 50%; width: 34px; height: 34px; text-align: center; line-height: 30px; color: white; }
.expedition-actions { position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%); text-align: center; }
.control-hint { color: #d0d9dd; font-size: 10px; letter-spacing: 1px; margin-bottom: 14px; text-shadow: 0 2px 5px #000; }
.action-row { display: flex; gap: 12px; }
.action-row button { pointer-events: auto; border: 1px solid #8196a9; border-radius: 30px; background: #172332dc; color: #edf7ff; padding: 14px 24px; font: inherit; font-size: 14px; white-space: nowrap; cursor: pointer; }
.action-row .continue-button { border-color: #8bd8ff; box-shadow: inset 0 0 18px #277ead30, 0 0 20px #0005; }
.action-row button:hover { background: #284d65; }
button:focus-visible, [role=button]:focus-visible { outline: 2px solid #a9e4ff; outline-offset: 4px; }
.minimap-container { border-width: 1px; border-radius: 14px; }
.minimap-container canvas { display: block; max-width: min(500px, 85vw); max-height: 70vh; }
@media (max-width: 700px) {
  .location-drawer-container { top: 18px; left: 12px; }
  .location-panel { width: 205px; padding: 14px; }
  .location-panel .value { font-size: 15px; }
  .mission-section, .suit-section { margin-top: 12px; padding-top: 12px; }
  .telemetry { margin-top: 10px; font-size: 11px; }
  .minimap-wrapper:not(.expanded) { top: 65px; right: 12px; }
  .minimap-wrapper:not(.expanded) canvas { width: 115px; height: 115px; }
  .map-hint { max-width: 120px; white-space: normal; text-align: center; }
  .expedition-actions { bottom: 20px; width: 95%; }
  .action-row { justify-content: center; gap: 8px; }
  .action-row button { padding: 12px 14px; font-size: 12px; }
}
@media (max-height: 600px) { .suit-section { display: none; } .location-panel { padding: 14px; } }
</style>
