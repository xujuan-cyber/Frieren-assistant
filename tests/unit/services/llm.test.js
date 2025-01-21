import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMService } from '../../../src/services/llm/service';
import { ModelManager } from '../../../src/services/model/manager';
import { RequestConfigError } from '../../../src/services/llm/errors';

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

// Mock ModelManager
vi.mock('../../../src/services/model/manager', () => {
  const mockModel = {
    name: 'Test Model',
    baseURL: 'https://test.api/chat',
    models: ['test-model'],
    defaultModel: 'test-model',
    enabled: true,
    apiKey: 'test-api-key'
  };

  return {
    ModelManager: vi.fn().mockImplementation(() => ({
      getModel: vi.fn().mockReturnValue(mockModel),
      updateModel: vi.fn(),
      addModel: vi.fn(),
      deleteModel: vi.fn()
    }))
  };
});

describe('LLMService', () => {
  let llmService;
  let modelManager;
  const testProvider = 'test';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    modelManager = new ModelManager();
    llmService = new LLMService(modelManager);
  });

  describe('API 调用', () => {
    it('应该正确发送消息', async () => {
      const messages = [{ role: 'user', content: 'Test message' }];
      const response = await llmService.sendMessage(messages, testProvider);
      expect(response).toBe('Mock response');
      expect(fetch).toHaveBeenCalled();
      expect(modelManager.getModel).toHaveBeenCalledWith(testProvider);
    });

    it('应该正确处理优化请求', async () => {
      const prompt = 'Test prompt';
      const response = await llmService.optimizePrompt(prompt, 'optimize', testProvider);
      expect(response).toBe('Mock response');
      expect(fetch).toHaveBeenCalled();
      expect(modelManager.getModel).toHaveBeenCalledWith(testProvider);
    });

    it('应该正确处理迭代请求', async () => {
      const originalPrompt = 'Original prompt';
      const iterateInput = 'Iterate input';
      const response = await llmService.iteratePrompt(originalPrompt, iterateInput, testProvider);
      expect(response).toBe('Mock response');
      expect(fetch).toHaveBeenCalled();
      expect(modelManager.getModel).toHaveBeenCalledWith(testProvider);
    });

    it('应该正确处理不存在的模型', async () => {
      modelManager.getModel.mockReturnValueOnce(undefined);
      await expect(llmService.sendMessage([], testProvider))
        .rejects
        .toThrow(`模型 ${testProvider} 不存在`);
    });

    it('应该正确处理未启用的模型', async () => {
      modelManager.getModel.mockReturnValueOnce({
        ...modelManager.getModel(),
        enabled: false
      });
      await expect(llmService.sendMessage([], testProvider))
        .rejects
        .toThrow('模型未启用');
    });

    it('应该正确处理空消息列表', async () => {
      await expect(llmService.sendMessage([], testProvider))
        .rejects
        .toThrow('消息列表不能为空');
    });

    it('应该正确处理无效的消息格式', async () => {
      const invalidMessages = [{ role: 'invalid', content: 'test' }];
      await expect(llmService.sendMessage(invalidMessages, testProvider))
        .rejects
        .toThrow('无效的消息格式');
    });

    it('应该正确处理 API 错误', async () => {
      global.fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
      );

      await expect(llmService.sendMessage([{ role: 'user', content: 'test' }], testProvider))
        .rejects
        .toThrow('请求失败');
    });
  });
});
