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

// Mock promptManager
vi.mock('../../../src/services/promptManager', () => ({
  promptManager: {
    getTemplate: () => Promise.resolve({ template: 'Mock template' })
  }
}));

// Mock models module
vi.mock('../../../src/config/models', () => ({
  initializeModels: () => ({
    test: {
      name: 'Test Model',
      baseUrl: 'https://test.api/chat',
      models: ['test-model'],
      defaultModel: 'test-model',
      enabled: true,
      apiKey: 'test-api-key'
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

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    llmService = new LLMService();
  });

  describe('初始化和配置', () => {
    it('应该正确初始化默认模型', () => {
      expect(llmService.models).toBeDefined();
      expect(llmService.models.test).toBeDefined();
      expect(llmService.models.test.enabled).toBe(true);
    });

    it('应该正确获取所有模型', () => {
      const models = llmService.getAllModels();
      expect(models).toBeInstanceOf(Array);
      expect(models[0]).toHaveProperty('key', 'test');
      expect(models[0]).toHaveProperty('name', 'Test Model');
    });
  });

  describe('API 调用', () => {
    it('应该正确发送消息', async () => {
      const messages = [{ role: 'user', content: 'Test message' }];
      const response = await llmService.sendMessage(messages, testProvider);
      expect(response).toBe('Mock response');
      expect(fetch).toHaveBeenCalled();
    });

    it('应该正确处理优化请求', async () => {
      const prompt = 'Test prompt';
      const response = await llmService.optimizePrompt(prompt, 'optimize', testProvider);
      expect(response).toBe('Mock response');
      expect(fetch).toHaveBeenCalled();
    });

    it('应该正确处理迭代请求', async () => {
      const originalPrompt = 'Original prompt';
      const iterateInput = 'Iterate input';
      const response = await llmService.iteratePrompt(originalPrompt, iterateInput, testProvider);
      expect(response).toBe('Mock response');
      expect(fetch).toHaveBeenCalled();
    });

    it('应该正确处理未启用的模型', async () => {
      llmService.disableModel(testProvider);
      await expect(llmService.sendMessage([], testProvider))
        .rejects
        .toThrow(`模型 ${testProvider} 未启用`);
    });
  });

  describe('模型管理', () => {
    it('应该正确处理模型的启用和禁用', () => {
      llmService.disableModel(testProvider);
      expect(llmService.models[testProvider].enabled).toBe(false);

      llmService.enableModel(testProvider);
      expect(llmService.models[testProvider].enabled).toBe(true);
    });

    it('应该正确处理自定义模型的添加', () => {
      const validConfig = {
        name: 'Custom Model',
        baseUrl: 'https://api.custom.com/chat',
        models: ['custom-model'],
        defaultModel: 'custom-model'
      };
      llmService.addCustomModel('custom', validConfig);
      expect(llmService.models.custom).toBeDefined();
      expect(llmService.models.custom.enabled).toBe(true);

      expect(() => llmService.addCustomModel('invalid', { name: 'Invalid' }))
        .toThrow('无效的模型配置');
    });

    it('应该正确处理模型配置的更新', () => {
      const updatedConfig = { name: 'Updated Model' };
      llmService.updateModelConfig(testProvider, updatedConfig);
      expect(llmService.models[testProvider].name).toBe(updatedConfig.name);

      expect(() => llmService.updateModelConfig('invalid', {}))
        .toThrow('未知的模型: invalid');
    });

    it('应该正确处理模型的删除', () => {
      const customConfig = {
        name: 'Custom Model',
        baseUrl: 'https://api.custom.com/chat',
        models: ['custom-model'],
        defaultModel: 'custom-model'
      };
      llmService.addCustomModel('custom', customConfig);
      expect(llmService.models.custom).toBeDefined();

      llmService.deleteModel('custom');
      expect(llmService.models.custom).toBeUndefined();

      // 不能删除默认模型
      expect(() => llmService.deleteModel(testProvider))
        .toThrow(`不能删除默认模型: ${testProvider}`);
    });
  });
});
