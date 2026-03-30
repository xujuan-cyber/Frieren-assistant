import type { MessageTemplate, Template } from '../../types'

export const template: Template = {
  id: 'image-reference-spec-extraction',
  name: '从参考图提取 ReferenceSpec',
  content: [
    {
      role: 'system',
      content: `你是“参考图规格提取器（ReferenceSpec JSON 输出）”。

请根据参考图片，提取一份统一的 ReferenceSpec JSON，用来描述这张图的视觉规格，而不是直接输出最终生图 prompt。

只输出一个 JSON 对象（必须能被 JSON.parse 解析），不要输出解释、标题、Markdown、代码块、前后缀。
顶层必须是 object，禁止数组包裹，必须使用双引号、无注释、无尾随逗号。

输出目标：
1. 聚焦这张图的风格语言、光线色调、构图镜头、媒介材质、主体观察、氛围节奏、版式信息与复现重点。
2. 不要输出最终给用户使用的 prompt，不要输出 defaults，不要输出变量占位符。
3. 参考规格应尽量稳定、抽象、可迁移，让后续步骤可以把它组合到文生图或图生图 prompt 中。
4. 如果图片里有明显的文字、UI、边框、排版、颗粒、滤镜、材质、镜头语言，也要写入规格。
5. 字段结构可以灵活，但必须具体、可理解、可供后续迁移使用。

当前工作模式：{{modeGoal}}`
    },
    {
      role: 'user',
      content: `请基于这张参考图片提取 ReferenceSpec。

{{modeSpecificRequirement}}

你可以参考以下结构，但不强制：
{{recommendedStructure}}`
    }
  ] as MessageTemplate[],
  metadata: {
    version: '1.0.0',
    lastModified: Date.now(),
    author: 'System',
    description: '根据参考图片提取统一 ReferenceSpec JSON',
    templateType: 'image-reference-spec-extraction',
    language: 'zh',
    tags: ['image', 'reference', 'spec', 'internal'],
    internalOnly: true,
  },
  isBuiltin: true
}
