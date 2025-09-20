import { IImportExportable } from '../../interfaces/import-export'
import type { ModelInfo } from '../llm/types'

// === 基础类型（请求/结果/进度） ===

export interface ImageInputRef {
  b64?: string
  url?: string
  mimeType?: string
}

export interface ImageRequest {
  prompt: string
  // 本地文件上传转成 base64；仅支持 0 或 1 张
  inputImage?: ImageInputRef
  // 生成张数（串行），默认 1，最大建议 4
  count?: number
  // 可选参数（按厂商能力选择性透传）
  imgParams?: {
    outputMimeType?: 'image/png' | 'image/jpeg'
    width?: number
    height?: number
    size?: string // 例如 Seedream 的 1K/2K/4K 或 'WxH'，OpenAI 的 '1024x1024'
    seed?: number
    guidance_scale?: number
    watermark?: boolean
    // OpenAI DALL-E 3 特有参数
    quality?: 'standard' | 'hd'
    style?: 'vivid' | 'natural'
  }
}

export interface ImageResultItem {
  b64?: string
  url?: string
  mimeType?: string
}

export interface ImageResult {
  images: ImageResultItem[]
  metadata?: {
    model?: string
    notes?: string[]
    // 扩展metadata支持更多字段
    finishReason?: string
    originalPrompt?: string
    usage?: any
    created?: number
  }
}

export interface ImageProgressHandlers {
  onProgress?: (stage: 'queued' | 'generating' | 'done' | string | number) => void
  onPreview?: (img: { b64: string }) => void
  onComplete?: (result: ImageResult) => void
  onError?: (error: Error) => void
}

// === 模型配置与管理器接口 ===

export interface ImageModelConfig {
  name: string
  baseURL?: string
  apiKey?: string
  defaultModel: string
  enabled: boolean
  provider: 'gemini' | 'seedream' | 'openai' | 'custom' | string
  useVercelProxy?: boolean
  useDockerProxy?: boolean
  imgParams?: Record<string, any>
  capabilities?: {
    edit?: boolean
    multiImage?: boolean
    asyncJob?: boolean
    streamingPreview?: boolean
  }
}

export interface IImageModelManager extends IImportExportable {
  ensureInitialized(): Promise<void>
  isInitialized(): Promise<boolean>
  getAllModels(): Promise<Array<ImageModelConfig & { key: string }>>
  getModel(key: string): Promise<ImageModelConfig | undefined>
  addModel(key: string, config: ImageModelConfig): Promise<void>
  updateModel(key: string, config: Partial<ImageModelConfig>): Promise<void>
  deleteModel(key: string): Promise<void>
  enableModel(key: string): Promise<void>
  disableModel(key: string): Promise<void>
  getEnabledModels(): Promise<Array<ImageModelConfig & { key: string }>>
}

// === 适配器接口与注册表 ===

export interface IImageProviderAdapter {
  // 统一的生成方法（内部可阻塞直到完成）
  generate(request: ImageRequest, config: ImageModelConfig, handlers?: ImageProgressHandlers): Promise<ImageResult>
  // 可选的模型拉取方法
  fetchModels?: (config: ImageModelConfig) => Promise<ModelInfo[]>
  // 能力说明
  capabilities: NonNullable<ImageModelConfig['capabilities']>
}

export interface IImageAdapterRegistry {
  getAdapter(provider: string): IImageProviderAdapter
}

export interface IImageService {
  imageModelManager: IImageModelManager
  registry: IImageAdapterRegistry
  validateRequest(req: ImageRequest): void
  generate(request: ImageRequest, modelKey: string, handlers?: ImageProgressHandlers): Promise<ImageResult>
}

