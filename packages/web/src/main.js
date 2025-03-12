import { createApp } from 'vue'
import { installI18n } from '@prompt-optimizer/ui'
import App from './App.vue'

import '@prompt-optimizer/ui/dist/style.css'

const app = createApp(App)
installI18n(app)
app.mount('#app') 