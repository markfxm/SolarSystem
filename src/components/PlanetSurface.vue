<script setup>
import { computed } from 'vue'

const props = defineProps({
  isVisible: Boolean,
  planetId: String,
  planetName: String
})

const emit = defineEmits(['exit'])
</script>

<template>
  <Transition name="fade">
    <div v-if="isVisible" class="planet-surface-hud">
      <!-- Location Drawer Overlay (Positioned below Zodiac button) -->
      <div class="location-drawer-container">
        <div class="location-panel">
          <div class="label">LOCATION</div>
          <div class="value">{{ planetName }} Surface</div>
          <div class="coords">Lat: 18.65° N | Lon: 226.2° E</div>
        </div>
      </div>

      <!-- Bottom Center: Controls Hint -->
      <div class="controls-hint">
        <div class="mouse-icon">🖱️</div>
        <span>Hold Left Click & Drag to Look Around</span>
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
  
  /* Initial state: Hidden to the left, but blue border (4px) stays on screen */
  transform: translateX(calc(-100% + 4px)); 
  transition: transform 0.8s cubic-bezier(0.19, 1, 0.22, 1); /* Slower transition */
}

/* Hover effect: Slide out */
.location-drawer-container:hover .location-panel {
  transform: translateX(0);
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
}

.controls-hint {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  padding: 10px 20px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: pulsed 2s infinite ease-in-out;
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
@keyframes pulsed {
  0%, 100% { opacity: 0.7; transform: translateX(-50%) scale(1); }
  50% { opacity: 1; transform: translateX(-50%) scale(1.02); }
}

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
