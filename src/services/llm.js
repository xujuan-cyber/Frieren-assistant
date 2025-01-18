import { initializeModels, buildRequestConfig, validateModelConfig } from '../config/models';
import { promptManager } from './promptManager';

const DEFAULT_MODELS = initializeModels();

export class LLMService {
  constructor() {
    // 从本地存储加载配置，如果没有则使用默认配置
    const savedModels = localStorage.getItem('llm_models');
    this.models = savedModels ? JSON.parse(savedModels) : initializeModels();
    this.currentProvider = localStorage.getItem('llm_current_provider');
    
    // 如果没有当前提供商，设置为第一个启用的模型
    if (!this.currentProvider) {
      const enabledModels = Object.entries(this.models)
        .filter(([_, config]) => config.enabled);
      
      if (enabledModels.length > 0) {
        this.currentProvider = enabledModels[0][0];
        this.saveCurrentProvider();
      }
    }
  }

  // 获取所有模型（包括已禁用的）
  getAllModels() {
    return Object.entries(this.models)
      .map(([key, config]) => ({
        key,
        name: config.name,
        model: config.defaultModel,
        models: config.models,
        enabled: config.enabled
      }));
  }

  // 获取指定模型的配置
  getModel(key) {
    return this.models[key];
  }

  // 保存模型配置到本地存储
  saveModels() {
    localStorage.setItem('llm_models', JSON.stringify(this.models));
  }

  // 保存当前提供商到本地存储
  saveCurrentProvider() {
    if (this.currentProvider) {
      localStorage.setItem('llm_current_provider', this.currentProvider);
    }
  }

  // 设置当前使用的提供商
  setProvider(provider) {
    if (!this.models[provider]) {
      throw new Error(`未知的提供商: ${provider}`);
    }
    if (!this.models[provider].enabled) {
      throw new Error(`提供商 ${provider} 未启用`);
    }
    this.currentProvider = provider;
    this.saveCurrentProvider();
  }

  // 添加自定义模型
  addCustomModel(key, config) {
    if (this.models[key]) {
      throw new Error(`模型 ${key} 已存在`);
    }
    if (!validateModelConfig(config)) {
      throw new Error('无效的模型配置');
    }
    this.models[key] = {
      ...config,
      enabled: true
    };
    this.saveModels();
  }

  // 更新模型配置
  updateModelConfig(key, config) {
    if (!this.models[key]) {
      throw new Error(`模型 ${key} 不存在`);
    }
    this.models[key] = {
      ...this.models[key],
      ...config
    };
    this.saveModels();
  }

  // 设置 API 密钥
  setApiKey(provider, apiKey) {
    if (!this.models[provider]) {
      throw new Error(`未知的提供商: ${provider}`);
    }
    this.models[provider].apiKey = apiKey;
    this.models[provider].enabled = !!apiKey;
    this.saveModels();
  }

  // 启用模型
  enableModel(provider) {
    if (!this.models[provider]) {
      throw new Error(`未知的提供商: ${provider}`);
    }
    
    // 如果没有 API 密钥，不能启用
    if (!this.models[provider].apiKey) {
      throw new Error(`模型 ${provider} 缺少 API 密钥`);
    }
    
    this.models[provider].enabled = true;
    this.saveModels();
    
    // 如果当前没有选择的提供商，设置这个为当前提供商
    if (!this.currentProvider) {
      this.currentProvider = provider;
      this.saveCurrentProvider();
    }
  }

  // 禁用模型
  disableModel(provider) {
    if (!this.models[provider]) {
      throw new Error(`未知的提供商: ${provider}`);
    }
    // 只改变启用状态，保留其他配置
    this.models[provider].enabled = false;
    
    // 如果禁用的是当前提供商，切换到其他启用的模型
    if (this.currentProvider === provider) {
      const enabledModels = Object.entries(this.models)
        .filter(([key, config]) => config.enabled && key !== provider);
      
      if (enabledModels.length > 0) {
        this.currentProvider = enabledModels[0][0];
        this.saveCurrentProvider();
      } else {
        this.currentProvider = null;
        localStorage.removeItem('llm_current_provider');
      }
    }
    
    this.saveModels();
  }

  // 删除模型
  deleteModel(provider) {
    if (!this.models[provider]) {
      throw new Error(`未知的提供商: ${provider}`);
    }
    
    // 不允许删除默认模型
    if (DEFAULT_MODELS[provider]) {
      throw new Error(`不能删除默认模型: ${provider}`);
    }
    
    // 如果删除的是当前提供商，切换到其他启用的模型
    if (this.currentProvider === provider) {
      const enabledModels = Object.entries(this.models)
        .filter(([key, config]) => config.enabled && key !== provider);
      
      if (enabledModels.length > 0) {
        this.currentProvider = enabledModels[0][0];
        this.saveCurrentProvider();
      } else {
        this.currentProvider = null;
        localStorage.removeItem('llm_current_provider');
      }
    }
    
    // 完全删除模型配置
    delete this.models[provider];
    this.saveModels();
  }

  async optimizePrompt(prompt, templateId) {
    if (!this.currentProvider) {
      throw new Error('未设置当前提供商');
    }

    const config = this.models[this.currentProvider];
    if (!config.enabled || !config.apiKey) {
      throw new Error(`提供商 ${this.currentProvider} 未启用或缺少 API 密钥`);
    }

    try {
      // 获取系统提示词模板
      const template = await promptManager.getTemplate(templateId);
      
      // 构建消息
      const messages = [
        { role: 'system', content: template.template },
        { role: 'user', content: prompt }
      ];

      // 构建请求配置
      const requestConfig = buildRequestConfig(
        this.currentProvider,
        config.defaultModel,
        config.apiKey,
        messages
      );

      // 发送请求
      const response = await fetch(requestConfig.url, {
        method: 'POST',
        headers: requestConfig.headers,
        body: JSON.stringify(requestConfig.body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          `HTTP error! status: ${response.status}\n` +
          `Details: ${errorData ? JSON.stringify(errorData) : '无错误详情'}`
        );
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('优化提示词失败:', error);
      throw error;
    }
  }

  // 发送聊天消息
  async sendMessage(messages) {
    if (!this.currentProvider) {
      throw new Error('未设置当前提供商');
    }

    const config = this.models[this.currentProvider];
    if (!config.enabled || !config.apiKey) {
      throw new Error(`提供商 ${this.currentProvider} 未启用或缺少 API 密钥`);
    }

    try {
      // 构建请求配置
      const requestConfig = buildRequestConfig(
        this.currentProvider,
        config.defaultModel,
        config.apiKey,
        messages
      );

      // 发送请求
      const response = await fetch(requestConfig.url, {
        method: 'POST',
        headers: requestConfig.headers,
        body: JSON.stringify(requestConfig.body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          `HTTP error! status: ${response.status}\n` +
          `Details: ${errorData ? JSON.stringify(errorData) : '无错误详情'}`
        );
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const llmService = new LLMService(); 