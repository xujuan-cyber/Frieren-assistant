import { initializeModels, buildRequestConfig, validateModelConfig } from '../config/models';
import { promptManager } from './promptManager';

const DEFAULT_MODELS = initializeModels();

export class LLMService {
  constructor() {
    const savedModels = localStorage.getItem('llm_models');
    this.models = savedModels ? JSON.parse(savedModels) : initializeModels();
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

  async optimizePrompt(prompt, templateId, model) {
    const config = this.models[model];
    if (!config?.enabled) {
      throw new Error(`模型 ${model} 未启用`);
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
        model,
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
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('优化失败:', error);
      throw error;
    }
  }

  async iteratePrompt(originalPrompt, iterateInput, model) {
    const config = this.models[model];
    if (!config?.enabled) {
      throw new Error(`模型 ${model} 未启用`);
    }

    try {
      // 获取迭代模板
      const template = await promptManager.getTemplate('iterate');
      
      // 构建消息
      const messages = [
        { role: 'system', content: template.template },
        { role: 'user', content: `原始提示词：${originalPrompt}\n\n优化需求：${iterateInput}` }
      ];

      // 构建请求配置
      const requestConfig = buildRequestConfig(
        model,
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
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('迭代失败:', error);
      throw error;
    }
  }

  async sendMessage(messages, model) {
    const config = this.models[model];
    if (!config?.enabled) {
      throw new Error(`模型 ${model} 未启用`);
    }

    try {
      // 构建请求配置
      const requestConfig = buildRequestConfig(
        model,
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
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  }

  // 添加自定义模型
  addCustomModel(key, config) {
    if (!validateModelConfig(config)) {
      throw new Error('无效的模型配置');
    }
    this.models[key] = { ...config, enabled: true };
    this.saveModels();
  }

  // 更新模型配置
  updateModelConfig(key, config) {
    if (!this.models[key]) {
      throw new Error(`未知的模型: ${key}`);
    }
    this.models[key] = { ...this.models[key], ...config };
    this.saveModels();
  }

  // 启用模型
  enableModel(key) {
    if (!this.models[key]) {
      throw new Error(`未知的模型: ${key}`);
    }
    this.models[key].enabled = true;
    this.saveModels();
  }

  // 禁用模型
  disableModel(key) {
    if (!this.models[key]) {
      throw new Error(`未知的模型: ${key}`);
    }
    this.models[key].enabled = false;
    this.saveModels();
  }

  // 删除模型
  deleteModel(key) {
    if (!this.models[key]) {
      throw new Error(`未知的模型: ${key}`);
    }
    
    // 不允许删除默认模型
    if (DEFAULT_MODELS[key]) {
      throw new Error(`不能删除默认模型: ${key}`);
    }
    
    delete this.models[key];
    this.saveModels();
  }
}

// 导出单例实例
export const llmService = new LLMService(); 