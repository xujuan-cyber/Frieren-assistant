export interface QuickTemplateMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
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