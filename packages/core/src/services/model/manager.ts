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
    this.init();
  }

  /**
   * 初始化模型管理器
   */
  private init(): void {
    try {
      // 1. 先从本地存储加载所有模型配置
      const storedData = localStorage.getItem('models');
      if (storedData) {
        this.models = JSON.parse(storedData);
      }

      // 2. 检查内置模型是否存在，不存在则添加到本地存储
      let hasChanges = false;
      Object.entries(defaultModels).forEach(([key, config]) => {
        if (!this.models[key]) {
          this.models[key] = {
            ...config
          };
          hasChanges = true;
        }
      });

      // 3. 如果有新增的内置模型，保存到本地存储
      if (hasChanges) {
        this.saveToStorage();
      }
    } catch (error) {
      console.error('初始化模型管理器失败:', error);
    }
  }

  /**
   * 获取所有模型配置
   */
  getAllModels(): Array<ModelConfig & { key: string }> {
    // 每次获取都从存储重新加载最新数据
    const storedData = localStorage.getItem('models');
    if (storedData) {
      try {
        this.models = JSON.parse(storedData);
      } catch (error) {
        console.error('解析模型配置失败:', error);
      }
    }

    const returnValue = Object.entries(this.models).map(([key, config]) => ({
      ...config,
      key
    }));
    return returnValue;

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

    // 合并配置时保留原有 enabled 状态
    const updatedConfig = {
      ...this.models[key],
      ...config,
      // 确保 enabled 属性存在
      enabled: config.enabled !== undefined ? config.enabled : this.models[key].enabled
    };

    // 如果更新了关键字段或尝试启用模型，需要验证配置
    if (
      config.name !== undefined ||
      config.baseURL !== undefined ||
      config.models !== undefined ||
      config.defaultModel !== undefined ||
      config.apiKey !== undefined ||
      config.enabled
    ) {
      this.validateConfig(updatedConfig);
    }

    this.models[key] = updatedConfig;
    this.saveToStorage();
  }

  /**
 * 获取指定模型的可用模型列表
 * 
 * 该方法通过LLM服务API获取指定模型提供商支持的所有模型列表。
 * 支持OpenAI兼容协议的API（包括本地Ollama）以及Gemini等其他提供商。
 */
  async fetchModelsList(key: string, llmServiceFactory?: (manager: IModelManager) => any): Promise<string[]> {
    // 检查模型配置是否存在
    const model = this.getModel(key);
    if (!model) {
      throw new ModelConfigError(`模型 ${key} 不存在`);
    }

    // 验证基本配置
    if (!model.baseURL || !model.apiKey) {
      throw new ModelConfigError('获取模型列表需要有效的API地址和密钥');
    }

    // 使用提供的工厂函数或导入默认的LLM服务
    // 注意：这里使用工厂函数模式避免循环依赖
    let llmService;
    if (llmServiceFactory) {
      llmService = llmServiceFactory(this);
    } else {
      // 如果没有提供工厂函数，则尝试导入LLM服务
      // 注意：这种方式可能导致循环依赖，应在实际使用时通过工厂函数解决
      const { createLLMService } = require('../llm/service');
      llmService = createLLMService(this);
    }

    // 调用LLM服务的fetchAvailableModels方法获取模型列表
    return await llmService.fetchAvailableModels(key);
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

    // 使用完整验证
    this.validateEnableConfig(this.models[key]);

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
    const errors: string[] = [];

    if (!config.name) {
      errors.push('缺少模型名称(name)');
    }
    if (!config.baseURL) {
      errors.push('缺少基础URL(baseURL)');
    }
    if (!Array.isArray(config.models)) {
      errors.push('模型列表(models)必须是数组');
    } else if (config.models.length === 0) {
      errors.push('模型列表(models)不能为空');
    }
    if (!config.defaultModel) {
      errors.push('缺少默认模型(defaultModel)');
    } else if (!config.models?.includes(config.defaultModel)) {
      errors.push('默认模型必须在模型列表中');
    }

    if (errors.length > 0) {
      throw new ModelConfigError('无效的模型配置：' + errors.join('、'));
    }
  }

  private validateEnableConfig(config: ModelConfig): void {
    this.validateConfig(config);

    if (!config.apiKey) {
      throw new ModelConfigError('启用模型需要提供API密钥');
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
    }
  }

  /**
   * 获取所有已启用的模型配置
   */
  getEnabledModels(): Array<ModelConfig & { key: string }> {
    return this.getAllModels().filter(model => model.enabled);
  }
}

/**
 * 临时模型管理器接口
 */
export interface ITempModelManager {
  addModel(key: string, config: ModelConfig): string;
  getModel(key: string): ModelConfig | undefined;
  updateModel(key: string, config: Partial<ModelConfig>): ModelConfig | undefined;
  deleteModel(key: string): boolean;
  clear(): void;
}

/**
 * 临时模型管理器实现
 * 用于在内存中管理临时模型配置，不会持久化到存储
 */
export class TempModelManager implements ITempModelManager {
  private models: Record<string, ModelConfig>;

  constructor() {
    this.models = {};
  }

  /**
   * 添加临时模型配置
   */
  addModel(key: string, config: ModelConfig): string {
    this.models[key] = { ...config };
    return key;
  }

  /**
   * 获取临时模型配置
   */
  getModel(key: string): ModelConfig | undefined {
    return this.models[key];
  }

  /**
   * 更新临时模型配置
   */
  updateModel(key: string, config: Partial<ModelConfig>): ModelConfig | undefined {
    if (!this.models[key]) {
      return undefined;
    }

    this.models[key] = { ...this.models[key], ...config };
    return this.models[key];
  }

  /**
   * 删除临时模型配置
   */
  deleteModel(key: string): boolean {
    if (key in this.models) {
      delete this.models[key];
      return true;
    }
    return false;
  }

  /**
   * 清除所有临时模型配置
   */
  clear(): void {
    this.models = {};
  }
}

// 导出单例实例
export const modelManager = new ModelManager();
export const tempModelManager = new TempModelManager();