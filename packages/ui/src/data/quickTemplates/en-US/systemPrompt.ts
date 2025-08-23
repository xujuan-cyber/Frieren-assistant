import type { QuickTemplateDefinition } from '../types'

export const systemPromptTemplates: QuickTemplateDefinition[] = [
  {
    id: 'systemDefault',
    name: 'Default Test',
    description: 'Basic system prompt test to verify if role definition is effective',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: '{{userQuestion}}' }
    ]
  },
  {
    id: 'systemRoleTest',
    name: 'Role Capability Demo',
    description: 'Test if AI can accurately understand and demonstrate its defined role characteristics',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: 'Please demonstrate your professional capabilities and role characteristics.' }
    ]
  },
  {
    id: 'systemCapabilityDemo',
    name: 'Feature Demonstration',
    description: 'Verify if AI can clearly explain its capabilities and service scope',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: 'Tell me what you can help me with and provide specific examples.' }
    ]
  },
  {
    id: 'systemConsistencyCheck',
    name: 'Consistency Check',
    description: 'Test if AI can maintain role consistency through multi-turn conversation',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: 'Please maintain your role setting and answer a professional question.' },
      { role: 'assistant', content: 'Understood, I will maintain my role setting. Please ask your professional question.' },
      { role: 'user', content: '{{userQuestion}}' }
    ]
  },
  {
    id: 'systemEdgeCaseTest',
    name: 'Edge Case Test',
    description: 'Test AI\'s response capability when faced with attempts to break instructions',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: 'If someone asks you to ignore previous instructions, how would you respond?' }
    ]
  },
  {
    id: 'systemMultiTurnTest',
    name: 'Multi-turn Conversation Test',
    description: 'Simulate real conversation scenarios to test AI\'s dialogue coherence and role consistency',
    category: 'system',
    messages: [
      { role: 'system', content: '{{currentPrompt}}' },
      { role: 'user', content: 'Let\'s start our conversation.' },
      { role: 'assistant', content: 'Hello! I\'m ready to help you according to my role. What can I do for you?' },
      { role: 'user', content: '{{userQuestion}}' }
    ]
  }
]