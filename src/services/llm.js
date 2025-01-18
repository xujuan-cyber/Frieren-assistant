import { initializeModels, buildRequestConfig, validateModelConfig } from '../config/models';
import { promptManager } from './promptManager';

export class LLMService {
  constructor() {
    this.models = initializeModels();
    this.currentProvider = null;
    
    // 设置默认提供商为第一个启用的模型
    const enabledModels = Object.entries(this.models)
      .filter(([_, config]) => config.enabled);
    
    if (enabledModels.length > 0) {
      this.currentProvider = enabledModels[0][0];
    }
  }

  // 获取所有已启用的模型
  getEnabledModels() {
    return Object.entries(this.models)
      .filter(([_, config]) => config.enabled)
      .map(([key, config]) => ({
        key,
        name: config.name,
        model: config.defaultModel,
        models: config.models
      }));
  }

  // 获取指定模型的配置
  getModel(key) {
    return this.models[key];
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
  }

  // 设置 API 密钥
  setApiKey(provider, apiKey) {
    if (!this.models[provider]) {
      throw new Error(`未知的提供商: ${provider}`);
    }
    this.models[provider].apiKey = apiKey;
    this.models[provider].enabled = !!apiKey;
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