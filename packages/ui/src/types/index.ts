// 模型相关类型
export interface Model {
  key: string
  name: string
  enabled: boolean
  config: Record<string, any>
}

// 提示词模板相关类型
export interface Template {
  id: string
  name: string
  type: 'optimize' | 'iterate'
  content: string
  description?: string
  metadata?: Record<string, any>
}

// 历史记录相关类型
export interface PromptRecord {
  id: string
  originalPrompt: string
  optimizedPrompt: string
  type: 'optimize' | 'iterate'
  modelKey: string
  templateId: string
  timestamp: number
  metadata: Record<string, any>
}

export interface PromptChain {
  chainId: string
  versions: PromptRecord[]
  rootRecord: PromptRecord
  currentRecord: PromptRecord
}

// 服务相关类型
export interface LLMService {
  callModel(prompt: string, modelKey: string): Promise<string>
  streamModel(prompt: string, modelKey: string, handlers: StreamHandlers): Promise<void>
}

export interface PromptService {
  optimizePromptStream(
    prompt: string,
    modelKey: string,
    template: string,
    handlers: StreamHandlers
  ): Promise<void>
  
  iteratePromptStream(
    originalPrompt: string,
    iterateInput: string,
    modelKey: string,
    handlers: StreamHandlers,
    template?: Template
  ): Promise<void>
  
  testPromptStream(
    prompt: string,
    testContent: string,
    modelKey: string,
    handlers: StreamHandlers
  ): Promise<void>
}

// 管理器相关类型
export interface ModelManager {
  getAllModels(): Model[]
  getModel(key: string): Model | undefined
  updateModel(key: string, updates: Partial<Model>): void
}

export interface TemplateManager {
  getTemplate(id: string): Promise<Template | null>
  getTemplatesByType(type: 'optimize' | 'iterate'): Promise<Template[]>
  createTemplate(template: Omit<Template, 'id'>): Promise<Template>
  updateTemplate(id: string, updates: Partial<Template>): Promise<Template>
  deleteTemplate(id: string): Promise<void>
}

export interface HistoryManager {
  init(): Promise<void>
  getAllChains(): PromptChain[]
  createNewChain(record: Omit<PromptRecord, 'chainId'>): PromptChain
  addIteration(params: {
    chainId: string
    originalPrompt: string
    optimizedPrompt: string
    iterationNote: string
    modelKey: string
    templateId: string
  }): PromptChain
  clearHistory(): Promise<void>
}

// 工具类型
export interface StreamHandlers {
  onToken: (token: string) => void
  onComplete: () => void
  onError: (error: Error) => void
} 