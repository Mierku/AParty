import { createApp } from 'vue'
import App from './App.vue'
import './style.scss'
import { createPinia } from 'pinia'

console.log('iframe/panel/main.ts')

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
