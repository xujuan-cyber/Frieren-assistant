import { ModelConfig } from './types';

/**
 * Electron环境下的配置管理器
 * 确保UI进程和主进程的配置状态完全一致
 */
export class ElectronConfigManager {
  private static instance: ElectronConfigManager;
  private envVars: Record<string, string> = {};
  private initialized = false;

  private constructor() {}

  static getInstance(): ElectronConfigManager {
    if (!ElectronConfigManager.instance) {
      ElectronConfigManager.instance = new ElectronConfigManager();
    }
    return ElectronConfigManager.instance;
  }

  /**
   * 从主进程同步环境变量
   */
  async syncFromMainProcess(): Promise<void> {
    if (typeof window === 'undefined' || !window.electronAPI) {
      throw new Error('ElectronConfigManager can only be used in Electron renderer process');
    }

    try {
      console.log('[ElectronConfigManager] Syncing environment variables from main process...');
      this.envVars = await window.electronAPI.config.getEnvironmentVariables();
      this.initialized = true;
      console.log('[ElectronConfigManager] Environment variables synced successfully');
      
      // 调试输出
      Object.keys(this.envVars).forEach(key => {
        const value = this.envVars[key];
        if (value) {
          console.log(`[ElectronConfigManager] ${key}: ${value.substring(0, 10)}...`);
        }
      });
    } catch (error) {
      console.error('[ElectronConfigManager] Failed to sync environment variables:', error);
      throw error;
    }
  }

  /**
   * 获取环境变量
   */
  getEnvVar(key: string): string {
    if (!this.initialized) {
      console.warn(`[ElectronConfigManager] Environment variables not synced yet, returning empty for ${key}`);
      return '';
    }
    return this.envVars[key] || '';
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 生成默认模型配置（基于同步的环境变量）
   */
  generateDefaultModels(): Record<string, ModelConfig> {
    const getEnv = (key: string) => this.getEnvVar(key);

    const OPENAI_API_KEY = getEnv('VITE_OPENAI_API_KEY').trim();
    const GEMINI_API_KEY = getEnv('VITE_GEMINI_API_KEY').trim();
    const DEEPSEEK_API_KEY = getEnv('VITE_DEEPSEEK_API_KEY').trim();
    const SILICONFLOW_API_KEY = getEnv('VITE_SILICONFLOW_API_KEY').trim();
    const ZHIPU_API_KEY = getEnv('VITE_ZHIPU_API_KEY').trim();
    const CUSTOM_API_KEY = getEnv('VITE_CUSTOM_API_KEY').trim();
    const CUSTOM_API_BASE_URL = getEnv('VITE_CUSTOM_API_BASE_URL');
    const CUSTOM_API_MODEL = getEnv('VITE_CUSTOM_API_MODEL');

    return {
      openai: {
        name: 'OpenAI',
        baseURL: 'https://api.openai.com/v1',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo', 'o1', 'o1-mini', 'o1-preview', 'o3', 'o4-mini'],
        defaultModel: 'gpt-4o-mini',
        apiKey: OPENAI_API_KEY,
        enabled: !!OPENAI_API_KEY,
        provider: 'openai',
        llmParams: {}
      },
      gemini: {
        name: 'Gemini',
        baseURL: 'https://generativelanguage.googleapis.com',
        models: ['gemini-2.0-flash'],
        defaultModel: 'gemini-2.0-flash',
        apiKey: GEMINI_API_KEY,
        enabled: !!GEMINI_API_KEY,
        provider: 'gemini',
        llmParams: {}
      },
      deepseek: {
        name: 'DeepSeek',
        baseURL: 'https://api.deepseek.com/v1',
        models: ['deepseek-chat', 'deepseek-reasoner'],
        defaultModel: 'deepseek-chat',
        apiKey: DEEPSEEK_API_KEY,
        enabled: !!DEEPSEEK_API_KEY,
        provider: 'deepseek',
        llmParams: {}
      },
      siliconflow: {
        name: 'SiliconFlow',
        baseURL: 'https://api.siliconflow.cn/v1',
        models: ['Qwen/Qwen3-8B'],
        defaultModel: 'Qwen/Qwen3-8B',
        apiKey: SILICONFLOW_API_KEY,
        enabled: !!SILICONFLOW_API_KEY,
        provider: 'siliconflow',
        llmParams: {}
      },
      zhipu: {
        name: 'Zhipu',
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
        models: ['glm-4-flash', 'glm-4', 'glm-3-turbo', 'glm-3'],
        defaultModel: 'glm-4-flash',
        apiKey: ZHIPU_API_KEY,
        enabled: !!ZHIPU_API_KEY,
        provider: 'zhipu',
        llmParams: {}
      },
      custom: {
        name: 'Custom',
        baseURL: CUSTOM_API_BASE_URL,
        models: [CUSTOM_API_MODEL],
        defaultModel: CUSTOM_API_MODEL,
        apiKey: CUSTOM_API_KEY,
        enabled: !!CUSTOM_API_KEY,
        provider: 'custom',
        llmParams: {}
      }
    };
  }
}

/**
 * 检查是否在Electron渲染进程中
 */
export function isElectronRenderer(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
} 