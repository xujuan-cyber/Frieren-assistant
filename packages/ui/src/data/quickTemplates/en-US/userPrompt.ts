import type { QuickTemplateDefinition } from '../types'

export const userPromptTemplates: QuickTemplateDefinition[] = [
  {
    id: 'default',
    name: 'Direct Execution',
    description: 'Process user request directly without additional enhancement',
    category: 'user',
    messages: [
      { role: 'user', content: '{{currentPrompt}}' }
    ]
  },
  {
    id: 'tool_enhanced_execution',
    name: 'Tool Context Execution',
    description: 'Process user request using tool context',
    category: 'user',
    messages: [
      { role: 'system', content: 'Available tools: {{toolsContext}}' },
      { role: 'user', content: '{{currentPrompt}}' }
    ]
  },
  {
    id: 'structured_output',
    name: 'Structured Output Format',
    description: 'Process and respond to user requests in a structured format',
    category: 'user',
    messages: [
      { role: 'user', content: 'Please follow this output format:\nRequirement Analysis: ...\nTechnical Solution: ...\nCode Implementation: ...\n\nNow please process: {{currentPrompt}}' }
    ]
  },
  {
    id: 'expert_consultation',
    name: 'Expert Consultation Mode',
    description: 'Provide in-depth advice and solutions as a professional expert',
    category: 'user',
    messages: [
      { role: 'user', content: 'As an expert in the field, {{currentPrompt}}, and provide best practice recommendations' }
    ]
  },
  {
    id: 'step_by_step_analysis',
    name: 'Chain of Thought Analysis',
    description: 'Show step-by-step analysis and reasoning process instead of direct conclusions',
    category: 'user',
    messages: [
      { role: 'user', content: 'Please analyze and solve step by step: {{currentPrompt}}' }
    ]
  },
  {
    id: 'multiple_solutions',
    name: 'Multiple Solutions Comparison',
    description: 'Provide multiple solutions and compare their pros and cons for decision-making',
    category: 'user',
    messages: [
      { role: 'user', content: '{{currentPrompt}}, please provide multiple solutions and compare their pros and cons' }
    ]
  }
]
