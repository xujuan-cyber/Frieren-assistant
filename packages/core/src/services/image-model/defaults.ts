import type { ImageModelConfig, IImageAdapterRegistry } from '../image/types'
import { ImageAdapterRegistry } from '../image/adapters/registry'
import { getEnvVar } from '../../utils/environment'

/**
 * Provider ID -> 环境变量 key 映射（与文本模型风格一致）
 * 新增 Provider 只需在此添加一行
 */
const IMAGE_PROVIDER_ENV_KEYS = {
  openrouter: ['VITE_OPENROUTER_API_KEY'],
  gemini: ['VITE_GEMINI_API_KEY'],
  openai: ['VITE_OPENAI_API_KEY'],
  siliconflow: ['VITE_SILICONFLOW_API_KEY'],
  seedream: ['VITE_SEEDREAM_API_KEY', 'VITE_ARK_API_KEY'],
  dashscope: ['VITE_DASHSCOPE_API_KEY'],
  modelscope: ['VITE_MODELSCOPE_API_KEY'],
  cloudflare: ['VITE_CF_API_TOKEN', 'CF_API_TOKEN']
} as const

/**
 * 配置 ID 映射（保持现有 ID 不变以兼容用户数据）
 * name 将从 provider.name 获取，无需硬编码
 */
const IMAGE_CONFIG_IDS: Record<string, string> = {
  openrouter: 'image-openrouter-nanobanana',
  gemini: 'image-gemini-nanobanana',
  openai: 'image-openai-gpt',
  siliconflow: 'image-siliconflow-kolors',
  seedream: 'image-seedream',
  dashscope: 'image-dashscope',
  modelscope: 'image-modelscope',
  cloudflare: 'image-cloudflare-flux-klein'
}

/**
 * 特殊 baseURL 环境变量（仅需要覆盖的 Provider）
 */
const IMAGE_BASE_URL_ENV_KEYS: Record<string, string> = {
  openai: 'VITE_OPENAI_BASE_URL',
  seedream: 'VITE_SEEDREAM_BASE_URL'
}

/**
 * 额外连接字段的环境变量映射
 */
const IMAGE_EXTRA_CONNECTION_ENV_KEYS: Record<string, Record<string, string[]>> = {
  cloudflare: {
    accountId: ['VITE_CF_ACCOUNT_ID', 'CF_ACCOUNT_ID']
  }
}

/**
 * 某些 Provider 需要多个字段都存在时才视为可用
 */
const IMAGE_REQUIRED_CONNECTION_FIELDS: Record<string, string[]> = {
  cloudflare: ['apiKey', 'accountId']
}

function getFirstEnvValue(envKeys: readonly string[]): string {
  for (const envKey of envKeys) {
    const value = getEnvVar(envKey).trim()
    if (value) return value
  }
  return ''
}

/**
 * 图像模型默认配置生成器
 * 返回完整的自包含配置对象，包含 provider 和 model 完整信息
 *
 * 使用 Provider-Adapter 架构生成完整的元数据，
 * 所有配置信息（Provider ID、名称、BaseURL、默认模型、参数）均从 Adapter 获取。
 *
 * @param registry 可选，图像适配器注册表（用于依赖注入和测试）
 */
export function getDefaultImageModels(registry?: IImageAdapterRegistry): Record<string, ImageModelConfig> {
  const adapterRegistry = registry || new ImageAdapterRegistry()
  const result: Record<string, ImageModelConfig> = {}

  // 批量生成配置（与文本模型风格一致）
  for (const [providerId, envKeys] of Object.entries(IMAGE_PROVIDER_ENV_KEYS)) {
    const configId = IMAGE_CONFIG_IDS[providerId]
    if (!configId) continue

    const adapter = adapterRegistry.getAdapter(providerId)
    const provider = adapter.getProvider()
    const models = adapterRegistry.getStaticModels(providerId)
    const defaultModel = models[0] || adapter.buildDefaultModel(providerId)

    // 获取 API Key（支持备选环境变量）
    const apiKey = getFirstEnvValue(envKeys)

    // 获取 baseURL（支持环境变量覆盖）
    let baseURL = provider.defaultBaseURL || ''
    const baseURLEnvKey = IMAGE_BASE_URL_ENV_KEYS[providerId]
    if (baseURLEnvKey) {
      let envBaseURL = getEnvVar(baseURLEnvKey).trim()
      // Seedream 备选
      if (!envBaseURL && providerId === 'seedream') {
        envBaseURL = getEnvVar('VITE_ARK_BASE_URL').trim()
      }
      if (envBaseURL) baseURL = envBaseURL
    }

    // 直接从模型获取默认参数值（与文本模型一致）
    const defaultParamValues = defaultModel.defaultParameterValues || {}
    const connectionConfig: Record<string, unknown> = { apiKey, baseURL }
    const extraConnectionFields = IMAGE_EXTRA_CONNECTION_ENV_KEYS[providerId] || {}

    for (const [field, fieldEnvKeys] of Object.entries(extraConnectionFields)) {
      connectionConfig[field] = getFirstEnvValue(fieldEnvKeys)
    }

    const requiredConnectionFields = IMAGE_REQUIRED_CONNECTION_FIELDS[providerId] || ['apiKey']
    const enabled = requiredConnectionFields.every(field => {
      const value = connectionConfig[field]
      return typeof value === 'string' ? value.trim().length > 0 : !!value
    })

    result[configId] = {
      id: configId,
      name: provider.name,  // 从 provider 获取名称，不再硬编码
      providerId,
      modelId: defaultModel.id,
      enabled,
      connectionConfig,
      paramOverrides: { ...defaultParamValues },
      customParamOverrides: {},
      provider,
      model: defaultModel
    }
  }

  return result
}

/**
 * 获取所有内置图像模型配置的 ID 列表
 * 用于判断某个配置是否为内置模型（而非用户自定义）
 */
export function getBuiltinImageConfigIds(): string[] {
  return Object.values(IMAGE_CONFIG_IDS)
}

// 直接导出所有图像模型配置（保持向后兼容，与文本模型风格一致）
export const defaultImageModels = getDefaultImageModels()
