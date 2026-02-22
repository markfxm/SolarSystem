<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

const props = defineProps({
  isVisible: Boolean,
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

import { t } from '../utils/i18n.js'

const emit = defineEmits(['exit', 'clear-path'])

const isExpanded = ref(false)

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

const zoomLevel = ref(1) // Base zoom
const canvasRef = ref(null)

const MAP_SIZE = 180
const EXPANDED_MAP_SIZE = 500

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

const handleWheel = (e) => {
  if (!isExpanded.value) return
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  zoomLevel.value = Math.max(0.1, Math.min(10, zoomLevel.value * delta))
}

const drawMap = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const size = isExpanded.value ? EXPANDED_MAP_SIZE : MAP_SIZE

  // Ensure canvas dimensions match the internal size (Fixes rectangle bug on first load)
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size
    canvas.height = size
  }

  ctx.clearRect(0, 0, size, size)

  // Background
  ctx.fillStyle = 'rgba(0, 20, 40, 0.6)'
  ctx.fillRect(0, 0, size, size)

  // Safety checks
  const px = props.playerPos?.x ?? 0
  const pz = props.playerPos?.z ?? 0
  const lx = props.landerPos?.x ?? 0
  const lz = props.landerPos?.z ?? 0

  // Grid
  ctx.strokeStyle = 'rgba(0, 163, 255, 0.2)'
  ctx.lineWidth = 1
  const gridSize = 50 * zoomLevel.value
  const offsetX = ((-px * zoomLevel.value) % gridSize + gridSize) % gridSize
  const offsetZ = ((-pz * zoomLevel.value) % gridSize + gridSize) % gridSize

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

  const worldToMap = (wx, wz) => {
    return {
      x: centerX + (wx - px) * zoomLevel.value,
      y: centerY + (wz - pz) * zoomLevel.value
    }
  }

  // Draw Path
  if (props.explorationPath.length > 0) {
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)'
    ctx.setLineDash([5, 5])
    ctx.lineWidth = 2

    // Only show recent path on small map, or full path on expanded?
    // User said: "由于minimap不是很大，就只能显示最近的走过的路程。当我放大map的时候，显示的范围就更大"
    const startIdx = isExpanded.value ? 0 : Math.max(0, props.explorationPath.length - 50)

    for (let i = startIdx; i < props.explorationPath.length; i++) {
      const p = props.explorationPath[i]
      const mapPos = worldToMap(p.x, p.z)
      if (i === startIdx) ctx.moveTo(mapPos.x, mapPos.y)
      else ctx.lineTo(mapPos.x, mapPos.y)
    }
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Draw Start (Lander)
  const startPos = worldToMap(props.landerPos.x, props.landerPos.z)
  ctx.fillStyle = '#ff0000'
  ctx.beginPath()
  ctx.arc(startPos.x, startPos.y, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = '10px Arial'
  ctx.textAlign = 'left'
  ctx.fillText(t('mars.start'), startPos.x + 6, startPos.y + 4)

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
  ctx.fillText(t('mars.north'), centerX, 15)
  ctx.fillText(t('mars.south'), centerX, size - 10)
  ctx.fillText(t('mars.west'), 10, centerY + 4)
  ctx.fillText(t('mars.east'), size - 15, centerY + 4)

  if (isExpanded.value) {
    const dist = Math.sqrt(Math.pow(px - lx, 2) + Math.pow(pz - lz, 2)).toFixed(1)
    ctx.textAlign = 'left'
    ctx.fillText(t('mars.dist_start', { dist }), 10, size - 25)
  }
}

let animationFrame
const loop = () => {
  drawMap()
  animationFrame = requestAnimationFrame(loop)
}

onMounted(() => {
  loop()
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <Transition name="fade">
    <div v-if="isVisible" class="planet-surface-hud">
      <!-- Location Drawer Overlay (Positioned below Zodiac button) -->
      <div class="location-drawer-container">
        <div class="location-panel">
          <div class="label">{{ t('mars.location') }}</div>
          <div class="value">{{ planetName }} {{ t('mars.surface') }}</div>
          <div class="coords">
            {{ t('mars.lat') }}: {{ currentLat }} | {{ t('mars.lon') }}: {{ currentLon }}
          </div>

          <div v-if="planetId === 'mars'" class="history-actions">
            <button class="clear-btn" @click="$emit('clear-path')">📍 {{ t('mars.reset_path') }}</button>
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
          @click="toggleExpand"
          @wheel.prevent="handleWheel"
        >
          <canvas ref="canvasRef"></canvas>
        </div>
        <div class="map-hint">{{ isExpanded ? t('mars.map_hint_expanded') : t('mars.map_hint_collapsed') }}</div>
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
  top: 145px; /* Directly below Zodiac toggle */
  left: 0; /* Align to screen edge */
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
