import type { QuickTemplateDefinition } from '../types'

export const userPromptTemplates: QuickTemplateDefinition[] = [
  {
    id: 'userSimpleTest',
    name: 'Simple Test',
    description: 'Directly test user prompt without adding any context',
    category: 'user',
    messages: [
      { role: 'user', content: '{{currentPrompt}}' }
    ]
  },
  {
    id: 'userWithContext',
    name: 'Test with Context',
    description: 'Test user prompt with basic context provided by system role',
    category: 'user',
    messages: [
      { role: 'system', content: 'Please provide helpful, accurate and detailed responses based on user requests.' },
      { role: 'user', content: '{{currentPrompt}}' }
    ]
  },
  {
    id: 'userExpertMode',
    name: 'Expert Mode',
    description: 'Have AI respond to user prompt from a professional expert perspective',
    category: 'user',
    messages: [
      { role: 'system', content: 'You are an expert in the field. Please answer user questions from a professional perspective, providing deep insights and advice.' },
      { role: 'user', content: '{{currentPrompt}}' }
    ]
  },
  {
    id: 'userStepByStep',
    name: 'Step-by-step Response',
    description: 'Ask AI to answer user prompt questions in detailed steps',
    category: 'user',
    messages: [
      { role: 'system', content: 'Please answer user questions step by step in detail, ensuring each step is clear and understandable.' },
      { role: 'user', content: '{{currentPrompt}}' }
    ]
  },
  {
    id: 'userCreativeMode',
    name: 'Creative Mode',
    description: 'Inspire AI\'s creative thinking to answer user prompt',
    category: 'user',
    messages: [
      { role: 'system', content: 'Use your creativity to answer user questions in an innovative and interesting way.' },
      { role: 'user', content: '{{currentPrompt}}' }
    ]
  },
  {
    id: 'userComparison',
    name: 'Comparative Analysis',
    description: 'Ask AI to provide multi-perspective comparison and analysis for user prompt',
    category: 'user',
    messages: [
      { role: 'system', content: 'Please comprehensively analyze user questions and provide multi-perspective comparisons and evaluations.' },
      { role: 'user', content: '{{currentPrompt}}' },
      { role: 'assistant', content: 'I will analyze your question from multiple perspectives:' },
      { role: 'user', content: 'Please continue with detailed analysis.' }
    ]
  },
  {
    id: 'userDialogue',
    name: 'Interactive Dialogue',
    description: 'Explore user prompt content in depth through interactive dialogue',
    category: 'user',
    messages: [
      { role: 'user', content: '{{currentPrompt}}' },
      { role: 'assistant', content: 'That\'s an interesting question, let me help you analyze it.' },
      { role: 'user', content: 'Please provide more specific suggestions and examples.' }
    ]
  }
]