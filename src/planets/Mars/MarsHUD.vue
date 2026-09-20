<script setup>
import { ref, onUnmounted, computed, watch } from 'vue';
import LanguagePanel from '../../components/LanguagePanel.vue'

const props = defineProps({
  isVisible: Boolean,
  vehicle: { type: Object, default: () => ({ mode: 'ON_FOOT', speed: 0, canEnter: false }) },
  controlMode: { type: String, default: 'ui' },
  baseMarker: { type: Object, default: () => ({ visible: false }) },
  mission: { type: Object, default: () => ({ stage: 'approach', progress: 0 }) },
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

const emit = defineEmits(['exit', 'clear-path', 'continue', 'open-ui'])

const isExpanded = ref(false)
const miniMapVisible = ref(true)
const hasSeenControls = ref(false)
try { hasSeenControls.value = localStorage.getItem('hasSeenMarsControls') === 'true' } catch {}
watch(() => props.controlMode, mode => {
  if (mode === 'explore') {
    isExpanded.value = false
    hasSeenControls.value = true
    try { localStorage.setItem('hasSeenMarsControls', 'true') } catch {}
  }
})
watch(() => props.isVisible, () => {
  isExpanded.value = false
  miniMapVisible.value = true
  mapOffset.x = 0; mapOffset.z = 0
  waypoint = null
  mapDrag = null
})
const showCompletionNotice = ref(false)
watch(() => props.mission.completedCount, (count, _previous, onCleanup) => {
  showCompletionNotice.value = count > 0
  if (!showCompletionNotice.value) return
  const timeout = window.setTimeout(() => { showCompletionNotice.value = false }, 5000)
  onCleanup(() => window.clearTimeout(timeout))
}, { immediate: true })
const returning = computed(() => ['return', 'upload'].includes(props.mission.stage))
const target = computed(() => props.mission.activeTarget?.position || props.signalPos)
const signalLabel = computed(() => props.mission.signalLabel ? t(props.mission.signalLabel) : '')
const scanPrompt = computed(() => props.mission.scanTarget ? t(props.mission.scanTarget.prompt, { signal: signalLabel.value }) : '')
const interactionPrompt = computed(() => props.mission.activeTarget ? t(props.mission.activeTarget.prompt, { signal: signalLabel.value }) : '')
const targetLabel = computed(() => returning.value ? t('mars.base_terminal') : signalLabel.value)
const objective = computed(() => {
  if (['ready', 'upload'].includes(props.mission.stage)) return interactionPrompt.value
  const key = { approach: 'investigate_target', scanning: 'scanning_target', return: 'return_base', complete: 'mission_complete_number' }[props.mission.stage] || 'investigate_target'
  return t('mars.' + key, { signal: signalLabel.value, number: props.mission.number })
})
const targetDistance = computed(() => Math.round(Math.hypot(target.value.x - props.playerPos.x, target.value.z - props.playerPos.z)))
const handleMapKey = (event) => {
  if (!props.isVisible || event.repeat || event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
  if (event.key.toLowerCase() === 'm') {
    if (isExpanded.value) toggleExpand()
    else miniMapVisible.value = !miniMapVisible.value
  }
  if (event.key.toLowerCase() === 'f') toggleExpand()
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
const mapOffset = { x: 0, z: 0 }
let mapDrag = null
let waypoint = null
function mapPointerDown(event) {
  if (!isExpanded.value || event.button !== 0) return
  event.currentTarget.setPointerCapture(event.pointerId)
  mapDrag = { x: event.clientX, y: event.clientY, moved: false }
}
function mapPointerMove(event) {
  if (!mapDrag) return
  const rect = canvasRef.value.getBoundingClientRect()
  const dx = event.clientX - mapDrag.x, dy = event.clientY - mapDrag.y
  if (!mapDrag.moved && Math.hypot(dx, dy) < 4) return
  mapDrag.moved = true
  mapOffset.x -= dx * EXPANDED_MAP_SIZE / rect.width / zoomLevel.value
  mapOffset.z -= dy * EXPANDED_MAP_SIZE / rect.height / zoomLevel.value
  mapDrag.x = event.clientX; mapDrag.y = event.clientY
  drawMap(true)
}
function mapPointerUp(event) {
  if (!mapDrag) return
  if (!mapDrag.moved) {
    const rect = canvasRef.value.getBoundingClientRect()
    waypoint = {
      x: props.playerPos.x + mapOffset.x + ((event.clientX - rect.left) / rect.width - 0.5) * EXPANDED_MAP_SIZE / zoomLevel.value,
      z: props.playerPos.z + mapOffset.z + ((event.clientY - rect.top) / rect.height - 0.5) * EXPANDED_MAP_SIZE / zoomLevel.value,
    }
  }
  mapDrag = null
  drawMap(true)
}

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
  if (props.controlMode === 'paused') return
  if (isExpanded.value) emit('open-ui')
  else emit('continue')
}

const handleWheel = (e) => {
  if (!isExpanded.value) return
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  zoomLevel.value = Math.max(0.1, Math.min(10, zoomLevel.value * delta))
}

// Cache canvas context at component level to avoid redundant lookups in the 60fps loop
let cachedCtx = null;
watch(canvasRef, () => { cachedCtx = null; if (canvasRef.value) drawMap(true) }, { flush: 'post' })

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
  const px = (props.playerPos?.x ?? 0) + (expanded ? mapOffset.x : 0)
  const pz = (props.playerPos?.z ?? 0) + (expanded ? mapOffset.z : 0)
  const pyaw = props.playerYaw
  const lx = props.landerPos?.x ?? 0
  const lz = props.landerPos?.z ?? 0

  // Dirty check: Only redraw if state changed or forced (e.g. resize)
  if (!force &&
      lastState.targetX === target.value.x &&
      lastState.targetZ === target.value.z &&
      lastState.targetLabel === targetLabel.value &&
      lastState.px === px &&
      lastState.pz === pz &&
      lastState.yaw === pyaw &&
      lastState.zoom === zoom &&
      lastState.expanded === expanded &&
      lastState.pathLen === path.length) {
    return
  }

  // Update last state
  lastState.targetX = target.value.x
  lastState.targetZ = target.value.z
  lastState.targetLabel = targetLabel.value
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

  const signalX = Math.max(18, Math.min(size - 18, centerX + (target.value.x - px) * zoom))
  const signalY = Math.max(25, Math.min(size - 25, centerY + (target.value.z - pz) * zoom))
  ctx.strokeStyle = '#91dcff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(signalX, signalY, 6, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillText(targetLabel.value, Math.min(size - 65, signalX + 10), signalY - 10)

  // Draw Player Marker (Always at center because we are centering on player)
  ctx.save()
  ctx.translate(centerX + (props.playerPos.x - px) * zoom, centerY + (props.playerPos.z - pz) * zoom)
  ctx.rotate(-props.playerYaw) // North is up, so we rotate the marker by yaw

  ctx.fillStyle = '#00A3FF'
  ctx.beginPath()
  ctx.moveTo(0, -8)
  ctx.lineTo(-6, 6)
  ctx.lineTo(6, 6)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  if (waypoint) {
    ctx.strokeStyle = '#ffdf80'
    ctx.beginPath()
    ctx.arc(centerX + (waypoint.x - px) * zoom, centerY + (waypoint.z - pz) * zoom, 5, 0, Math.PI * 2)
    ctx.stroke()
  }

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
    const dist = Math.hypot(props.playerPos.x - lx, props.playerPos.z - lz).toFixed(1)
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
            <div class="label">{{ t('mars.mission_number', { number: mission.number }) }}</div>
            <h2>{{ objective }}</h2>
            <p>{{ t('mars.mission_desc') }}</p>
            <div class="mission-status" role="status" aria-live="polite">
              <div :class="{ active: mission.stage === 'approach' }" :aria-current="mission.stage === 'approach' ? 'step' : undefined">{{ mission.stage === 'approach' ? '○' : '✓' }} {{ t('mars.reach_target', { signal: signalLabel }) }}</div>
              <div :class="{ active: ['ready', 'scanning'].includes(mission.stage) }" :aria-current="['ready', 'scanning'].includes(mission.stage) ? 'step' : undefined">{{ mission.discovered ? '✓' : '○' }} {{ scanPrompt }}</div>
              <div :class="{ active: mission.stage === 'return' }" :aria-current="mission.stage === 'return' ? 'step' : undefined">{{ ['upload', 'complete'].includes(mission.stage) ? '✓' : '○' }} {{ t('mars.return_base') }}</div>
              <div :class="{ active: mission.stage === 'upload' }" :aria-current="mission.stage === 'upload' ? 'step' : undefined">{{ mission.stage === 'complete' ? '✓' : '○' }} {{ t('mars.upload_data') }}</div>
              <p v-if="mission.discovered">{{ t(mission.discoveryKey) }}</p>
            </div>
          </section>
          <section class="suit-section">
            <div class="label">{{ t('mars.suit_status') }}</div>
            <div class="telemetry"><span>O₂</span><span>98%<meter min="0" max="100" value="98" /></span></div>
            <div class="telemetry"><span>{{ t('mars.pressure') }}</span><span>0.98 atm<meter min="0" max="1" value="0.98" /></span></div>
            <div class="telemetry"><span>{{ t('mars.radiation') }}</span><span>0.12 mSv/h<meter min="0" max="1" value="0.12" /></span></div>
            <div class="telemetry"><span>{{ t('mars.temperature') }}</span><span>−52°C</span></div>
          </section>
          <div class="target-distance">{{ returning ? t('mars.distance_base') : targetLabel }} <strong>{{ targetDistance }} m</strong></div>
          <div v-if="planetId === 'mars'" class="history-actions">
            <button class="clear-btn" @click="$emit('clear-path')">{{ labels.resetPath }}</button>
          </div>
        </div>
      </div>

      <!-- Minimap -->
      <div
        v-if="planetId === 'mars' && (miniMapVisible || isExpanded)"
        class="minimap-wrapper"
        :class="{ expanded: isExpanded }"
      >
        <div
          class="minimap-container"
          role="button"
          tabindex="0"
          :aria-label="isExpanded ? labels.mapHintExpanded : labels.mapHintCollapsed"
          :aria-expanded="isExpanded"
          @keydown.enter.self="toggleExpand"
          @keydown.space.prevent.self="toggleExpand"
          @click="!isExpanded && toggleExpand()"
          @wheel.prevent="handleWheel"
          @pointerdown="mapPointerDown"
          @pointermove="mapPointerMove"
          @pointerup="mapPointerUp"
          @pointercancel="mapDrag = null"
          @lostpointercapture="mapDrag = null"
        >
          <canvas ref="canvasRef"></canvas>
        </div>
        <div class="map-hint">{{ isExpanded ? labels.mapHintExpanded : labels.mapHintCollapsed }}</div>
        <button v-if="isExpanded" class="map-action" @click="toggleExpand">{{ t(controlMode === 'paused' ? 'mars.close_map_paused' : 'mars.close_map') }}</button>
        <button v-if="isExpanded" class="map-action" @click="emit('clear-path')">{{ labels.resetPath }}</button>
      </div>

      <div v-if="baseMarker.visible && returning" class="base-world-marker" :style="{ left: baseMarker.x + '%', top: baseMarker.y + '%' }">
        ◉ {{ t('mars.base_terminal') }}<small>{{ targetDistance }} m</small>
      </div>
      <div v-if="controlMode === 'explore'" class="crosshair" aria-hidden="true">·</div>
      <div class="expedition-actions">
        <div v-if="vehicle.mode === 'IN_VEHICLE'" class="scan-feedback" role="status">
          NOMAD · {{ Math.round(Math.abs(vehicle.speed) * 3.6) }} km/h · E · {{ t('mars.vehicle_exit') }}
          <span v-if="vehicle.exitBlocked"> — {{ t('mars.vehicle_blocked') }}</span>
        </div>
        <div v-else-if="vehicle.canEnter && controlMode === 'explore'" class="scan-button">E · {{ t('mars.vehicle_enter') }}</div>
        <div v-else-if="mission.stage === 'scanning'" class="scan-feedback">
          {{ objective }} {{ Math.round(mission.progress * 100) }}% {{ mission.paused ? t('mars.paused') : '' }}
          <progress :value="mission.progress" max="1" :aria-label="objective"></progress>
        </div>
        <div v-else-if="['ready', 'upload'].includes(mission.stage) && controlMode === 'explore'" class="scan-button" :class="{ 'upload-button': mission.stage === 'upload' }">E · {{ interactionPrompt }}</div>
        <div v-if="showCompletionNotice" class="scan-feedback" role="status">{{ t('mars.data_uploaded') }}</div>
        <div v-if="!isExpanded && controlMode === 'explore'" class="control-hint">{{ t('mars.controls') }}</div>
      </div>
      <section v-if="controlMode === 'paused'" class="pause-bar" :aria-label="t('mars.pause_title')">
        <span role="status">{{ t('mars.pause_title') }}</span>
        <div class="action-row">
          <button class="continue-button" @click="emit('continue')">{{ t('mars.continue') }}</button>
          <button @click="emit('exit')">{{ t('mars.return_orbit') }}</button>
        </div>
      </section>
      <div v-if="controlMode === 'ui' && !isExpanded" class="control-overlay">
        <section class="control-panel" role="dialog" aria-modal="true" :aria-label="t('mars.surface')">
          <h2>{{ t('mars.surface') }}</h2>
          <p v-if="!hasSeenControls">{{ t('mars.onboarding') }}</p>
          <details :open="!hasSeenControls">
            <summary>{{ t('mars.control_help') }}</summary>
            <p>{{ t('mars.control_details') }}</p>
          </details>
          <details><summary>{{ t('mars.settings') }}</summary><LanguagePanel /></details>
          <div class="action-row">
            <button class="continue-button" @click="emit('continue')">{{ t(hasSeenControls ? 'mars.continue' : 'mars.start_exploring') }}</button>
            <button @click="emit('exit')">{{ t('mars.return_orbit') }}</button>
          </div>
        </section>
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

<style scoped>
.location-panel { max-height: calc(100vh - 120px); overflow-y: auto; }
.mission-status .active { color: #d7f5ff; background: #1b465c; border-left: 2px solid #68ccff; padding-left: 5px; }
.base-world-marker { position: absolute; transform: translate(-50%, -100%); padding: 6px 10px; border: 1px solid #68ccff; border-radius: 12px; background: #091a29d9; color: #d7f5ff; text-align: center; pointer-events: none; }
.base-world-marker small { display: block; margin-top: 3px; }
.mission-status { font-size: 12px; line-height: 1.7; color: #b8d9e5; }
.mission-status p { font-size: 12px; margin: 8px 0 0; }
.scan-feedback, .scan-button { color: #b9eeff; background: #091a29e8; border: 1px solid #68ccff; border-radius: 8px; padding: 10px 18px; margin-bottom: 10px; }
.scan-feedback progress { display: block; width: 100%; height: 5px; margin-top: 8px; accent-color: #68ccff; }
.control-overlay { position: absolute; inset: 0; display: grid; place-items: center; background: #09121b99; pointer-events: auto; }
.control-panel { width: min(440px, 90vw); max-height: 85vh; overflow-y: auto; box-sizing: border-box; padding: 28px; border: 1px solid #8196a9; border-radius: 16px; background: #172332f5; }
.control-panel p { font-size: 13px; line-height: 1.8; white-space: pre-line; }
.control-panel details { margin: 16px 0; }
.control-panel summary { cursor: pointer; }
.control-panel .action-row { flex-wrap: wrap; margin-top: 20px; }
.map-action { pointer-events: auto; margin-top: 8px; padding: 8px 14px; color: #edf7ff; background: #172332; border: 1px solid #8196a9; border-radius: 8px; cursor: pointer; }
.expanded .minimap-container { touch-action: none; cursor: crosshair; }
.pause-bar { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 12px; padding: 8px 12px; border: 1px solid #8196a9; border-radius: 12px; background: #172332ed; pointer-events: auto; }
.pause-bar > span { font-size: 12px; white-space: nowrap; color: #d7f5ff; }
.pause-bar .action-row { gap: 8px; }
.pause-bar .action-row button { padding: 8px 12px; font-size: 12px; }
@media (max-width: 700px) { .pause-bar { top: auto; bottom: 12px; max-width: calc(100vw - 24px); flex-wrap: wrap; justify-content: center; } }
</style>
