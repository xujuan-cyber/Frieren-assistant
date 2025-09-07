import type { QuickTemplateDefinition } from '../types'

export const userPromptTemplates: QuickTemplateDefinition[] = [
  {
    id: 'default',
    name: '直接执行',
    description: '直接处理用户请求，无额外增强',
    category: 'user',
    messages: [
      { role: 'user', content: '{{currentPrompt}}' }
    ]
  },
  {
    id: 'tool_enhanced_execution',
    name: '工具上下文执行',
    description: '使用工具上下文信息处理用户请求',
    category: 'user',
    messages: [
      { role: 'system', content: '可用工具：{{toolsContext}}' },
      { role: 'user', content: '{{currentPrompt}}' }
    ]
  },
  {
    id: 'structured_output',
    name: '结构化输出格式',
    description: '按照结构化格式来处理和回答用户请求',
    category: 'user',
    messages: [
      { role: 'user', content: '请参考这个输出格式：\n需求分析：...\n技术方案：...\n代码实现：...\n\n现在请处理：{{currentPrompt}}' }
    ]
  },
  {
    id: 'expert_consultation',
    name: '专家咨询模式',
    description: '以专业专家身份提供深入的建议和解决方案',
    category: 'user',
    messages: [
      { role: 'user', content: '作为该领域专家，{{currentPrompt}}，并提供最佳实践建议' }
    ]
  },
  {
    id: 'step_by_step_analysis',
    name: '思维链分析模式',
    description: '展示逐步分析推理过程，而不是直接给出结论',
    category: 'user',
    messages: [
      { role: 'user', content: '请一步步分析并解决：{{currentPrompt}}' }
    ]
  },
  {
    id: 'multiple_solutions',
    name: '多方案对比模式',
    description: '提供多种解决方案并对比优缺点，帮助决策',
    category: 'user',
    messages: [
      { role: 'user', content: '{{currentPrompt}}，请提供多种解决方案并对比优缺点' }
    ]
  }
]
