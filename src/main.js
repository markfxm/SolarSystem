import { createApp } from 'vue'
import { injectSpeedInsights } from '@vercel/speed-insights'
import './style.css'
import App from './App.vue'

injectSpeedInsights()

createApp(App).mount('#app')
