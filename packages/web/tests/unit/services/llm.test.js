import { describe, it, expect, beforeEach } from 'vitest';
import { LLMService, ModelManager, RequestConfigError, APIError } from '@prompt-optimizer/core';

describe('LLMService', () => {
  let llmService;
  let modelManager;
  const testProvider = 'test-provider';
  const mockModelConfig = {
    provider: 'openai',
    apiKey: 'test-key',
    baseURL: 'https://api.test.com',
    defaultModel: 'test-model',
    enabled: true,
    models: ['test-model']
  };

  beforeEach(() => {
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

  describe('请求配置构建', () => {
    it('应该正确构建请求配置', () => {
      const messages = [
        { role: 'system', content: 'test' }
      ];
      const config = llmService.buildRequestConfig(mockModelConfig, messages);
      expect(config).toEqual({
        url: 'https://api.test.com/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-key'
        },
        body: {
          model: 'test-model',
          messages: [{ role: 'system', content: 'test' }]
        }
      });
    });

    it('当消息为空时应抛出错误', () => {
      expect(() => llmService.buildRequestConfig(mockModelConfig, []))
        .toThrow(RequestConfigError);
    });

    it('当消息格式无效时应抛出错误', () => {
      const invalidMessages = [{ role: 'invalid', content: 'test' }];
      expect(() => llmService.buildRequestConfig(mockModelConfig, invalidMessages))
        .toThrow(RequestConfigError);
    });
  });
});
