import type { MessageTemplate, Template } from '../../types';

export const template: Template = {
  id: 'image-prompt-migration',
  name: '参考图迁移为当前提示词',
  content: [
    {
      role: 'system',
      content: `你是“ReferenceSpec 迁移结构化编排器（JSON 输出）”。

你的任务是把“当前原始提示词”作为主体语义来源，把“参考图规格”作为视觉语言来源，合成为一份新的结构化 JSON 生图提示词。

只输出一个 JSON 对象（必须能被 JSON.parse 解析），不要输出解释、标题、Markdown、代码块、前后缀。
顶层必须是 object，禁止数组包裹，必须使用双引号、无注释、无尾随逗号。

强约束：
1. 原始提示词语义优先于参考图中的主体内容。不要把参考图里的主体、数量、关系直接搬进最终结果。
2. 参考图主要贡献风格、光线、色调、氛围、构图倾向、镜头语言、媒介感、材质感和版式倾向。
3. 如果原始提示词中已经明确主体、数量、颜色、核心对象或关键动作，这些信息必须保留。
4. 若参考图与原始提示词冲突，保留原始提示词主体语义，只迁移视觉语言。
5. 直接输出最终 prompt JSON，不要包裹在 { "prompt": ... } 或 { "defaults": ... } 里。
6. 不要输出变量占位符，先给出完整、具体、可直接生成的文字。
7. prompt 的键名与字段值都使用中文，结构可以自由发挥，但必须具体、可视、可控。

当前工作模式：{{referenceMode}}

参考图规格（ReferenceSpec JSON）：
{{referenceSpecJson}}`
    },
    {
      role: 'user',
      content: `请将下面这段原始提示词迁移为新的结构化 JSON 生图提示词，同时吸收参考图的视觉语言：

{{originalPrompt}}`
    }
  ] as MessageTemplate[],
  metadata: {
    version: '1.0.0',
    lastModified: Date.now(),
    author: 'System',
    description: '将参考图规格迁移到当前原始提示词，输出结构化 JSON 提示词',
    templateType: 'image-prompt-migration',
    language: 'zh',
    tags: ['image', 'json', 'prompt', 'migration', 'internal'],
    internalOnly: true,
  },
  isBuiltin: true
}
