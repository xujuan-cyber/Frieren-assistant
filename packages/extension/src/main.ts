import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import './style.css'

// 创建Vue应用
const app = createApp(App)

// 使用ElementPlus
app.use(ElementPlus)

// 挂载应用
app.mount('#app') 