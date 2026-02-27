import { createApp } from 'vue'
import './style.css'
import './composables/useTheme' // Applique le thème (localStorage) avant le premier rendu
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')
