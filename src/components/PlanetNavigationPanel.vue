<!-- components/PlanetNavigationPanel.vue -->
<template>
    <div
      class="panel-wrapper"
      :class="{ 'is-open': isOpen }"
      @click.stop
    >
      <!-- Toggle Button (Arrow) -->
      <button
        class="toggle-button"
        @click="togglePanel"
        :style="{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M15 18L9 12L15 6" />
        </svg>
      </button>
  
      <!-- Panel Content -->
      <div class="panel-content">
        <h3 class="panel-title">Solar System</h3>
        <ul class="planet-list">
          <li v-for="body in bodies" :key="body.id" class="planet-item">
            <button
              @click="$emit('select', body.id)"
              :class="{ active: selectedBody === body.id }"
              class="planet-button"
            >
              {{ body.label }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  
  const props = defineProps({
    selectedBody: {
      type: String,
      default: null
    }
  })
  
  const emit = defineEmits(['select'])
  
  // Start closed (hidden) – change to `true` if you want it open by default
  const isOpen = ref(false)
  
  const togglePanel = () => {
    isOpen.value = !isOpen.value
  }
  
  const bodies = [
    { id: 'sun', label: 'Sun' },
    { id: 'mercury', label: 'Mercury' },
    { id: 'venus', label: 'Venus' },
    { id: 'earth', label: 'Earth' },
    { id: 'mars', label: 'Mars' },
    { id: 'jupiter', label: 'Jupiter' },
    { id: 'saturn', label: 'Saturn' },
    { id: 'uranus', label: 'Uranus' },
    { id: 'neptune', label: 'Neptune' }
  ]
  </script>
  
  <style scoped>
  .panel-wrapper {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    z-index: 100;
    display: flex;
    transition: transform 0.45s cubic-bezier(0.25, 0.8, 0.25, 1);
  }
  
  /* Hidden state: only the arrow is visible */
  .panel-wrapper {
    transform: translateX(100%) translateY(-50%);
  }
  
  /* Visible state: panel slides in from right */
  .panel-wrapper.is-open {
    transform: translateX(0) translateY(-50%);
  }
  
  /* Arrow toggle button */
  .toggle-button {
    position: absolute;
    left: -48px;
    top: 50%;
    transform: translateY(-50%);
    width: 48px;
    height: 96px;
    background: rgba(30, 40, 80, 0.95);
    border: 1px solid rgba(100, 150, 255, 0.4);
    border-right: none;
    border-radius: 12px 0 0 12px;
    color: #88ccff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    box-shadow: -4px 4px 20px rgba(0, 0, 0, 0.6);
  }
  
  .toggle-button:hover {
    background: rgba(50, 80, 160, 0.95);
    color: #ffffff;
    box-shadow: -6px 4px 24px rgba(0, 0, 0, 0.7);
  }
  
  /* Panel content */
  .panel-content {
    background: rgba(20, 25, 50, 0.97);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(100, 150, 255, 0.3);
    border-radius: 16px 0 0 16px;
    padding: 24px 20px;
    min-width: 200px;
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.7);
  }
  
  .panel-title {
    margin: 0 0 20px 0;
    color: #88ccff;
    font-size: 19px;
    font-weight: 600;
    text-align: center;
    text-shadow: 0 0 8px rgba(100, 180, 255, 0.5);
  }
  
  .planet-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  
  .planet-button {
    width: 100%;
    padding: 11px 16px;
    background: rgba(40, 50, 100, 0.5);
    color: #ddd;
    border: 1px solid rgba(100, 150, 255, 0.3);
    border-radius: 10px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.25s ease;
    text-align: left;
  }
  
  .planet-button:hover {
    background: rgba(60, 110, 220, 0.6);
    color: #fff;
    border-color: #88ccff;
    transform: translateX(4px);
  }
  
  .planet-button.active {
    background: #1e88e5;
    color: white;
    border-color: #64b5f6;
    font-weight: 600;
    box-shadow: 0 0 14px rgba(30, 136, 229, 0.5);
  }
  </style>