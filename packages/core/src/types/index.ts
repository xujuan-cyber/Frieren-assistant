// Core types
export interface PromptTemplate {
  id: string
  name: string
  description: string
  content: string
  metadata?: Record<string, any>
}

export interface LLMConfig {
  name: string
  baseURL: string
  apiKey: string
  models: string[]
}

export interface HistoryRecord {
  id: string
  timestamp: number
  input: string
  output: string
  model: string
  metadata?: Record<string, any>
} 