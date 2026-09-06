<template>
  <aside v-show="open" id="control-drawer" class="control-drawer explorer-panel" :aria-label="t('control.menu')">
    <header><h2>{{ t('control.menu') }}</h2><button @click="$emit('close')">{{ t('explorer.close') }}</button></header>
    <section>
      <h3>{{ t('explorer.view') }}</h3>
      <button class="control-row" role="switch" :aria-checked="showZodiac" @click="$emit('toggle-zodiac')"><span>{{ t('control.zodiac') }}</span><span>{{ showZodiac ? t('explorer.on') : t('explorer.off') }}</span></button>
      <button class="control-row" role="switch" :aria-checked="showGrid" :disabled="!hasSelectedPlanet" @click="$emit('toggle-grid')"><span>{{ t('control.grid') }}</span><span>{{ showGrid ? t('explorer.on') : t('explorer.off') }}</span></button>
      <p v-if="!hasSelectedPlanet" class="control-hint">{{ t('explorer.gridHint') }}</p>
      <button class="control-row" role="switch" :aria-checked="showHolo" @click="$emit('toggle-holo')"><span>{{ t('control.holographic') }}</span><span>{{ showHolo ? t('explorer.on') : t('explorer.off') }}</span></button>
    </section>
    <section><h3>{{ t('explorer.simulation') }}</h3><TimeControlPanel ref="speedPanel" :embedded="true" @speed-change="$emit('speed-change', $event)" @reset="$emit('reset')" /></section>
    <section><h3>{{ t('explorer.tools') }}</h3><button class="control-row" @click="$emit('snapshot')">{{ t('stellar.btn') }}</button></section>
    <section><h3>{{ t('explorer.navigation') }}</h3>
      <button class="control-row" @click="$emit('home')">{{ t('control.home') }}</button>
      <button class="control-row mobile-navigation" @click="$emit('planets')">{{ t('explorer.planets') }}</button>
      <button class="control-row mobile-navigation" @click="$emit('missions')">{{ t('explorer.missions') }}</button>
      <button class="control-row mobile-navigation" @click="$emit('about')">{{ t('explorer.about') }}</button>
    </section>
  </aside>
</template>
<script setup>
import { ref } from 'vue'
import { t } from '../utils/i18n'
import TimeControlPanel from './TimeControlPanel.vue'
defineProps({ open: Boolean, showZodiac: Boolean, showGrid: Boolean, showHolo: Boolean, hasSelectedPlanet: Boolean })
defineEmits(['close', 'home', 'toggle-zodiac', 'toggle-grid', 'toggle-holo', 'speed-change', 'reset', 'snapshot', 'planets', 'missions', 'about'])
const speedPanel = ref(null)
function closeSpeed() { speedPanel.value?.setOpen(false) }
function resetSpeedVisuals() { speedPanel.value?.resetVisuals() }
defineExpose({ closeSpeed, resetSpeedVisuals })
</script>
<style scoped>
.control-drawer { width: 320px; }
section { padding: 17px 0; border-top: 1px solid #ffffff12; }
h3 { font-size: 10px; font-weight: 500; letter-spacing: .2em; text-transform: uppercase; color: #bca582; margin: 0 0 12px; }
.control-row { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 10px 0; border: 0; background: transparent; color: #e6e3dc; text-align: left; font-size: 13px; }
.control-row[role=switch] span:last-child { color: #8d8e92; font-size: 10px; letter-spacing: .1em; }
.control-row[aria-checked=true] span:last-child { color: #edc68b; }
.control-row:disabled { opacity: .4; cursor: default; }
.control-hint { margin: 0; font-size: 11px; color: #939398; }
.mobile-navigation { display: none; }
@media(max-width: 700px) { .mobile-navigation { display: flex; } }
</style>
