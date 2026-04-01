import { describe, expect, it } from 'vitest'

import { imagePromptCompositionTemplate } from '../../../src/services/template/default-templates/image-prompt-composition'
import { imagePromptMigrationTemplate } from '../../../src/services/template/default-templates/image-prompt-migration'
import { TemplateProcessor } from '../../../src/services/template/processor'

function collectContent(template: typeof imagePromptCompositionTemplate): string {
  return template.content
    .map((message) => (typeof message.content === 'string' ? message.content : ''))
    .join('\n\n')
}

describe('image reference prompt contracts', () => {
  it('uses a replication-first prompt contract for reference-only generation', () => {
    const content = collectContent(imagePromptCompositionTemplate)

    expect(content).toContain('唯一目标：把这张参考图尽可能准确地翻译')
    expect(content).toContain('prompt 内的键名与字段值默认都使用中文')
    expect(content).toContain('严禁主动添加')
    expect(content).toContain('不要直接写角色专名')
    expect(content).toContain('尽量写进 prompt，不要只保留主体本身')
    expect(content).toContain('必须保守命名')
    expect(content).toContain('变量是锦上添花，不是主要目标')
    expect(content).toContain('只有以下类型默认考虑变量化')
    expect(content).toContain('变量优先顺序固定为')
    expect(content).toContain('不要把以下内容做成变量')
    expect(content).toContain('提交前自检三次')
  })

  it('renders the literal double-brace placeholder guidance for reference-only generation', () => {
    const messages = TemplateProcessor.processTemplate(imagePromptCompositionTemplate, {
      generationGoal: '文生图参考生成',
      promptRequirement: '当前没有原始提示词，请直接根据参考图反推一份可复用、可直接生图的结构化 JSON 提示词。',
    })
    const systemPrompt = messages.find((message) => message.role === 'system')?.content ?? ''

    expect(systemPrompt).toContain('{{变量名}}')
    expect(systemPrompt).not.toContain('以  的形式')
  })

  it('uses a direct style-migration contract when current prompt exists', () => {
    const content = collectContent(imagePromptMigrationTemplate)

    expect(content).toContain('当前提示词决定画什么')
    expect(content).toContain('参考图决定怎么画')
    expect(content).toContain('不要把参考图里的主体内容直接搬进结果')
    expect(content).toContain('最终结果本身就是一份可复用的风格迁移结果')
    expect(content).toContain('优先提取 2 到 5 个高复用变量')
    expect(content).toContain('{{变量名}}')
    expect(content).toContain('默认使用中文')
  })
})
