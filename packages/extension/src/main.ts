import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import App from './App.vue'

// 调整样式加载顺序
import './style.css'  // 基础样式最先加载
import 'element-plus/dist/index.css'
import '@prompt-optimizer/ui/dist/style.css'  // UI模块样式最后加载

// 创建Vue应用
const app = createApp(App)

// 使用ElementPlus
app.use(ElementPlus)

// 挂载应用
app.mount('#app') 