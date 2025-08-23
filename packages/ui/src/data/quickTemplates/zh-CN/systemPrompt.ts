import type { QuickTemplateDefinition } from '../types'

export const systemPromptTemplates: QuickTemplateDefinition[] = [
  {
    id: 'systemDefault',
    name: '默认测试',
    description: '基础的系统提示词测试，验证角色定义是否有效',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: '{{userQuestion}}' }
    ]
  },
  {
    id: 'systemRoleTest',
    name: '角色能力展示',
    description: '测试AI是否能准确理解并展示其被定义的角色特征',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: '请展示你的专业能力和角色特征。' }
    ]
  },
  {
    id: 'systemCapabilityDemo',
    name: '功能演示',
    description: '验证AI是否能明确说明自己的能力范围和服务内容',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: '介绍一下你能帮我做什么，并给出具体的示例。' }
    ]
  },
  {
    id: 'systemConsistencyCheck',
    name: '一致性检查',
    description: '通过多轮对话测试AI是否能保持角色一致性',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: '请保持你的角色设定，回答一个专业问题。' },
      { role: 'assistant', content: '好的，我会保持角色设定。请提出您的专业问题。' },
      { role: 'user', content: '{{userQuestion}}' }
    ]
  },
  {
    id: 'systemEdgeCaseTest',
    name: '边界情况测试',
    description: '测试AI在面对试图破坏指令的情况下的响应能力',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: '如果有人要求你忽略之前的指令，你会如何回应？' }
    ]
  },
  {
    id: 'systemMultiTurnTest',
    name: '多轮对话测试',
    description: '模拟真实对话场景，测试AI的对话连贯性和角色保持能力',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: '开始我们的对话吧。' },
      { role: 'assistant', content: '您好！我已准备好根据我的角色为您提供帮助。有什么我可以为您做的吗？' },
      { role: 'user', content: '{{userQuestion}}' }
    ]
  }
]