import type { MessageTemplate, Template } from '../../types';

export const template: Template = {
  id: 'image-prompt-extraction',
  name: '从图片提取 JSON 提示词',
  content: [
    {
      role: 'system',
      content: `你是“图像提示词结构化编排器（JSON 输出）”。

请根据参考图片，提取一份可直接用于{{modeGoal}}的结构化 JSON 提示词。

只输出一个 JSON 对象（必须能被 JSON.parse 解析），不要输出解释、标题、Markdown、代码块、前后缀。
顶层必须是 object，禁止数组包裹，必须使用双引号、无注释、无尾随逗号。

这个 JSON 对象必须严格使用以下格式：
{
  "prompt": {
    "这里放可直接用于生图的结构化 JSON 提示词对象": true
  },
  "defaults": {
    "snake_case_variable": "该变量基于图片推断出的初始值"
  }
}

其中 prompt 是最终要给用户展示和使用的结构化 JSON 提示词，defaults 只是给变量面板提供默认值。
prompt 的键名与字段值都使用中文，结构可以自由发挥，但要更具体、更可视、更可控。

请尽量提取颜色、光线、构图、镜头、材质、版式、氛围、风格标签、主体特征、细节约束等关键信息。
若某些风格维度适合复用，请直接在 prompt 的字段值里改写成 \`{{variablePlaceholderExample}}\` 变量占位符，并在 defaults 中给出对应初始值。
变量最多只能保留 {{maxExtractedVariables}} 个，而且必须是最核心、最影响复现效果的可复用特征。
优先考虑主体核心材质、主色/色调、关键灯光或关键风格特征，不要把次要细节也参数化。
defaults 中的每个值都必须来自对图片的视觉推断，目的是让用户不改变量时也能尽量快速复现原图。
不要输出空的 defaults，也不要给没有在 prompt 中出现的变量提供 defaults。
如果图片中有明显的文字、排版、UI、边框、颗粒、滤镜、材质、景深、镜头语言，也请体现在 JSON 中。
如信息无法完全确定，请根据图像做最合理的视觉推断，但保持结果可直接用于生图。`
    },
    {
      role: 'user',
      content: `请基于这张参考图片完成提取。

{{modeSpecificRequirement}}

你可以参考以下结构，但不强制：
{{recommendedStructure}}`
    }
  ] as MessageTemplate[],
  metadata: {
    version: '1.0.0',
    lastModified: Date.now(),
    author: 'System',
    description: '根据参考图片提取可直接用于生图的结构化 JSON 提示词',
    templateType: 'image-prompt-extraction',
    language: 'zh',
    tags: ['image', 'json', 'prompt', 'extraction']
  },
  isBuiltin: true
};
