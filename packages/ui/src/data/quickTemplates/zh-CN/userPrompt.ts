import type { QuickTemplateDefinition } from '../types'

export const userPromptTemplates: QuickTemplateDefinition[] = [
  {
    id: 'userSimpleTest',
    name: '简单测试',
    description: '直接测试用户提示词，不添加任何上下文',
    category: 'user',
    messages: [
      { role: 'user', content: '{{currentPrompt}}' }
    ]
  },
  {
    id: 'userWithContext',
    name: '带上下文测试',
    description: '在系统角色提供基础上下文的情况下测试用户提示词',
    category: 'user',
    messages: [
      { role: 'system', content: '请根据用户的要求，提供有帮助、准确和详细的回答。' },
      { role: 'user', content: '{{currentPrompt}}' }
    ]
  },
  {
    id: 'userExpertMode',
    name: '专家模式',
    description: '让AI以专业专家的角度回答用户提示词',
    category: 'user',
    messages: [
      { role: 'system', content: '你是该领域的专家，请以专业的角度回答用户问题，提供深入的见解和建议。' },
      { role: 'user', content: '{{currentPrompt}}' }
    ]
  },
  {
    id: 'userStepByStep',
    name: '分步解答',
    description: '要求AI按步骤详细回答用户提示词中的问题',
    category: 'user',
    messages: [
      { role: 'system', content: '请按步骤详细回答用户的问题，确保每个步骤都清晰易懂。' },
      { role: 'user', content: '{{currentPrompt}}' }
    ]
  },
  {
    id: 'userCreativeMode',
    name: '创意模式',
    description: '激发AI的创造性思维来回答用户提示词',
    category: 'user',
    messages: [
      { role: 'system', content: '发挥你的创造力，以创新和有趣的方式回答用户问题。' },
      { role: 'user', content: '{{currentPrompt}}' }
    ]
  },
  {
    id: 'userComparison',
    name: '对比分析',
    description: '要求AI进行多角度的对比和分析来回答用户提示词',
    category: 'user',
    messages: [
      { role: 'system', content: '请全面分析用户的问题，提供多角度的对比和评价。' },
      { role: 'user', content: '{{currentPrompt}}' },
      { role: 'assistant', content: '我将从多个角度来分析您的问题：' },
      { role: 'user', content: '请继续详细分析。' }
    ]
  },
  {
    id: 'userDialogue',
    name: '互动对话',
    description: '通过对话式交互来深入探讨用户提示词的内容',
    category: 'user',
    messages: [
      { role: 'user', content: '{{currentPrompt}}' },
      { role: 'assistant', content: '这是一个很有趣的问题，让我来帮您分析一下。' },
      { role: 'user', content: '请提供更具体的建议和实例。' }
    ]
  }
]