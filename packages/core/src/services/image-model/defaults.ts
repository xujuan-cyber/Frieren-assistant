import { ImageModelConfig, IImageAdapterRegistry } from '../image/types'
import { getEnvVar } from '../../utils/environment'

/**
 * 图像模型默认配置生成器
 * 返回完整的自包含配置对象，包含provider和model完整信息
 */
export function getDefaultImageModels(registry: IImageAdapterRegistry): Record<string, ImageModelConfig> {
  const GEMINI_API_KEY = getEnvVar('VITE_GEMINI_API_KEY').trim()
  const SEEDREAM_API_KEY = (
    getEnvVar('VITE_SEEDREAM_API_KEY') ||
    getEnvVar('VITE_ARK_API_KEY') ).trim()
  const SEEDREAM_BASE_URL = (
    getEnvVar('VITE_SEEDREAM_BASE_URL') ||
    getEnvVar('VITE_ARK_BASE_URL') ).trim()
  const OPENROUTER_API_KEY = getEnvVar('VITE_OPENROUTER_API_KEY').trim()
  const SILICONFLOW_API_KEY = getEnvVar('VITE_SILICONFLOW_API_KEY').trim()
  const OPENAI_API_KEY = getEnvVar('VITE_OPENAI_API_KEY').trim()
  const OPENAI_BASE_URL = getEnvVar('VITE_OPENAI_BASE_URL').trim()
  // 辅助函数：构建完整配置
  const buildConfig = (
    configId: string,
    name: string,
    providerId: string,
    modelId: string,
    enabled: boolean,
    connectionConfig?: any,
    paramOverrides?: any
  ): ImageModelConfig => {
    // 获取provider信息
    const adapter = registry.getAdapter(providerId)
    const provider = adapter.getProvider()

    // 尝试从静态模型列表获取模型信息
    let model = registry.getStaticModels(providerId).find(m => m.id === modelId)

    // 如果静态模型不存在，使用buildDefaultModel构建
    if (!model) {
      model = adapter.buildDefaultModel(modelId)
    }

    return {
      id: configId,
      name,
      providerId,
      modelId,
      enabled,
      connectionConfig,
      paramOverrides,
      provider,
      model
    }
  }

  // 以字典列表描述默认配置，避免重复书写 id
  const entries = [
    {
      id: 'image-openrouter-nanobanana',
      name: 'OpenRouter Nano Banana',
      providerId: 'openrouter',
      modelId: 'google/gemini-2.5-flash-image-preview',
      enabled: !!OPENROUTER_API_KEY,
      connectionConfig: { apiKey: OPENROUTER_API_KEY, baseURL: 'https://openrouter.ai/api/v1' },
      paramOverrides: {}
    },
    {
      id: 'image-gemini-nanobanana',
      name: 'Gemini Nano Banana',
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash-image-preview',
      enabled: !!GEMINI_API_KEY,
      connectionConfig: { apiKey: GEMINI_API_KEY },
      paramOverrides: { outputMimeType: 'image/png' }
    },
    {
      id: 'image-openai-gpt',
      name: 'OpenAI GPT Image 1',
      providerId: 'openai',
      modelId: 'gpt-image-1',
      enabled: !!OPENAI_API_KEY,
      connectionConfig: { apiKey: OPENAI_API_KEY, baseURL: OPENAI_BASE_URL || 'https://api.openai.com/v1' },
      paramOverrides: { size: '1024x1024', quality: 'auto', background: 'auto' }
    },
    {
      id: 'image-siliconflow-kolors',
      name: 'SiliconFlow Kolors',
      providerId: 'siliconflow',
      modelId: 'Kwai-Kolors/Kolors',
      enabled: !!SILICONFLOW_API_KEY,
      connectionConfig: { apiKey: SILICONFLOW_API_KEY, baseURL: 'https://api.siliconflow.cn/v1' },
      paramOverrides: { image_size: '1024x1024', num_inference_steps: 20, guidance_scale: 7.5, outputMimeType: 'image/png' }
    },
    {
      id: 'image-seedream',
      name: 'Doubao Seedream 4.0',
      providerId: 'seedream',
      modelId: 'doubao-seedream-4-0-250828',
      enabled: !!SEEDREAM_API_KEY,
      connectionConfig: { apiKey: SEEDREAM_API_KEY, baseURL: SEEDREAM_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3' },
      paramOverrides: { size: '1024x1024', watermark: false, outputMimeType: 'image/png' }
    }
  ] as const

  const models: Record<string, ImageModelConfig> = {}
  for (const e of entries) {
    models[e.id] = buildConfig(e.id, e.name, e.providerId, e.modelId, e.enabled, e.connectionConfig, e.paramOverrides)
  }

  return models
}
