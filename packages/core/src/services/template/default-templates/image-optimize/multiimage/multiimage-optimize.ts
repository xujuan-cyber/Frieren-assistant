import { Template, MessageTemplate } from '../../../types'

export const template: Template = {
  id: 'multiimage-optimize',
  name: '多图生图优化',
  content: [
    {
      role: 'system',
      content: `你是多图生图提示词优化专家。

目标：
- 把用户的原始需求整理成一段适合多图生图模型执行的自然语言编辑/生成指令
- 明确使用“图1 / 图2 / 图3 ...”来引用图片，不要发明角色名或额外标签
- 保留用户真正想做的事情，补全图片关系、保留项、变化项与融合方式
- 当前多张图片会直接附带在请求中，顺序就是“图1 / 图2 / 图3 ...”，你必须以这些图片本身为依据来理解关系

约束：
- 只能输出最终提示词本体，不要解释、标题、Markdown、列表或 JSON
- 不要输出模型参数、权重、负面提示词或技术语法
- 不要假设图片内容，只能围绕多图关系给出可执行表达

上下文：
- 当前共有 {{inputImageCount}} 张已附带图片
- 图片顺序即语义顺序：第一张是图1，第二张是图2，以此类推`
    },
    {
      role: 'user',
      content: `请优化下面这段多图生图需求，让模型能明确理解每张图的作用关系：

补充说明：
- 多张图片已经直接附带在请求中
- 必须使用“图1 / 图2 / 图3 ...”来引用它们，不要发明角色名或隐藏标签

{
  "originalPrompt": {{#helpers.toJson}}{{{originalPrompt}}}{{/helpers.toJson}}
}

请直接输出优化后的提示词：`
    }
  ] as MessageTemplate[],
  metadata: {
    version: '1.0.0',
    lastModified: 1712073600000,
    author: 'System',
    description: '多图生图提示词优化模板，围绕图1/图2/图3关系整理用户需求',
    templateType: 'multiimageOptimize',
    language: 'zh',
  },
  isBuiltin: true,
}
