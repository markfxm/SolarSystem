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
    <div v-if="isOpen" class="chat-window">
      <div class="chat-header">
        <div class="header-content">
          <div class="status-dot" :class="{ 'is-ready': isReady }"></div>
          <h3>{{ t('chat.title') }}</h3>
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
              <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
            </div>
          </div>
        </template>

        <!-- Loading Overlay -->
        <div v-if="loadingModel" class="loading-overlay">
          <div class="loading-spinner"></div>
          <div class="loading-text">{{ t('chat.loading_model', { progress: Math.round(initProgress * 100) }) }}</div>
        </div>
      </div>

      <div class="chat-input-area" @click="focusInput">
        <div v-if="!gpuSupported" class="gpu-error">
          {{ t('chat.gpu_error') }}
        </div>
        <template v-else>
          <textarea
            ref="inputField"
            v-model="userInput"
            :placeholder="t('chat.placeholder')"
            @keydown.enter.prevent="sendMessage"
            :disabled="!isReady || isTyping"
          ></textarea>
          <button
            class="send-btn"
            @click="sendMessage"
            :disabled="!isReady || isTyping || !userInput.trim()"
          >
            {{ t('chat.send') }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { t } from '../utils/i18n.js'
import { chatService } from '../utils/ChatService.js'

const isOpen = ref(false)
const hasStartedInit = ref(false)
const isReady = ref(false)
const isTyping = ref(false)
const userInput = ref('')
const gpuSupported = ref(true)
const loadingModel = ref(false)
const initProgress = ref(0)
const messages = ref([])
const messagesContainer = ref(null)
const inputField = ref(null)

const toggleChat = async () => {
  isOpen.value = !isOpen.value
}

const focusInput = () => {
  if (inputField.value) inputField.value.focus()
}

const initializeAI = async () => {
  const supported = await chatService.isWebGPUSupported()
  if (!supported) {
    gpuSupported.value = false
    return
  }

  hasStartedInit.value = true
  loadingModel.value = true
  try {
    await chatService.init((p) => {
      initProgress.value = p.progress
    })
    isReady.value = true
    messages.value.push({ role: 'assistant', content: t('chat.welcome') })
  } catch (e) {
    console.error('AI Init Error:', e)
    hasStartedInit.value = false // Reset so they can try again
  } finally {
    loadingModel.value = false
    await scrollToBottom()
    nextTick(() => focusInput())
  }
}

const sendMessage = async () => {
  if (!userInput.value.trim() || !isReady.value || isTyping.value) return

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
    messages.value.push({ role: 'assistant', content: 'Mission failed. Connection lost.' })
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
  pointer-events: auto;
}

.chat-toggle-btn:hover {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 0 25px rgba(var(--glow-rgb), 0.6);
}

.ai-icon {
  position: relative;
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 1px;
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
  pointer-events: none;
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
  width: 350px;
  height: 500px;
  background: rgba(10, 10, 20, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(var(--glow-rgb), 0.3);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  animation: slide-up 0.3s ease-out;
  pointer-events: auto;
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.chat-header {
  padding: 16px;
  background: rgba(var(--glow-rgb), 0.1);
  border-bottom: 1px solid rgba(var(--glow-rgb), 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff4444;
}

.status-dot.is-ready {
  background: #00ff88;
  box-shadow: 0 0 10px #00ff88;
}

.chat-header h3 {
  margin: 0;
  font-size: 15px;
  color: #fff;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  opacity: 0.6;
  padding: 0;
  line-height: 1;
}

.close-btn:hover { opacity: 1; }

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}

.init-gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 20px;
}

.gate-icon {
  font-size: 48px;
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.gate-desc {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 24px;
  line-height: 1.6;
}

.gate-btn {
  background: var(--glow-color);
  color: #fff;
  border: none;
  padding: 12px 24px;
  border-radius: 30px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(var(--glow-rgb), 0.4);
  transition: all 0.3s;
}

.gate-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(var(--glow-rgb), 0.6);
}

.message {
  max-width: 85%;
  display: flex;
}

.message.user { align-self: flex-end; }
.message.assistant { align-self: flex-start; }

.message-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}

.user .message-bubble {
  background: var(--glow-color);
  color: #fff;
  border-bottom-right-radius: 2px;
}

.assistant .message-bubble {
  background: rgba(255, 255, 255, 0.1);
  color: #eee;
  border-bottom-left-radius: 2px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.typing .dot {
  animation: typing-dot 1.4s infinite;
  font-size: 20px;
  line-height: 0;
}
.typing .dot:nth-child(2) { animation-delay: 0.2s; }
.typing .dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-dot {
  0%, 60%, 100% { opacity: 0.3; }
  30% { opacity: 1; }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 10, 20, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 5;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(var(--glow-rgb), 0.1);
  border-top-color: var(--glow-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.loading-text {
  font-size: 13px;
  color: var(--glow-color);
  text-align: center;
  padding: 0 20px;
}

.chat-input-area {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
  cursor: text;
}

textarea {
  width: 100%;
  min-height: 40px;
  max-height: 120px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  padding: 10px;
  font-family: inherit;
  font-size: 14px;
  resize: none;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s;
}

textarea:focus {
  border-color: var(--glow-color);
}

.send-btn {
  width: 100%;
  margin-top: 10px;
  background: var(--glow-color);
  color: #fff;
  border: none;
  padding: 8px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.gpu-error {
  font-size: 12px;
  color: #ff4444;
  text-align: center;
  padding: 10px;
  background: rgba(255, 0, 0, 0.1);
  border-radius: 8px;
}

@media (max-width: 480px) {
  .chat-window {
    width: calc(100vw - 48px);
    height: 400px;
  }
}
</style>
