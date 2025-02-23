import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMService, ModelManager, RequestConfigError, APIError } from '../src';

// 模拟localStorage
const localStorageMock = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = value.toString();
  },
  clear() {
    this.store = {};
  }
};

global.localStorage = localStorageMock;

describe('LLMService', () => {
  let llmService;
  let modelManager;
  const testProvider = 'test-provider';
  const mockModelConfig = {
    name: 'Test Model',
    provider: 'openai',
    apiKey: 'test-key',
    baseURL: 'https://api.test.com',
    defaultModel: 'test-model',
    enabled: true,
    models: ['test-model']
  };

  beforeEach(() => {
    // 重置localStorage
    localStorageMock.clear();
    modelManager = new ModelManager();
    // 清除所有已有模型
    const models = modelManager.getAllModels();
    models.forEach(model => {
      if (model.key) {
        modelManager.deleteModel(model.key);
      }
    });
    llmService = new LLMService(modelManager);
  });

  describe('消息验证', () => {
    it('应该正确验证消息格式', () => {
      const validMessages = [
        { role: 'system', content: 'test' },
        { role: 'user', content: 'test' }
      ];
      expect(() => llmService['validateMessages'](validMessages)).not.toThrow();
    });

    it('当消息格式无效时应抛出错误', () => {
      const invalidMessages = [
        { role: 'invalid', content: 'test' }
      ];
      expect(() => llmService['validateMessages'](invalidMessages))
        .toThrow('不支持的消息类型: invalid');
    });
  });

  describe('模型配置验证', () => {
    it('应该正确验证模型配置', () => {
      expect(() => llmService['validateModelConfig'](mockModelConfig)).not.toThrow();
    });

    it('当模型配置无效时应抛出错误', () => {
      const invalidConfig = { ...mockModelConfig, apiKey: '' };
      expect(() => llmService['validateModelConfig'](invalidConfig))
        .toThrow('API密钥不能为空');
    });

    it('当模型未启用时应抛出错误', () => {
      const disabledConfig = { ...mockModelConfig, enabled: false };
      expect(() => llmService['validateModelConfig'](disabledConfig))
        .toThrow('模型未启用');
    });
  });

  describe('发送消息', () => {

    it('当提供商不存在时应抛出错误', async () => {
      const messages = [
        { role: 'system', content: 'test' }
      ];
      await expect(llmService.sendMessage(messages, 'non-existent-provider'))
        .rejects
        .toThrow(RequestConfigError);
    });

    it('当消息格式无效时应抛出错误', async () => {
      modelManager.addModel(testProvider, mockModelConfig);

      const invalidMessages = [
        { role: 'invalid', content: 'test' }
      ];
      await expect(llmService.sendMessage(invalidMessages, testProvider))
        .rejects
        .toThrow(RequestConfigError);
    });
  });
});
