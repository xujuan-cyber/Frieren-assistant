import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMService } from '../../../src/services/llm';

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      choices: [{
        message: {
          content: 'Mock response'
        }
      }]
    })
  })
);

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

// Mock models module
vi.mock('../../../src/config/models', () => ({
  initializeModels: () => ({
    test: {
      name: 'Test Model',
      baseUrl: 'https://test.api/chat',
      models: ['test-model'],
      defaultModel: 'test-model',
      enabled: true
    }
  }),
  validateModelConfig: (config) => {
    const required = ['name', 'baseUrl', 'models', 'defaultModel'];
    return required.every(field => config[field]);
  },
  buildRequestConfig: (provider, model, apiKey, messages) => ({
    url: 'https://test.api/chat',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: {
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000
    }
  })
}));

describe('LLMService', () => {
  let llmService;
  const testProvider = 'test';
  const testApiKey = 'test-api-key';

  beforeEach(() => {
    // 清除 localStorage
    localStorage.clear();
    vi.clearAllMocks();
    llmService = new LLMService();
  });

  describe('初始化和配置', () => {
    it('应该正确初始化默认模型和状态', () => {
      expect(llmService.models).toBeDefined();
      expect(llmService.models.test).toBeDefined();
      expect(llmService.currentProvider).toBe('test');
    });

    it('应该正确处理 API 密钥设置和模型状态', () => {
      llmService.setApiKey(testProvider, testApiKey);
      expect(llmService.models[testProvider].apiKey).toBe(testApiKey);
      expect(llmService.models[testProvider].enabled).toBe(true);
    });

    it('应该正确处理无效的配置操作', () => {
      // 无效的提供商
      expect(() => llmService.setProvider('invalid-provider'))
        .toThrow('未知的提供商: invalid-provider');

      // 未设置 API 密钥的提供商
      expect(() => llmService.enableModel(testProvider))
        .toThrow(`模型 ${testProvider} 缺少 API 密钥`);
    });
  });

  describe('API 调用', () => {
    it('应该正确处理 API 调用的成功和失败情况', async () => {
      llmService.setApiKey(testProvider, testApiKey);
      llmService.setProvider(testProvider);
      const response = await llmService.sendMessage([{ role: 'user', content: 'Test' }]);
      expect(response).toBeDefined();
      expect(response).toBe('Mock response');
    });
  });

  describe('模型管理', () => {
    it('应该正确处理模型的启用和禁用', () => {
      llmService.setApiKey(testProvider, testApiKey);
      llmService.enableModel(testProvider);
      expect(llmService.models[testProvider].enabled).toBe(true);

      llmService.disableModel(testProvider);
      expect(llmService.models[testProvider].enabled).toBe(false);
      expect(llmService.currentProvider).toBeNull();
    });

    it('应该正确处理自定义模型的添加', () => {
      // 添加有效的自定义模型
      const validConfig = {
        name: 'Custom Model',
        baseUrl: 'https://api.custom.com/chat',
        models: ['custom-model'],
        defaultModel: 'custom-model'
      };
      llmService.addCustomModel('custom', validConfig);
      expect(llmService.models.custom).toBeDefined();

      // 尝试添加无效的自定义模型
      expect(() => llmService.addCustomModel('invalid', { name: 'Invalid' }))
        .toThrow('无效的模型配置');
    });

    it('应该正确获取和更新模型配置', () => {
      // 添加测试模型
      const config = {
        name: 'Custom Model',
        baseUrl: 'https://api.custom.com/chat',
        models: ['custom-model'],
        defaultModel: 'custom-model'
      };
      llmService.addCustomModel('custom', config);

      // 获取所有模型
      const allModels = llmService.getAllModels();
      expect(allModels).toBeInstanceOf(Array);
      expect(allModels[0]).toHaveProperty('key');
      expect(allModels[0]).toHaveProperty('name');
      expect(allModels[0]).toHaveProperty('model');
      expect(allModels[0]).toHaveProperty('enabled');

      // 获取单个模型
      const model = llmService.getModel('custom');
      expect(model).toBeDefined();
      expect(model.name).toBe(config.name);
      expect(model.baseUrl).toBe(config.baseUrl);

      // 更新模型配置
      const updatedConfig = { name: 'Updated Model' };
      llmService.updateModelConfig('custom', updatedConfig);
      expect(llmService.models.custom.name).toBe(updatedConfig.name);
    });
  });
});
