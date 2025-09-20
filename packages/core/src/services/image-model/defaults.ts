import { ImageModelConfig } from '../image/types'
import { getEnvVar } from '../../utils/environment'

/**
 * 图像模型静态默认配置
 * - Gemini 图像：使用 imagen-3.0 模型系列
 * - Seedream：火山方舟 Doubao 图像生成模型
 * - SiliconFlow：使用 Kwai-Kolors/Kolors 模型
 * - OpenAI：DALL-E 系列模型
 */
export function getDefaultImageModels(): Record<string, ImageModelConfig> {
  const GEMINI_API_KEY = getEnvVar('VITE_GEMINI_API_KEY').trim()
  const SEEDREAM_API_KEY = (
    getEnvVar('VITE_SEEDREAM_API_KEY') ||
    getEnvVar('VITE_ARK_API_KEY') ||
    (typeof process !== 'undefined' ? (process.env.ARK_API_KEY || '') : '')
  ).trim()
  const OPENAI_API_KEY = getEnvVar('VITE_OPENAI_API_KEY').trim()
  const OPENROUTER_API_KEY = getEnvVar('VITE_OPENROUTER_API_KEY').trim()
  const SILICONFLOW_API_KEY = getEnvVar('VITE_SILICONFLOW_API_KEY').trim()

  const models: Record<string, ImageModelConfig> = {
    'image-gemini-fast': {
      name: 'Gemini 2.5 Flash Image',
      baseURL: undefined, // Gemini使用SDK，不需要baseURL
      defaultModel: 'gemini-2.5-flash-image-preview',
      apiKey: GEMINI_API_KEY,
      enabled: !!GEMINI_API_KEY,
      provider: 'gemini',
      imgParams: {
        outputMimeType: 'image/png'
      },
      capabilities: { edit: true, multiImage: false, asyncJob: false, streamingPreview: false }
    },
    'image-seedream': {
      name: 'Doubao Seedream 4.0',
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
      defaultModel: 'doubao-seedream-4-0-250828',
      apiKey: SEEDREAM_API_KEY,
      enabled: !!SEEDREAM_API_KEY,
      provider: 'seedream',
      imgParams: {
        size: '1024x1024',
        watermark: true,
        outputMimeType: 'image/png'
      },
      capabilities: { edit: true, multiImage: false, asyncJob: false, streamingPreview: false }
    },
    'image-siliconflow': {
      name: 'SiliconFlow Kolors',
      baseURL: 'https://api.siliconflow.cn/v1',
      defaultModel: 'Kwai-Kolors/Kolors',
      apiKey: SILICONFLOW_API_KEY,
      enabled: !!SILICONFLOW_API_KEY,
      provider: 'siliconflow',
      imgParams: {
        size: '1024x1024',
        steps: 20,
        guidance: 7.5,
        outputMimeType: 'image/png'
      },
      capabilities: { edit: true, multiImage: false, asyncJob: false, streamingPreview: false }
    },
    'image-openrouter-gemini': {
      name: 'OpenRouter Gemini 2.5 Flash Image',
      baseURL: 'https://openrouter.ai/api/v1',
      defaultModel: 'google/gemini-2.5-flash-image-preview',
      apiKey: OPENROUTER_API_KEY,
      enabled: !!OPENROUTER_API_KEY,
      provider: 'openai',
      imgParams: {
        outputMimeType: 'image/png'
      },
      capabilities: { edit: true, multiImage: true, asyncJob: false, streamingPreview: false }
    },
  }

  return models
}
