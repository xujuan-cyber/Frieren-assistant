import { 
  createLLMService,
  ModelManager,
  APIError,
  RequestConfigError,
  ERROR_MESSAGES
} from '../../../src/index.js';
import { expect, describe, it, beforeEach, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
beforeAll(() => {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  console.log('环境变量加载状态:', {
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    CUSTOM_API_KEY: !!process.env.VITE_CUSTOM_API_KEY,
    GEMINI_API_KEY: !!process.env.VITE_GEMINI_API_KEY,
    DEEPSEEK_API_KEY: !!process.env.VITE_DEEPSEEK_API_KEY
  });
});

describe('LLM 服务通用测试', () => {
  let llmService;
  let modelManager;

  beforeEach(() => {
    modelManager = new ModelManager();
    // 清除所有已有模型
    const models = modelManager.getAllModels();
    models.forEach(model => {
      if (model.key) {
        modelManager.deleteModel(model.key);
      }
    });
    llmService = createLLMService(modelManager);
  });

  describe('API 调用错误处理', () => {
    it('应该能正确处理无效的消息格式', async () => {
      const testModel = 'test-invalid-message';
      modelManager.addModel(testModel, {
        name: 'Test Model',
        baseURL: 'https://test.api/chat/completions',
        models: ['test-model'],
        defaultModel: 'test-model',
        apiKey: 'test-key',
        enabled: true,
        provider: 'openai'
      });

      await expect(async () => {
        await llmService.sendMessage([
          { role: 'invalid', content: '测试消息' }
        ], testModel);
      }).rejects.toThrow(RequestConfigError);
    });

    it('应该能正确处理未启用的模型', async () => {
      const testModel = 'test-disabled';
      modelManager.addModel(testModel, {
        name: 'Test Model',
        baseURL: 'https://test.api/chat/completions',
        models: ['test-model'],
        defaultModel: 'test-model',
        apiKey: 'test-key',
        enabled: false,
        provider: 'openai'
      });

      const messages = [
        { role: 'user', content: '你好，我们来玩个游戏' }
      ];

      await expect(async () => {
        await llmService.sendMessage(messages, testModel);
      }).rejects.toThrow(RequestConfigError);
    });

    it('应该能正确处理空消息列表', async () => {
      const testModel = 'test-empty-messages';
      modelManager.addModel(testModel, {
        name: 'Test Model',
        baseURL: 'https://test.api/chat/completions',
        models: ['test-model'],
        defaultModel: 'test-model',
        apiKey: 'test-key',
        enabled: true,
        provider: 'openai'
      });

      await expect(async () => {
        await llmService.sendMessage([], testModel);
      }).rejects.toThrow(RequestConfigError);
    });
  });

  describe('配置管理', () => {
    it('应该能正确处理模型配置更新', () => {
      const testModel = 'test-update';
      const config = {
        name: 'Test Model',
        baseURL: 'https://test.api/chat/completions',
        models: ['test-model'],
        defaultModel: 'test-model',
        apiKey: 'test-key',
        enabled: true,
        provider: 'openai'
      };

      modelManager.addModel(testModel, config);
      expect(modelManager.getModel(testModel)).toBeDefined();

      const newConfig = {
        name: 'Updated Model',
        baseURL: 'https://updated.api/chat/completions'
      };

      modelManager.updateModel(testModel, newConfig);
      const updatedModel = modelManager.getModel(testModel);
      expect(updatedModel.name).toBe(newConfig.name);
      expect(updatedModel.baseURL).toBe(newConfig.baseURL);
      expect(updatedModel.models).toEqual(config.models);
      expect(updatedModel.defaultModel).toBe(config.defaultModel);
      expect(updatedModel.enabled).toBe(config.enabled);
    });

    it('应该能正确处理模型的启用和禁用', () => {
      const testModel = 'test-enable-disable';
      const config = {
        name: 'Test Model',
        baseURL: 'https://test.api/chat/completions',
        models: ['test-model'],
        defaultModel: 'test-model',
        apiKey: 'test-key',
        enabled: true,
        provider: 'openai'
      };

      modelManager.addModel(testModel, config);
      const model = modelManager.getModel(testModel);
      expect(model.enabled).toBe(true);

      modelManager.updateModel(testModel, { enabled: false });
      expect(modelManager.getModel(testModel).enabled).toBe(false);

      modelManager.updateModel(testModel, { enabled: true });
      expect(modelManager.getModel(testModel).enabled).toBe(true);
    });
  });
}); 