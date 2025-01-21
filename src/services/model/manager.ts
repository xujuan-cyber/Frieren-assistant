import { ModelConfig, IModelManager } from './types';
import { ModelConfigError } from '../llm/errors';
import { defaultModels } from './defaults';

/**
 * 模型管理器实现
 */
export class ModelManager implements IModelManager {
  private models: Record<string, ModelConfig>;

  constructor() {
    this.models = {};
    // 加载默认模型配置
    Object.entries(defaultModels).forEach(([key, config]) => {
      this.models[key] = { ...config };
    });
    this.loadFromStorage();
  }

  /**
   * 获取所有模型配置
   */
  getAllModels(): Array<ModelConfig & { key: string }> {
    return Object.entries(this.models).map(([key, config]) => ({
      ...config,
      key
    }));
  }

  /**
   * 获取指定模型配置
   */
  getModel(key: string): ModelConfig | undefined {
    return this.models[key];
  }

  /**
   * 添加模型配置
   */
  addModel(key: string, config: ModelConfig): void {
    if (this.models[key]) {
      throw new ModelConfigError(`模型 ${key} 已存在`);
    }
    this.validateConfig(config);
    this.models[key] = { ...config };
    this.saveToStorage();
  }

  /**
   * 更新模型配置
   */
  updateModel(key: string, config: Partial<ModelConfig>): void {
    if (!this.models[key]) {
      throw new ModelConfigError(`模型 ${key} 不存在`);
    }
    const updatedConfig = { ...this.models[key], ...config };
    
    // 如果更新了关键字段或尝试启用模型，需要验证配置
    if (
      config.name !== undefined ||
      config.baseURL !== undefined ||
      config.models !== undefined ||
      config.defaultModel !== undefined ||
      config.apiKey !== undefined ||
      config.enabled
    ) {
      try {
        this.validateConfig(updatedConfig);
      } catch (error) {
        // 如果验证失败，恢复原始配置
        this.models[key] = { ...this.models[key] };
        throw error;
      }
    }
    
    this.models[key] = updatedConfig;
    this.saveToStorage();
  }

  /**
   * 删除模型配置
   */
  deleteModel(key: string): void {
    if (!this.models[key]) {
      throw new ModelConfigError(`模型 ${key} 不存在`);
    }
    delete this.models[key];
    this.saveToStorage();
  }

  /**
   * 启用模型
   */
  enableModel(key: string): void {
    if (!this.models[key]) {
      throw new ModelConfigError(`未知的模型: ${key}`);
    }

    // 验证配置完整性
    this.validateConfig(this.models[key]);
    
    this.models[key].enabled = true;
    this.saveToStorage();
  }

  /**
   * 禁用模型
   */
  disableModel(key: string): void {
    if (!this.models[key]) {
      throw new ModelConfigError(`未知的模型: ${key}`);
    }

    this.models[key].enabled = false;
    this.saveToStorage();
  }

  /**
   * 验证模型配置
   */
  private validateConfig(config: ModelConfig): void {
    if (
      !config.name ||
      !config.baseURL ||
      !config.apiKey ||
      !Array.isArray(config.models) ||
      config.models.length === 0 ||
      !config.defaultModel ||
      !config.models.includes(config.defaultModel)
    ) {
      throw new ModelConfigError('无效的模型配置：配置不完整或缺少必要字段');
    }
  }

  /**
   * 从本地存储加载配置
   */
  private loadFromStorage(): void {
    try {
      const storedData = localStorage.getItem('models');
      if (storedData) {
        const storedModels = JSON.parse(storedData);
        // 合并存储的配置，保留默认模型的基本信息
        Object.entries(storedModels).forEach(([key, config]) => {
          if (defaultModels[key]) {
            // 对于默认模型，保留环境变量中的 apiKey，如果存在的话
            const envApiKey = this.models[key].apiKey;
            this.models[key] = {
              ...this.models[key],
              apiKey: envApiKey || (config as ModelConfig).apiKey,
              enabled: !!(envApiKey || (config as ModelConfig).apiKey)
            };
            
            // 调试日志
            console.log(`加载模型 ${key} 配置:`, {
              apiKey: !!this.models[key].apiKey,
              enabled: this.models[key].enabled,
              fromEnv: !!envApiKey
            });
          } else {
            // 对于自定义模型，完全使用存储的配置
            this.models[key] = config as ModelConfig;
          }
        });
      }
    } catch (error) {
      console.error('加载模型配置失败:', error);
      throw new Error('加载模型配置失败: ' + error);
    }
  }

  /**
   * 保存配置到本地存储
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem('models', JSON.stringify(this.models));
    } catch (error) {
      console.error('保存模型配置失败:', error);
      throw new Error('保存模型配置失败: ' + error);
    }
  }
}

// 导出单例实例
export const modelManager = new ModelManager(); 