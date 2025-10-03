import { TextModelConfig } from './types';
import { getEnvVar, clearCustomModelEnvCache } from '../../utils/environment';
import { createDefaultTextModels } from './text-model-defaults';
import { generateDynamicModels } from './model-utils';

// 获取环境变量并生成静态模型配置（新格式 TextModelConfig）
const staticModels: Record<string, TextModelConfig> = createDefaultTextModels({
  OPENAI_API_KEY: getEnvVar('VITE_OPENAI_API_KEY').trim(),
  GEMINI_API_KEY: getEnvVar('VITE_GEMINI_API_KEY').trim(),
  DEEPSEEK_API_KEY: getEnvVar('VITE_DEEPSEEK_API_KEY').trim(),
  SILICONFLOW_API_KEY: getEnvVar('VITE_SILICONFLOW_API_KEY').trim(),
  ZHIPU_API_KEY: getEnvVar('VITE_ZHIPU_API_KEY').trim(),
  CUSTOM_API_KEY: getEnvVar('VITE_CUSTOM_API_KEY').trim(),
  CUSTOM_API_BASE_URL: getEnvVar('VITE_CUSTOM_API_BASE_URL'),
  CUSTOM_API_MODEL: getEnvVar('VITE_CUSTOM_API_MODEL')
});

/**
 * 获取所有模型配置（包括静态和动态）
 * @returns TextModelConfig格式的模型配置
 */
export function getAllModels(): Record<string, TextModelConfig> {
  // 生成动态自定义模型（现在返回 TextModelConfig 格式）
  const dynamicModels = generateDynamicModels();

  // 合并静态模型和动态模型
  return {
    ...staticModels,
    ...dynamicModels
  };
}

// 直接导出所有模型配置
export const defaultModels = getAllModels();

/**
 * 清除模型缓存，强制重新扫描
 */
export function clearModelsCache(): void {
  clearCustomModelEnvCache();
}
