import { createI18n } from 'vue-i18n'
import type { App } from 'vue'
import zhCN from '../i18n/locales/zh-CN'
import enUS from '../i18n/locales/en-US'
import { StorageFactory } from '@prompt-optimizer/core'

// 定义支持的语言类型
type SupportedLocale = 'zh-CN' | 'en-US'
const SUPPORTED_LOCALES: SupportedLocale[] = ['zh-CN', 'en-US']

// 创建i18n实例
const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN' as SupportedLocale,
  fallbackLocale: {
    'zh-CN': ['en-US'],
    'default': ['en-US']
  },
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  }
})

// 初始化语言设置
async function initializeLanguage() {
  try {
    const storage = StorageFactory.createDefault()
    const savedLanguage = await storage.getItem('preferred-language')
    
    // 优先使用保存的语言设置
    if (savedLanguage && SUPPORTED_LOCALES.includes(savedLanguage as SupportedLocale)) {
      i18n.global.locale.value = savedLanguage as SupportedLocale
      return
    }
    
    // 其次使用浏览器语言设置
    const defaultLocale: SupportedLocale = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US'
    i18n.global.locale.value = defaultLocale
    await storage.setItem('preferred-language', defaultLocale)
  } catch (error) {
    console.error('初始化语言设置失败:', error)
    // 降级到默认语言
    i18n.global.locale.value = 'zh-CN'
  }
}

// 导出插件安装函数
export function installI18n(app: App) {
  initializeLanguage() // 异步初始化，不阻塞应用启动
  app.use(i18n)
}

// 导出i18n实例
export { i18n } 