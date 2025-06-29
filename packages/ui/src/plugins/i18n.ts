import { createI18n } from 'vue-i18n'
import type { App } from 'vue'
import zhCN from '../i18n/locales/zh-CN'
import enUS from '../i18n/locales/en-US'
import type { IStorageProvider } from '@prompt-optimizer/core'

// 插件层直接定义存储键，避免依赖UI组件层
const PREFERRED_LANGUAGE_KEY = 'app:settings:ui:preferred-language'

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

// 初始化语言设置 - 接收存储实例以确保Electron环境下的数据一致性
async function initializeLanguage(storage: IStorageProvider) {
  try {
    const savedLanguage = await storage.getItem(PREFERRED_LANGUAGE_KEY)

    // 优先使用保存的语言设置
    if (savedLanguage && SUPPORTED_LOCALES.includes(savedLanguage as SupportedLocale)) {
      i18n.global.locale.value = savedLanguage as SupportedLocale
      return
    }

    // 其次使用浏览器语言设置
    const defaultLocale: SupportedLocale = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US'
    i18n.global.locale.value = defaultLocale
    await storage.setItem(PREFERRED_LANGUAGE_KEY, defaultLocale)
  } catch (error) {
    console.error('初始化语言设置失败:', error)
    // 降级到默认语言
    i18n.global.locale.value = 'zh-CN'
  }
}

// 导出插件安装函数 - 接收存储实例以确保数据一致性
export function installI18n(app: App, storage?: IStorageProvider) {
  if (storage) {
    initializeLanguage(storage) // 异步初始化，不阻塞应用启动
  } else {
    // 如果没有提供存储实例，使用默认语言（主要用于测试环境）
    console.warn('[i18n] 没有提供存储实例，使用默认语言设置')
    i18n.global.locale.value = 'zh-CN'
  }
  app.use(i18n)
}

// 导出延迟初始化函数 - 用于Extension等需要等待服务初始化的场景
export async function initializeI18nWithStorage(storage: IStorageProvider) {
  await initializeLanguage(storage)
}

// 导出基础安装函数 - 只安装插件，不初始化语言
export function installI18nOnly(app: App) {
  app.use(i18n)
}

// 导出i18n实例
export { i18n }