import type { TextModelConfig } from './types';
import type { ITextAdapterRegistry } from '../llm/types';
import { TextAdapterRegistry } from '../llm/adapters/registry';
import { getEnvVar } from '../../utils/environment';
import { generateDynamicModels } from './model-utils';

/**
 * Provider ID -> 环境变量 key 映射
 * 新增 Provider 只需在此添加一行
 */
const PROVIDER_ENV_KEYS = {
  openai: ['VITE_OPENAI_API_KEY'],
  gemini: ['VITE_GEMINI_API_KEY'],
  anthropic: ['VITE_ANTHROPIC_API_KEY'],
  deepseek: ['VITE_DEEPSEEK_API_KEY'],
  siliconflow: ['VITE_SILICONFLOW_API_KEY'],
  zhipu: ['VITE_ZHIPU_API_KEY'],
  dashscope: ['VITE_DASHSCOPE_API_KEY'],
  openrouter: ['VITE_OPENROUTER_API_KEY'],
  modelscope: ['VITE_MODELSCOPE_API_KEY'],
  minimax: ['VITE_MINIMAX_API_KEY'],
  cloudflare: ['VITE_CF_API_TOKEN']
} as const;

const PROVIDER_EXTRA_CONNECTION_ENV_KEYS: Record<string, Record<string, string[]>> = {
  cloudflare: {
    accountId: ['VITE_CF_ACCOUNT_ID']
  }
};

const PROVIDER_REQUIRED_CONNECTION_FIELDS: Record<string, string[]> = {
  cloudflare: ['apiKey', 'accountId']
};

function getFirstEnvValue(envKeys: readonly string[]): string {
  for (const envKey of envKeys) {
    const value = getEnvVar(envKey).trim();
    if (value) return value;
  }
  return '';
}

/**
 * 获取所有内置模型的 ID 列表
 * 包括 PROVIDER_ENV_KEYS 中的所有 Provider 和 'custom'
 */
export function getBuiltinModelIds(): string[] {
  return [...Object.keys(PROVIDER_ENV_KEYS), 'custom'];
}

/**
 * 创建文本模型的默认配置（TextModelConfig格式）
 * 使用 Provider-Adapter 架构生成完整的元数据
 *
 * 所有配置信息（Provider ID、名称、BaseURL、默认模型）均从 Adapter 获取，
 * 本文件仅负责根据环境变量进行初始化配置组装。
 *
 * @param registry 可选，文本适配器注册表（用于依赖注入和测试）
 */
export function getDefaultTextModels(registry?: ITextAdapterRegistry): Record<string, TextModelConfig> {
  const adapterRegistry = registry || new TextAdapterRegistry();
  const result: Record<string, TextModelConfig> = {};

  // 批量生成标准 Provider 配置
  for (const [providerId, envKeys] of Object.entries(PROVIDER_ENV_KEYS)) {
    const adapter = adapterRegistry.getAdapter(providerId);
    const provider = adapter.getProvider();
    const models = adapter.getModels();
    const defaultModel = models[0] || adapter.buildDefaultModel(providerId);
    const apiKey = getFirstEnvValue(envKeys);
    const connectionConfig: Record<string, unknown> = {
      apiKey,
      baseURL: provider.defaultBaseURL
    };

    const extraConnectionFields = PROVIDER_EXTRA_CONNECTION_ENV_KEYS[providerId] || {};
    for (const [field, fieldEnvKeys] of Object.entries(extraConnectionFields)) {
      connectionConfig[field] = getFirstEnvValue(fieldEnvKeys);
    }

    // 使用模型的默认参数值初始化 paramOverrides
    const defaultParamValues = defaultModel.defaultParameterValues || {};
    const requiredConnectionFields = PROVIDER_REQUIRED_CONNECTION_FIELDS[providerId] || ['apiKey'];
    const enabled = requiredConnectionFields.every((field) => {
      const value = connectionConfig[field];
      return typeof value === 'string' ? value.trim().length > 0 : !!value;
    });

    result[providerId] = {
      id: provider.id,
      name: provider.name,
      enabled: enabled,
      providerMeta: provider,
      modelMeta: defaultModel,
      connectionConfig,
      paramOverrides: { ...defaultParamValues },
      customParamOverrides: {}
    };
  }

  // Custom 单独处理（baseURL 和 model 来自环境变量）
  const openaiCompatibleAdapter = adapterRegistry.getAdapter('openai-compatible');
  const customApiKey = getEnvVar('VITE_CUSTOM_API_KEY').trim();
  const customBaseURL = getEnvVar('VITE_CUSTOM_API_BASE_URL');
  const customModelId = getEnvVar('VITE_CUSTOM_API_MODEL') || 'custom-model';
  const customModelMeta = {
    ...openaiCompatibleAdapter.buildDefaultModel(customModelId),
    name: customModelId,
    description: 'Custom model via OpenAI-compatible API'
  };

  result.custom = {
    id: 'custom',
    name: 'Custom API (OpenAI Compatible)',
    enabled: true,
    providerMeta: openaiCompatibleAdapter.getProvider(),
    modelMeta: customModelMeta,
    connectionConfig: {
      apiKey: customApiKey,
      baseURL: customBaseURL || 'http://localhost:11434/v1',
      requestStyle: 'chat_completions'
    },
    paramOverrides: { ...(customModelMeta.defaultParameterValues || {}) },
    customParamOverrides: {}
  };

  return result;
}

/**
 * 获取所有模型配置（包括静态和动态）
 * @param registry 可选，文本适配器注册表
 * @returns TextModelConfig格式的模型配置
 */
export function getAllModels(registry?: ITextAdapterRegistry): Record<string, TextModelConfig> {
  // 生成静态模型配置
  const staticModels = getDefaultTextModels(registry);

  // 生成动态自定义模型（现在返回 TextModelConfig 格式）
  const dynamicModels = generateDynamicModels();

  // 合并静态模型和动态模型
  return {
    ...staticModels,
    ...dynamicModels
  };
}

// 直接导出所有模型配置（保持向后兼容）
export const defaultModels = getAllModels();
