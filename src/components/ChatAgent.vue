<template>
  <div class="chat-agent-container" :class="{ 'is-open': isOpen }">
    <!-- Floating Toggle Button -->
    <button class="chat-toggle-btn" @click="toggleChat" :title="t('chat.title')">
      <div class="ai-icon">
        <div class="ai-pulse" :class="{ 'is-active': isReady }"></div>
        <span>AI</span>
      </div>
    </button>

    <!-- Chat Window -->
    <div
      v-if="isOpen"
      class="chat-window"
      :style="{ width: `${windowSize.w}px`, height: `${windowSize.h}px` }"
    >
      <!-- Resize Handles -->
      <div class="resize-handle-top" @mousedown="startResize($event, 'top')"></div>
      <div class="resize-handle-right" @mousedown="startResize($event, 'right')"></div>
      <div class="resize-handle-corner" @mousedown="startResize($event, 'both')"></div>

      <div class="chat-header">
        <div class="header-content">
          <div class="status-dot" :class="{ 'is-ready': isReady }"></div>
          <h3>{{ t('chat.title') }}</h3>
          <span v-if="isReady" class="mode-badge">{{ chatService.mode.toUpperCase() }}</span>
          <span v-else-if="hasStartedInit" class="mode-badge book-mode">BOOKS</span>
        </div>
        <button class="close-btn" @click="isOpen = false">×</button>
      </div>

      <div class="chat-messages" ref="messagesContainer">
        <!-- Not Started State -->
        <div v-if="!hasStartedInit" class="init-gate">
          <div class="gate-icon">🛰️</div>
          <p class="gate-desc">{{ t('chat.download_desc') }}</p>
          <button class="gate-btn" @click="initializeAI">
            {{ t('chat.start_download') }}
          </button>
        </div>

        <!-- Messages -->
        <template v-else>
          <div v-for="(msg, idx) in messages" :key="idx" :class="['message', msg.role]">
            <div class="message-bubble">
              {{ msg.content }}
            </div>
          </div>

          <div v-if="isTyping" class="message assistant">
            <div class="message-bubble typing">
              <span class="thinking-text">{{ t('chat.thinking') }}</span>
              <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
            </div>
          </div>
        </template>

        <!-- Loading Overlay with Circular Progress -->
        <div v-if="loadingModel" class="loading-overlay pointer-events-none">
          <div class="progress-circle-container">
            <svg class="progress-circle" viewBox="0 0 100 100">
              <circle class="circle-bg" cx="50" cy="50" r="45"></circle>
              <circle
                class="circle-fill"
                cx="50" cy="50" r="45"
                :style="{ strokeDashoffset: 283 - (283 * initProgress) }"
              ></circle>
            </svg>
            <div class="progress-text">{{ Math.round(initProgress * 100) }}%</div>
          </div>
          <div class="loading-text">{{ t('chat.initializing') }}</div>
        </div>
      </div>

      <div class="chat-input-area" @click="focusInput">
        <textarea
          ref="inputField"
          v-model="userInput"
          :placeholder="t('chat.placeholder')"
          @keydown.enter.prevent="sendMessage"
          :disabled="(!isReady && !hasStartedInit) || isTyping"
        ></textarea>
        <button
          class="send-btn"
          @click="sendMessage"
          :disabled="( !isReady && !hasStartedInit ) || isTyping || !userInput.trim()"
        >
          {{ t('chat.send') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { t } from '../utils/i18n.js'
import { chatService } from '../utils/ChatService.js'

const isOpen = ref(false)
const hasStartedInit = ref(false)
const isReady = ref(false)
const isTyping = ref(false)
const userInput = ref('')
const loadingModel = ref(false)
const initProgress = ref(0)
const messages = ref([])
const messagesContainer = ref(null)
const inputField = ref(null)

// Resizable window state
const windowSize = reactive({ w: 320, h: 420 })
const isResizing = ref(false)
let resizeType = 'both'
let startX, startY, startW, startH

const toggleChat = () => {
  isOpen.value = !isOpen.value
}

const focusInput = () => {
  if (inputField.value) inputField.value.focus()
}

const startResize = (e, type) => {
  isResizing.value = true
  resizeType = type
  startX = e.clientX
  startY = e.clientY
  startW = windowSize.w
  startH = windowSize.h

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

const handleResize = (e) => {
  if (!isResizing.value) return

  // Max constraints to prevent going off-screen
  // Container is bottom: 24, left: 24. Window is bottom: 70 relative to container.
  // So window bottom is 94px from viewport bottom.
  const maxW = window.innerWidth - 48 // 24px left + some margin
  const maxH = window.innerHeight - 120 // 94px bottom + some top margin

  const dx = e.clientX - startX
  const dy = startY - e.clientY

  if (resizeType === 'right' || resizeType === 'both') {
    windowSize.w = Math.max(280, Math.min(maxW, startW + dx))
  }
  if (resizeType === 'top' || resizeType === 'both') {
    windowSize.h = Math.max(300, Math.min(maxH, startH + dy))
  }
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

const initializeAI = async () => {
  hasStartedInit.value = true
  loadingModel.value = true
  try {
    await chatService.init((p) => {
      initProgress.value = p.progress
    }, isReady)
    messages.value.push({ role: 'assistant', content: t('chat.welcome') })
  } catch (e) {
    console.error('AI Init Error:', e)
    hasStartedInit.value = false
  } finally {
    loadingModel.value = false
    await scrollToBottom()
    nextTick(() => focusInput())
  }
}

const sendMessage = async () => {
  if (!userInput.value.trim() || isTyping.value) return
  if (!isReady.value && !hasStartedInit.value) return

  const userText = userInput.value.trim()
  messages.value.push({ role: 'user', content: userText })
  userInput.value = ''
  isTyping.value = true

  await scrollToBottom()

  try {
    const chatMessages = messages.value.map(m => ({ role: m.role, content: m.content }))
    let assistantMsg = { role: 'assistant', content: '' }
    messages.value.push(assistantMsg)

    await chatService.chat(chatMessages, (text) => {
      assistantMsg.content = text
      scrollToBottom()
    })
  } catch (e) {
    console.error('Chat Error:', e)
    messages.value.push({ role: 'assistant', content: 'Connection error. Please try again.' })
  } finally {
    isTyping.value = false
    nextTick(() => focusInput())
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

watch(isOpen, (val) => {
  if (val) {
    scrollToBottom()
    if (isReady.value) nextTick(() => focusInput())
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<style scoped>
.chat-agent-container {
  position: absolute;
  bottom: 24px;
  left: 24px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.chat-toggle-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(15, 15, 25, 0.85);
  border: 1px solid var(--glow-color);
  box-shadow: 0 0 15px rgba(var(--glow-rgb), 0.4);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  padding: 0;
}

.chat-toggle-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 0 25px rgba(var(--glow-rgb), 0.6);
}

.ai-icon {
  position: relative;
  font-weight: 800;
  font-size: 14px;
}

.ai-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid var(--glow-color);
  opacity: 0.5;
}

.ai-pulse.is-active {
  animation: pulse-ring 2s infinite;
  opacity: 1;
}

@keyframes pulse-ring {
  0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; }
  100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
}

.chat-window {
  position: absolute;
  bottom: 70px;
  left: 0;
  background: rgba(10, 10, 20, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(var(--glow-rgb), 0.3);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  animation: slide-up 0.3s ease-out;
}

.resize-handle-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 20px;
  height: 6px;
  cursor: ns-resize;
  z-index: 11;
}

.resize-handle-right {
  position: absolute;
  top: 20px;
  right: 0;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
  z-index: 11;
}

.resize-handle-corner {
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 20px;
  cursor: nesw-resize;
  z-index: 12;
  background: linear-gradient(225deg, var(--glow-color) 0%, transparent 50%);
  opacity: 0.3;
  transition: opacity 0.2s;
}

.resize-handle-corner:hover { opacity: 0.8; }

.chat-header {
  padding: 12px 16px;
  background: rgba(var(--glow-rgb), 0.1);
  border-bottom: 1px solid rgba(var(--glow-rgb), 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-badge {
  font-size: 9px;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 5px;
  border-radius: 4px;
  color: #aaa;
  letter-spacing: 0.5px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff4444;
}

.status-dot.is-ready {
  background: #00ff88;
  box-shadow: 0 0 8px #00ff88;
}

.chat-header h3 {
  margin: 0;
  font-size: 14px;
  color: #fff;
}

.close-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  opacity: 0.6;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.init-gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
}

.gate-icon { font-size: 40px; margin-bottom: 12px; }

.gate-desc {
  font-size: 13px;
  color: #aaa;
  margin-bottom: 16px;
  padding: 0 10px;
}

.gate-btn {
  background: var(--glow-color);
  color: #fff;
  border: none;
  padding: 8px 20px;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
}

.message { max-width: 85%; display: flex; }
.message.user { align-self: flex-end; }
.message.assistant { align-self: flex-start; }

.message-bubble {
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
}

.user .message-bubble { background: var(--glow-color); color: #fff; }
.assistant .message-bubble { background: rgba(255, 255, 255, 0.1); color: #eee; }

.thinking-text {
  font-size: 11px;
  opacity: 0.7;
  margin-right: 4px;
}

.progress-circle-container {
  position: relative;
  width: 80px;
  height: 80px;
}

.progress-circle {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
}

.circle-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 8;
}

.circle-fill {
  fill: none;
  stroke: var(--glow-color);
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 283;
  transition: stroke-dashoffset 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 16px;
  font-weight: 800;
  color: var(--glow-color);
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(10, 10, 20, 0.7);
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.loading-text { font-size: 12px; color: var(--glow-color); }

.chat-input-area {
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.mode-badge.book-mode {
  background: rgba(var(--glow-rgb), 0.2);
  color: var(--glow-color);
  border: 1px solid rgba(var(--glow-rgb), 0.3);
}

textarea {
  width: 100%;
  height: 60px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  padding: 8px;
  font-size: 13px;
  resize: none;
}

.send-btn {
  width: 100%;
  margin-top: 8px;
  background: var(--glow-color);
  color: #fff;
  border: none;
  padding: 6px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.send-btn:disabled { opacity: 0.5; }

@keyframes slide-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
