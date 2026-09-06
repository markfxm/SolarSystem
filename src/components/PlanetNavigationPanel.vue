<template>
  <aside id="planet-navigator" class="planet-navigator explorer-panel" :aria-label="title">
    <header><h2>{{ title }}</h2><button @click="$emit('close')">{{ t('explorer.close') }}</button></header>
    <ul class="planet-list">
      <li v-for="(body, index) in bodies" :key="body.id" :class="{ selected: selectedBody === body.id }">
        <button class="planet-select" :aria-pressed="selectedBody === body.id" @click="$emit('select', body.id)"><span class="planet-index" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>{{ body.label }}</button>
        <button class="planet-info" @click="$emit('info', body.id)" :aria-label="body.label + ' · ' + showInfoTitle">{{ t('explorer.details') }}</button>
      </li>
    </ul>
  </aside>
</template>
<script setup>
import { computed } from 'vue'
import { t } from '../utils/i18n'

defineProps({
  selectedBody: {
    type: String,
    default: null
  }
})
defineEmits(['select', 'info', 'close'])


const title = computed(() => t('nav_title'))

// Performance Optimization: Cache translation keys for the template
// to avoid high-frequency dynamic traversal inside high-frequency template renders.
const showInfoTitle = computed(() => t('nav.show_info'))

// Performance Optimization: Hoist static planet metadata outside the computed property
// to prevent raw array/object structure allocations on every computed property evaluation.
const BODIES_METADATA = [
  { id: 'sun', key: 'planet.sun' },
  { id: 'mercury', key: 'planet.mercury' },
  { id: 'venus', key: 'planet.venus' },
  { id: 'earth', key: 'planet.earth' },
  { id: 'moon', key: 'planet.moon' },
  { id: 'mars', key: 'planet.mars' },
  { id: 'jupiter', key: 'planet.jupiter' },
  { id: 'saturn', key: 'planet.saturn' },
  { id: 'uranus', key: 'planet.uranus' },
  { id: 'neptune', key: 'planet.neptune' }
]

const bodies = computed(() => {
  const result = []
  for (let i = 0; i < BODIES_METADATA.length; i++) {
    const item = BODIES_METADATA[i]
    result.push({
      id: item.id,
      label: t(item.key)
    })
  }
  return result
})
</script>

<style scoped>
.planet-navigator { width: 310px; }
.planet-list { list-style: none; margin: 0; padding: 0; }
li { display: flex; align-items: center; border-top: 1px solid #ffffff0d; }
li:nth-child(7) { margin-top: 12px; border-top-color: #ffffff25; }
li.selected { background: #e8c38a12; }
button { background: transparent; border: 0; color: #e6e3dc; }
.planet-select { flex: 1; padding: 13px 4px; text-align: left; font-size: 14px; }
.planet-index { font-size: 10px; color: #a99a80; margin-right: 22px; }
.planet-info { font-size: 11px; color: #aaa; padding: 12px 4px; }
</style>
