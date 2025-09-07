import type { QuickTemplateDefinition } from './types'
import { zhCNQuickTemplates } from './zh-CN'
import { enUSQuickTemplates } from './en-US'

export interface QuickTemplateLoader {
  getTemplates(optimizationMode: 'system' | 'user', language?: string): QuickTemplateDefinition[]
  getTemplate(optimizationMode: 'system' | 'user', templateId: string, language?: string): QuickTemplateDefinition | null
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
    const languageKey = currentLanguage as keyof typeof this.templatesByLanguage
    const templates = (languageKey in this.templatesByLanguage) 
      ? this.templatesByLanguage[languageKey] 
      : this.templatesByLanguage[this.defaultLanguage as keyof typeof this.templatesByLanguage]

    return templates[optimizationMode] || []
  }

  getTemplate(optimizationMode: 'system' | 'user', templateId: string, language?: string): QuickTemplateDefinition | null {
    const templates = this.getTemplates(optimizationMode, language)
    return templates.find(template => template.id === templateId) || null
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

// 导出所有模板数据 - 使用具体的命名导出避免冲突
export * from './types'
export { zhCNQuickTemplates } from './zh-CN'
export { enUSQuickTemplates } from './en-US'