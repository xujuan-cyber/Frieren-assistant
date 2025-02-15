import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import App from './App.vue'

// 样式导入顺序很重要
import 'element-plus/dist/index.css'
import '@prompt-optimizer/ui/style.css'  // UI模块样式
import './style.css'

// 创建Vue应用
const app = createApp(App)

// 使用ElementPlus
app.use(ElementPlus)

// 挂载应用
app.mount('#app') 