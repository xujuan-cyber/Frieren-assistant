import type { QuickTemplateDefinition } from '../types'

export const systemPromptTemplates: QuickTemplateDefinition[] = [
  {
    id: 'default',
    name: 'Default Q&A',
    description: 'Standard system prompt test format',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: '{{userQuestion}}' }
    ]
  },
  {
    id: 'tool_assisted_analysis',
    name: 'Tool Context Q&A',
    description: 'Default Q&A with tool context',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}\n\n## Available Tools Information:\n{{toolsContext}}' },
      { role: 'user', content: '{{userQuestion}}' }
    ]
  },
  {
    id: 'role_play_expert',
    name: 'Professional Consultation',
    description: 'Demonstrate role consistency and professional knowledge application',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: 'I need professional advice regarding the {{domain}} field' },
      { role: 'assistant', content: 'I\'d be happy to provide professional advice in the {{domain}} area. Please tell me about the specific issues or challenges you\'re facing.' },
      { role: 'user', content: '{{userQuestion}}' }
    ]
  },
  {
    id: 'catgirl_style_example',
    name: 'Catgirl Style Example',
    description: 'Use few-shot prompting to constrain AI to use specific character style responses',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: 'How\'s the weather today?' },
      { role: 'assistant', content: 'Nya~ The weather is really nice today, sunny and warm, perfect for sunbathing nya! Master, if you\'re going out, remember to bring an umbrella~ (●\'◡\'●)' },
      { role: 'user', content: '{{userQuestion}}' }
    ]
  },
  {
    id: 'chain_of_thought_example',
    name: 'Chain of Thought Example',
    description: 'Demonstrate AI\'s step-by-step reasoning and thinking process',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: 'Tom has 12 apples, ate 3, then bought 8 more. How many apples does he have now?' },
      { role: 'assistant', content: 'Let me calculate step by step:\n1. Initial: 12 apples\n2. After eating 3: 12 - 3 = 9 apples\n3. After buying 8 more: 9 + 8 = 17 apples\nSo Tom has 17 apples in the end.' },
      { role: 'user', content: '{{userQuestion}}' }
    ]
  },
  {
    id: 'safety_scope_guard',
    name: 'Safety Boundaries & Alternatives',
    description: 'Demonstrate how AI politely declines inappropriate requests and provides viable alternatives',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: 'If the request exceeds capability scope or violates guidelines, please politely decline and provide viable alternatives. Question: {{userQuestion}}' }
    ]
  }
]
