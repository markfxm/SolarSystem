<template>
  <div class="time-panel">
    <button
      class="btn"
      :class="{ active: mode === 'real' }"
      @click="setRealTime"
    >
      Real Time
    </button>

    <button
      class="btn"
      :class="{ active: mode === 'fast' }"
      @click="setFastSpeed"
    >
      ×500000 Speed
    </button>

    <button
      class="btn home"
      @click="goHome"
    >
      Home
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits([
  'real-time',
  'fast-time',
  'home'
])

const mode = ref('real')

function setRealTime() {
  mode.value = 'real'
  emit('real-time')
}

function setFastSpeed() {
  mode.value = 'fast'
  emit('fast-time')
}

function goHome() {
  emit('home')
}
</script>

<style scoped>
.time-panel {
  position: absolute;
  top: 20%;
  left: 20px;
  z-index: 120;

  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Base button */
.btn {
  padding: 10px 18px;
  min-width: 130px;

  font-size: 15px;
  font-weight: 600;
  color: #ccc;

  background: rgba(30, 30, 40, 0.95);
  border: 1px solid rgba(120, 160, 255, 0.35);
  border-radius: 10px;

  cursor: pointer;
  transition: all 0.25s ease;

  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.55);
}

.btn:hover {
  background: rgba(60, 100, 220, 0.85);
  color: #fff;
  transform: translateX(4px);
}

/* Active speed mode */
.btn.active {
  background: #1e88e5;
  color: #fff;
  border-color: #64b5f6;
  box-shadow: 0 0 18px rgba(30, 136, 229, 0.55);
}

/* Home button */
.btn.home {
  background: rgba(90, 90, 90, 0.95);
  color: #fff;
}

.btn.home:hover {
  background: rgba(130, 130, 130, 0.95);
}
</style>
