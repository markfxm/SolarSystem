<template>
  <select class="language-select" :value="currentLang" @change="setLang($event.target.value)" aria-label="Language / 语言">
    <option value="en">EN</option><option value="zh">中文</option>
  </select>
</template>
<script setup>
import { currentLang, setLang } from '../utils/i18n'
</script>
<style scoped>
.language-select { color: #e9e5dd; background: #0b0d10; border: 1px solid #ffffff18; border-radius: 20px; padding: 8px 10px; font: inherit; font-size: 11px; cursor: pointer; }
</style>
