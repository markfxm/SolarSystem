<script setup>
import { inject } from '@vercel/analytics'
import DayNightEarth from './components/SolarSystem.vue'

// Initialize analytics
inject()
</script>

<template>
  <DayNightEarth />
</template>

<style>
html, body, #app { margin:0; padding:0; width:100%; height:100%; overflow:hidden; }
</style>
