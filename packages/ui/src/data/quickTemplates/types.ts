export interface QuickTemplateMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
  tool_calls?: {
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }[]
  tool_call_id?: string
}

export interface QuickTemplate {
  name: string
  messages: QuickTemplateMessage[]
  description?: string
  category?: 'system' | 'user'
  language: string
}

export interface QuickTemplateDefinition {
  id: string
  name: string
  description?: string
  category: 'system' | 'user'
  messages: QuickTemplateMessage[]
}
