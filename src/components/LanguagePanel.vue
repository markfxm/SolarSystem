<template>
  <div class="lang-panel" role="group" aria-label="Language switch">
    <button
      class="lang-btn"
      :class="{ active: current === 'en' }"
      @click="setLocalLang('en')"
      title="English"
    >
      EN
    </button>
    <button
      class="lang-btn"
      :class="{ active: current === 'zh' }"
      @click="setLocalLang('zh')"
      title="中文"
    >
      中
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { currentLang, setLang } from '../utils/i18n.js'

const current = computed(() => currentLang.value)
function setLocalLang(lang) {
  setLang(lang)
}
</script>

<style scoped>
.lang-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 140;
  display: flex;
  gap: 6px;
  align-items: center;
  pointer-events: auto;
}

.lang-btn {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(30, 30, 40, 0.9);
  color: #ddd;
  font-weight: 700;
  font-size: 11px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  box-sizing: border-box;
  padding: 0;
}

.lang-btn:hover {
  transform: translateY(-1px);
}

.lang-btn.active {
  background: var(--glow-color);
  color: #fff;
  box-shadow: 0 6px 18px rgba(var(--glow-rgb), 0.3);
}
</style>
