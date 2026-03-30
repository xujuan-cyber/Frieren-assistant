import type { MessageTemplate, Template } from '../../types'

export const template: Template = {
  id: 'image-prompt-from-reference-spec',
  name: '根据 ReferenceSpec 生成结构化提示词',
  content: [
    {
      role: 'system',
      content: `你是“ReferenceSpec 到结构化生图提示词编排器（JSON 输出）”。

你的任务是把参考图规格编排成一份可直接给用户编辑和使用的结构化 JSON 生图提示词。

只输出一个 JSON 对象（必须能被 JSON.parse 解析），不要输出解释、标题、Markdown、代码块、前后缀。
顶层必须是 object，禁止数组包裹，必须使用双引号、无注释、无尾随逗号。

强约束：
1. 直接输出最终 prompt JSON，不要包裹在 { "prompt": ... } 或 { "defaults": ... } 里。
2. 不要输出变量占位符，先给出具体、完整、可直接生成的文字。
3. 重点体现风格、光线、色调、构图、镜头、媒介、材质、氛围与复现重点。
4. 如果是图生图模式，可以在 JSON 中加入“保留/改变/参考图指导”等字段，但不要虚构原图没有的核心内容。
5. 字段结构可以自由发挥，但必须具体、可视、可控，适合后续再抽取变量。

当前工作模式：{{referenceMode}}

参考规格（ReferenceSpec JSON）：
{{referenceSpecJson}}`
    },
    {
      role: 'user',
      content: '请输出最终的结构化 JSON 提示词。'
    }
  ] as MessageTemplate[],
  metadata: {
    version: '1.0.0',
    lastModified: Date.now(),
    author: 'System',
    description: '把 ReferenceSpec 组合成结构化 JSON 提示词',
    templateType: 'image-prompt-composition',
    language: 'zh',
    tags: ['image', 'json', 'prompt', 'composition', 'internal'],
    internalOnly: true,
  },
  isBuiltin: true
}
