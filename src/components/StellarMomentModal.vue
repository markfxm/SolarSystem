<template>
  <div class="stellar-modal-overlay" @click.self="$emit('close')">
    <div class="stellar-modal" @click.stop>
      <div class="modal-header">
        <h2>{{ t('stellar.title') || 'My Stellar Moment' }}</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <template v-if="!capturedImage">
          <p class="desc">{{ t('stellar.desc') || 'Choose a significant date to see the planets align.' }}</p>
          
          <div class="control-group">
            <label>{{ t('stellar.dateLabel') }}</label>
            <div class="manual-date-input">
              <input 
                ref="yearInput"
                type="text" 
                inputmode="numeric"
                v-model="year" 
                placeholder="YYYY" 
                maxlength="4"
                @input="handleInput('year')"
                @keydown.right="handleArrow('year', 'right', $event)"
                @keydown.left="handleArrow('year', 'left', $event)"
                class="date-part-input year-input"
              />
              <span class="sep">-</span>
              <input 
                ref="monthInput"
                type="text" 
                inputmode="numeric"
                v-model="month" 
                placeholder="MM" 
                maxlength="2"
                @input="handleInput('month')"
                @keydown.right="handleArrow('month', 'right', $event)"
                @keydown.left="handleArrow('month', 'left', $event)"
                class="date-part-input month-input"
              />
              <span class="sep">-</span>
              <input 
                ref="dayInput"
                type="text" 
                inputmode="numeric"
                v-model="day" 
                placeholder="DD" 
                maxlength="2"
                @input="handleInput('day')"
                @keydown.right="handleArrow('day', 'right', $event)"
                @keydown.left="handleArrow('day', 'left', $event)"
                class="date-part-input day-input"
              />
            </div>
          </div>

          <div class="actions">
            <button class="capture-btn" @click="onCapture" :disabled="isCapturing">
              <span v-if="!isCapturing">✨ {{ t('stellar.capture') }}</span>
              <span v-else>{{ t('stellar.capturing') }}</span>
            </button>
          </div>

          <div class="tips">
            <p>💡 {{ t('stellar.tip') }}</p>
          </div>
        </template>

        <template v-else>
          <div class="preview-container">
            <h3>{{ t('stellar.review') }}</h3>
            <div class="image-wrapper">
              <img :src="displayImage" class="preview-img" alt="Snapshot Preview" />
              <button class="zoom-btn" @click="showFull = true" :title="t('stellar.enlarge')">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
              </button>
            </div>
            <div class="preview-actions">
              <button 
                class="style-btn" 
                @click="toggleStyle" 
                :class="{ active: posterStyle === 'cinematic' }"
                :disabled="isProcessing"
                :title="posterStyle === 'raw' ? 'Create Poster' : 'Show Original'"
              >
                 <!-- Wand Icon -->
                 <svg v-if="!isProcessing" xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                   <path d="M15 4V2"/>
                   <path d="M15 16v-2"/>
                   <path d="M8 9h2"/>
                   <path d="M20 9h2"/>
                   <path d="M17.8 11.8 19 13"/>
                   <path d="M15 9l-1-1"/>
                   <path d="M15 19l6-6a2 2 0 0 0-3-3l-6 6a2 2 0 0 0 3 3z"/>
                 </svg>
                 <span v-else class="spinner"></span>
              </button>
              <button class="download-btn-confirm" @click="$emit('download', displayImage)" :title="t('stellar.save')">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
              <button class="discard-btn" @click="$emit('discard')" :title="t('stellar.discard')">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Full Screen Lightbox -->
    <div v-if="showFull" class="lightbox-overlay" @click="closeLightbox">
      <div 
        class="lightbox-content" 
        @click.stop
        @wheel.passive="handleWheel"
        @pointerdown="startPan"
        @pointermove="doPan"
        @pointerup="stopPan"
        @pointerleave="stopPan"
        :style="{ cursor: isDragging ? 'grabbing' : (zoomScale > 1 ? 'grab' : 'default') }"
      >
        <img 
          :src="displayImage" 
          alt="Full Preview" 
          :style="{ 
            transform: `translate(${translateX}px, ${translateY}px) scale(${zoomScale})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out'
          }"
          draggable="false"
        />
        <button class="lightbox-close" @click="closeLightbox">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { t } from '../utils/i18n.js'
import { createCinematicPoster } from '../utils/PosterEngine.js'

const props = defineProps({
  currentDate: {
    type: Date,
    default: () => new Date()
  },
  isCapturing: {
    type: Boolean,
    default: false
  },
  capturedImage: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'preview', 'capture', 'download', 'discard'])

const year = ref(2026)
const month = ref(1)
const day = ref(1)
const showFull = ref(false)

// Poster Style Logic
const posterStyle = ref('raw') // 'raw' | 'cinematic'
const processedImage = ref('')
const isProcessing = ref(false)

const yearInput = ref(null)
const monthInput = ref(null)
const dayInput = ref(null)

watch(() => props.capturedImage, () => {
  processedImage.value = ''
  posterStyle.value = 'raw'
})

const displayImage = computed(() => {
  if (posterStyle.value === 'cinematic' && processedImage.value) {
    return processedImage.value
  }
  return props.capturedImage
})

// Zoom & Pan Logic
const zoomScale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isDragging = ref(false)
let startX = 0
let startY = 0

function handleWheel(e) {
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(1, Math.min(zoomScale.value * delta, 10))
  
  // If zooming out to 1, reset translation
  if (newScale === 1) {
    translateX.value = 0
    translateY.value = 0
  }
  
  zoomScale.value = newScale
}

function startPan(e) {
  if (zoomScale.value <= 1) return
  isDragging.value = true
  startX = e.clientX - translateX.value
  startY = e.clientY - translateY.value
  e.target.setPointerCapture(e.pointerId)
}

function doPan(e) {
  if (!isDragging.value) return
  translateX.value = e.clientX - startX
  translateY.value = e.clientY - startY
}

function stopPan(e) {
  isDragging.value = false
}

function closeLightbox() {
  showFull.value = false
  // Reset Zoom/Pan
  zoomScale.value = 1
  translateX.value = 0
  translateY.value = 0
}

async function toggleStyle() {
  if (posterStyle.value === 'raw') {
    if (!processedImage.value) {
      isProcessing.value = true
      try {
        const dateObj = new Date(year.value, month.value - 1, day.value)
        processedImage.value = await createCinematicPoster(props.capturedImage, dateObj)
      } catch (e) {
        console.error(e)
      } finally {
        isProcessing.value = false
      }
    }
    posterStyle.value = 'cinematic'
  } else {
    posterStyle.value = 'raw'
  }
}

function focusYear() { yearInput.value?.focus() }
function focusMonth() { monthInput.value?.focus() }
function focusDay() { dayInput.value?.focus() }

function syncFromDate(date) {
  const d = new Date(date)
  year.value = d.getFullYear()
  month.value = d.getMonth() + 1
  day.value = d.getDate()
}

onMounted(() => {
  syncFromDate(props.currentDate)
})

function onManualDateChange() {
  // We no longer emit 'preview' here to avoid live background movement
}

function handleInput(field) {
  // Allow only digits
  if (field === 'year') year.value = year.value.replace(/\D/g, '')
  if (field === 'month') month.value = month.value.replace(/\D/g, '')
  if (field === 'day') day.value = day.value.replace(/\D/g, '')

  onManualDateChange()
}

function handleArrow(field, dir, e) {
  const input = e.target
  const pos = input.selectionStart
  const len = input.value.length

  if (dir === 'right' && pos === len) {
    if (field === 'year') focusMonth()
    else if (field === 'month') focusDay()
  } else if (dir === 'left' && pos === 0) {
    if (field === 'month') focusYear()
    else if (field === 'day') focusMonth()
  }
}

function onCapture() {
  const y = parseInt(year.value)
  const m = parseInt(month.value)
  const d = parseInt(day.value)

  if (isNaN(y) || isNaN(m) || isNaN(d)) return
  
  const dateObj = new Date(y, m - 1, d, 12, 0, 0)
  // Check valid date (e.g. avoid Feb 31)
  if (dateObj.getFullYear() === y && dateObj.getMonth() === m - 1 && dateObj.getDate() === d) {
    emit('capture', dateObj)
  } else {
    emit('capture', dateObj)
  }
}
</script>

<style scoped>
.stellar-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.stellar-modal {
  background: rgba(20, 20, 30, 0.95);
  border: 1px solid rgba(100, 200, 255, 0.2);
  width: 90%;
  max-width: 400px;
  border-radius: 16px;
  box-shadow: 0 0 30px rgba(0, 100, 255, 0.15);
  overflow: hidden;
  color: #fff;
  font-family: 'Inter', system-ui, sans-serif;
  animation: slideUp 0.3s ease;
}

.modal-header {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(135deg, #fff, #88ccff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.close-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.desc {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-group label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #88ccff;
  font-weight: 600;
}

.manual-date-input {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 4px 12px;
}

.date-part-input {
  background: transparent;
  border: none;
  color: #fff;
  font-family: inherit;
  font-size: 16px;
  outline: none;
  padding: 8px 0;
  text-align: center;
}

.year-input { width: 60px; }
.month-input, .day-input { width: 35px; }

.sep {
  color: rgba(255, 255, 255, 0.4);
  font-weight: bold;
}

/* Hide arrows for number inputs */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.manual-date-input:focus-within {
  border-color: #88ccff;
}

/* Customizing calendar icon/picker is tricky in pure CSS, depends on browser */
::-webkit-calendar-picker-indicator {
  filter: invert(1);
  opacity: 0.6;
  cursor: pointer;
}

.actions {
  display: flex;
  justify-content: center;
}

.capture-btn {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #2b5876 0%, #4e4376 100%);
  color: #fff;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.capture-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(78, 67, 118, 0.4);
}

.capture-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.preview-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.preview-container h3 {
  margin: 0;
  font-size: 14px;
  color: #88ccff;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.image-wrapper {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  position: relative;
}

.zoom-btn {
  position: absolute;
  bottom: 12px;
  right: 12px;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.5); /* Increased opacity */
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3); /* Brighter border */
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
  z-index: 10; /* Ensure on top */
}

.zoom-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  transform: scale(1.1);
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* Lightbox Styles */
.lightbox-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.95);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.lightbox-content {
  position: relative;
  width: 90vw;
  max-width: 90vw;
  max-height: 90vh;
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #000;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 50px rgba(0,0,0,1);
}

.lightbox-content img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.lightbox-close {
  position: absolute;
  top: 20px;
  right: 30px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 42px;
  font-weight: 300;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  opacity: 0.6;
}

.lightbox-close:hover {
  opacity: 1;
  transform: scale(1.1);
}

.lightbox-close:focus {
  outline: none;
}

.lightbox-close:active {
  transform: scale(0.9);
}

.preview-actions {
  display: flex;
  width: 100%;
  gap: 16px;
  margin-top: 10px;
  justify-content: center;
}


.download-btn-confirm {
  width: 80px;
  height: 42px;
  border-radius: 8px;
  border: 1px solid rgba(136, 204, 255, 0.4);
  background: rgba(136, 204, 255, 0.15);
  color: #88ccff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.discard-btn {
  width: 80px;
  height: 42px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.download-btn-confirm:hover {
  transform: translateY(-2px);
  background: rgba(136, 204, 255, 0.25);
  color: #fff;
  border-color: rgba(136, 204, 255, 0.6);
  box-shadow: 0 4px 15px rgba(136, 204, 255, 0.2);
}

.discard-btn:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.style-btn {
  width: 50px;
  height: 42px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.style-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.style-btn.active {
  background: rgba(136, 204, 255, 0.2);
  border-color: #88ccff;
  color: #88ccff;
  box-shadow: 0 0 10px rgba(136, 204, 255, 0.2);
}

.style-btn:disabled {
  opacity: 0.5;
  cursor: wait;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.download-btn-confirm:active, .discard-btn:active, .style-btn:active {
  transform: translateY(1px);
}
</style>
