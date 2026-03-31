import { describe, expect, it } from 'vitest'

import { imagePromptCompositionTemplate } from '../../../src/services/template/default-templates/image-prompt-composition'
import { imagePromptMigrationTemplate } from '../../../src/services/template/default-templates/image-prompt-migration'

function collectContent(template: typeof imagePromptCompositionTemplate): string {
  return template.content
    .map((message) => (typeof message.content === 'string' ? message.content : ''))
    .join('\n\n')
}

describe('image reference prompt contracts', () => {
  it('uses a replication-first prompt contract for reference-only generation', () => {
    const content = collectContent(imagePromptCompositionTemplate)

    expect(content).toContain('目标是帮助用户尽可能重现这张图')
    expect(content).toContain('宁可保留具体事实，也不要过度抽象成风格总结')
    expect(content).toContain('不要为了模板感强行塞入变量')
    expect(content).toContain('默认使用中文')
    expect(content).toContain('{{变量名}}')
  })

  it('uses a direct style-migration contract when current prompt exists', () => {
    const content = collectContent(imagePromptMigrationTemplate)

    expect(content).toContain('当前提示词决定画什么')
    expect(content).toContain('参考图决定怎么画')
    expect(content).toContain('不要把参考图里的主体内容直接搬进结果')
    expect(content).toContain('最终结果本身就是一份可复用的风格迁移结果')
    expect(content).toContain('{{变量名}}')
    expect(content).toContain('默认使用中文')
  })
})
