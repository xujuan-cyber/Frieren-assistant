import { describe, expect, it } from 'vitest'

import { TemplateManager } from '../../../src/services/template/manager'
import { MemoryStorageProvider } from '../../../src/services/storage/memoryStorageProvider'
import type {
  BuiltinTemplateLanguage,
  ITemplateLanguageService,
} from '../../../src/services/template/languageService'
import type { MessageTemplate, Template } from '../../../src/services/template/types'

class StubTemplateLanguageService implements ITemplateLanguageService {
  private lang: BuiltinTemplateLanguage

  constructor(lang: BuiltinTemplateLanguage) {
    this.lang = lang
  }

  async initialize() {}
  async getCurrentLanguage() {
    return this.lang
  }
  async setLanguage(language: BuiltinTemplateLanguage) {
    this.lang = language
  }
  async toggleLanguage() {
    this.lang = this.lang === 'zh-CN' ? 'en-US' : 'zh-CN'
    return this.lang
  }
  async isValidLanguage(language: string) {
    return language === 'zh-CN' || language === 'en-US'
  }
  async getSupportedLanguages() {
    return ['zh-CN', 'en-US'] as BuiltinTemplateLanguage[]
  }
  getLanguageDisplayName(language: BuiltinTemplateLanguage) {
    return language
  }
  isInitialized() {
    return true
  }
}

function getFirstMessageContent(template: Template, role: MessageTemplate['role']): string {
  if (typeof template.content === 'string') {
    throw new Error(`Expected template.content to be MessageTemplate[], got string for: ${template.id}`)
  }

  const message = template.content.find((item) => item.role === role)
  if (!message) {
    throw new Error(`Missing role=${role} message in template: ${template.id}`)
  }

  return message.content
}

describe('Image JSON structure preservation guardrails', () => {
  const legacyZhTemplateIds = [
    'image-general-optimize',
    'image-chinese-optimize',
    'image-photography-optimize',
    'image-creative-text2image',
  ]

  const legacyEnTemplateIds = [
    'image-general-optimize-en',
    'image-chinese-optimize-en',
    'image-photography-optimize-en',
    'image-creative-text2image-en',
  ]

  it('zh-CN legacy text2image optimize templates preserve JSON mode and placeholders when input is structured', async () => {
    const templateManager = new TemplateManager(
      new MemoryStorageProvider(),
      new StubTemplateLanguageService('zh-CN')
    )

    for (const templateId of legacyZhTemplateIds) {
      const template = await templateManager.getTemplate(templateId)
      const system = getFirstMessageContent(template, 'system')

      expect(system).toContain('如果原始提示词本身已经是结构化 JSON')
      expect(system).toContain('保留所有原始占位符')
      expect(system).toContain('不要把结构化 JSON 改写成自然语言段落')
    }
  })

  it('en-US legacy text2image optimize templates preserve JSON mode and placeholders when input is structured', async () => {
    const templateManager = new TemplateManager(
      new MemoryStorageProvider(),
      new StubTemplateLanguageService('en-US')
    )

    for (const templateId of legacyEnTemplateIds) {
      const template = await templateManager.getTemplate(templateId)
      const system = getFirstMessageContent(template, 'system')

      expect(system).toContain('If the original prompt is already structured JSON')
      expect(system).toContain('Preserve all original placeholder tokens exactly')
      expect(system).toContain('do not flatten structured JSON into prose')
    }
  })

  it('zh-CN json-structured optimize template preserves schema and placeholder tokens exactly', async () => {
    const templateManager = new TemplateManager(
      new MemoryStorageProvider(),
      new StubTemplateLanguageService('zh-CN')
    )

    const template = await templateManager.getTemplate('image-json-structured-optimize')
    const system = getFirstMessageContent(template, 'system')

    expect(system).toContain('优先沿用原有 JSON 结构')
    expect(system).toContain('保留所有原始占位符')
    expect(system).toContain('不要把占位符替换成泛化名词')
    expect(system).toContain('不要为了“更完整”而随意重命名字段或新增顶层字段')
    expect(system).toContain('默认保持原有顶层字段集合不变')
    expect(system).toContain('输出的顶层 key 集合必须与输入保持一致')
  })

  it('en-US json-structured optimize template preserves schema and placeholder tokens exactly', async () => {
    const templateManager = new TemplateManager(
      new MemoryStorageProvider(),
      new StubTemplateLanguageService('en-US')
    )

    const template = await templateManager.getTemplate('image-json-structured-optimize-en')
    const system = getFirstMessageContent(template, 'system')

    expect(system).toContain('Prefer to keep the existing JSON structure')
    expect(system).toContain('Preserve all original placeholder tokens exactly')
    expect(system).toContain('Do not replace placeholders with generic nouns')
    expect(system).toContain('do not rename fields or add top-level keys just to make it look more complete')
    expect(system).toContain('keep the original top-level key set by default')
    expect(system).toContain('the output top-level key set must match the input exactly')
  })

  it('zh-CN image iterate template follows lastOptimizedPrompt structure instead of iterateInput phrasing', async () => {
    const templateManager = new TemplateManager(
      new MemoryStorageProvider(),
      new StubTemplateLanguageService('zh-CN')
    )

    const template = await templateManager.getTemplate('image-iterate-general')
    const system = getFirstMessageContent(template, 'system')

    expect(system).toContain('以 lastOptimizedPrompt 的结构为准')
    expect(system).toContain('即使 iterateInput 没有提到 JSON，也要保持 JSON 输出')
    expect(system).toContain('保留所有原始占位符')
  })

  it('en-US image iterate template follows lastOptimizedPrompt structure instead of iterateInput phrasing', async () => {
    const templateManager = new TemplateManager(
      new MemoryStorageProvider(),
      new StubTemplateLanguageService('en-US')
    )

    const template = await templateManager.getTemplate('image-iterate-general-en')
    const system = getFirstMessageContent(template, 'system')

    expect(system).toContain('Follow the structure of lastOptimizedPrompt first')
    expect(system).toContain('Keep JSON output even if iterateInput does not mention JSON explicitly')
    expect(system).toContain('Preserve all original placeholder tokens exactly')
  })
})
