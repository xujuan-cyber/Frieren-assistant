import type { QuickTemplateDefinition } from './types'
import { zhCNQuickTemplates } from './zh-CN'
import { enUSQuickTemplates } from './en-US'

export interface QuickTemplateLoader {
  getTemplates(optimizationMode: 'system' | 'user', language?: string): QuickTemplateDefinition[]
  getSupportedLanguages(): string[]
}

export class QuickTemplateManager implements QuickTemplateLoader {
  private templatesByLanguage = {
    'zh-CN': zhCNQuickTemplates,
    'en-US': enUSQuickTemplates
  }

  private defaultLanguage = 'zh-CN'

  getTemplates(optimizationMode: 'system' | 'user', language?: string): QuickTemplateDefinition[] {
    const currentLanguage = language || this.defaultLanguage
    
    // 优先使用请求的语言，如果不存在则回退到默认语言
    const templates = this.templatesByLanguage[currentLanguage as keyof typeof this.templatesByLanguage] || 
                     this.templatesByLanguage[this.defaultLanguage]

    return templates[optimizationMode] || []
  }

  getSupportedLanguages(): string[] {
    return Object.keys(this.templatesByLanguage)
  }

  setDefaultLanguage(language: string): void {
    if (this.getSupportedLanguages().includes(language)) {
      this.defaultLanguage = language
    }
  }
}

// 导出单例实例
export const quickTemplateManager = new QuickTemplateManager()

// 导出所有模板数据
export * from './types'
export * from './zh-CN'
export * from './en-US'