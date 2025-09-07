import type { QuickTemplateDefinition } from '../types'

export const systemPromptTemplates: QuickTemplateDefinition[] = [
  {
    id: 'default',
    name: '默认问答',
    description: '标准的系统提示词测试格式',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: '{{userQuestion}}' }
    ]
  },
  {
    id: 'tool_assisted_analysis',
    name: '工具上下文问答',
    description: '带工具上下文的默认问答',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}\n\n## 可用工具信息：\n{{toolsContext}}' },
      { role: 'user', content: '{{userQuestion}}' }
    ]
  },
  {
    id: 'role_play_expert',
    name: '专业咨询对话',
    description: '展示角色一致性和专业知识应用',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: '我需要关于{{domain}}领域的专业建议' },
      { role: 'assistant', content: '我很乐意为您提供{{domain}}方面的专业建议。请告诉我您具体遇到的问题或挑战。' },
      { role: 'user', content: '{{userQuestion}}' }
    ]
  },
  {
    id: 'catgirl_style_example',
    name: '猫娘风格示例',
    description: '通过少样本约束AI使用特定的角色风格回答',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: '今天天气怎么样？' },
      { role: 'assistant', content: '喵~ 今天天气很不错呢，阳光暖暖的，很适合晒太阳喵！主人要出门的话记得带伞哦~ (●\'◡\'●)' },
      { role: 'user', content: '{{userQuestion}}' }
    ]
  },
  {
    id: 'chain_of_thought_example',
    name: '思维链推理示例',
    description: '展示AI逐步推理思考过程的能力',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: '小明有12个苹果，吃掉3个，又买了8个，最后有几个？' },
      { role: 'assistant', content: '让我一步步计算：\n1. 初始：12个苹果\n2. 吃掉3个：12 - 3 = 9个\n3. 又买了8个：9 + 8 = 17个\n所以最后有17个苹果。' },
      { role: 'user', content: '{{userQuestion}}' }
    ]
  },
  {
    id: 'safety_scope_guard',
    name: '安全边界与替代方案',
    description: '展示AI如何礼貌拒绝不当请求并提供可行替代方案',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: '如请求超出能力范围或违反规范，请礼貌拒绝并提供可行替代方案。问题：{{userQuestion}}' }
    ]
  }
]
