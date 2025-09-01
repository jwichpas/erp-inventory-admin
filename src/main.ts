import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueApexCharts from 'vue3-apexcharts'

import App from './App.vue'
import router from './router'
import { initializeStores } from './stores'
import { setupVueQuery } from './plugins/vue-query'

const app = createApp(App)

// Configure Vue Query with custom settings
setupVueQuery(app)

app.use(createPinia())
app.use(router)
app.component('apexchart', VueApexCharts)

// Initialize stores after Pinia is set up
initializeStores()
  .then(() => {
    app.mount('#app')
  })
  .catch((error) => {
    console.error('Failed to initialize application:', error)
    // Mount anyway to show error state
    app.mount('#app')
  })
