import { LLMService } from '../../../../src/services/llm/service';
import { ModelManager } from '../../../../src/services/model/manager';
import { expect, describe, it, beforeEach, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
beforeAll(() => {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
});

describe('LLM 服务通用测试', () => {
  let llmService;
  let modelManager;

  beforeEach(() => {
    localStorage.clear();
    modelManager = new ModelManager();
    llmService = new LLMService();
  });

  describe('API 调用错误处理', () => {
    it('应该能正确处理无效的 API 密钥', async () => {
      const testModel = 'test';
      modelManager.addModel(testModel, {
        name: 'Test Model',
        baseURL: 'https://test.api/chat/completions',
        models: ['test-model'],
        defaultModel: 'test-model',
        apiKey: 'invalid-key',
        enabled: true
      });

      const messages = [
        { role: 'user', content: '你好，我们来玩个游戏' }
      ];

      const config = await llmService.buildRequestConfig(modelManager.getModel(testModel), messages);
      await expect(llmService.sendRequest(config))
        .rejects
        .toThrow();
    });

    it('应该能正确处理无效的 baseURL', async () => {
      const testModel = 'test';
      modelManager.addModel(testModel, {
        name: 'Test Model',
        baseURL: 'https://invalid.api/chat/completions',
        models: ['test-model'],
        defaultModel: 'test-model',
        apiKey: 'test-key',
        enabled: true
      });

      const messages = [
        { role: 'user', content: '你好，我们来玩个游戏' }
      ];

      const config = await llmService.buildRequestConfig(modelManager.getModel(testModel), messages);
      await expect(llmService.sendRequest(config))
        .rejects
        .toThrow();
    });

    it('应该能正确处理无效的消息格式', async () => {
      const testModel = 'test';
      modelManager.addModel(testModel, {
        name: 'Test Model',
        baseURL: 'https://test.api/chat/completions',
        models: ['test-model'],
        defaultModel: 'test-model',
        apiKey: 'test-key',
        enabled: true
      });

      await expect(async () => {
        const config = await llmService.buildRequestConfig(modelManager.getModel(testModel), [
          { role: 'invalid', content: '测试消息' }
        ]);
        await llmService.sendRequest(config);
      }).rejects.toThrow('无效的消息格式');
    });

    it('应该能正确处理未启用的模型', async () => {
      const testModel = 'test';
      modelManager.addModel(testModel, {
        name: 'Test Model',
        baseURL: 'https://test.api/chat/completions',
        models: ['test-model'],
        defaultModel: 'test-model',
        apiKey: 'test-key',
        enabled: false
      });

      const messages = [
        { role: 'user', content: '你好，我们来玩个游戏' }
      ];

      await expect(async () => {
        await llmService.buildRequestConfig(modelManager.getModel(testModel), messages);
      }).rejects.toThrow('模型未启用');
    });

    it('应该能正确处理空消息列表', async () => {
      const testModel = 'test';
      modelManager.addModel(testModel, {
        name: 'Test Model',
        baseURL: 'https://test.api/chat/completions',
        models: ['test-model'],
        defaultModel: 'test-model',
        apiKey: 'test-key',
        enabled: true
      });

      await expect(async () => {
        await llmService.buildRequestConfig(modelManager.getModel(testModel), []);
      }).rejects.toThrow('消息列表不能为空');
    });
  });

  describe('配置管理', () => {
    it('应该能正确处理模型配置更新', () => {
      const testModel = 'test';
      const config = {
        name: 'Test Model',
        baseURL: 'https://test.api/chat/completions',
        models: ['test-model'],
        defaultModel: 'test-model',
        apiKey: 'test-key',
        enabled: true
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
      const testModel = 'test';
      const config = {
        name: 'Test Model',
        baseURL: 'https://test.api/chat/completions',
        models: ['test-model'],
        defaultModel: 'test-model',
        apiKey: 'test-key',
        enabled: true
      };

      modelManager.addModel(testModel, config);
      expect(modelManager.getModel(testModel).enabled).toBe(true);

      modelManager.updateModel(testModel, { enabled: false });
      expect(modelManager.getModel(testModel).enabled).toBe(false);

      modelManager.updateModel(testModel, { enabled: true });
      expect(modelManager.getModel(testModel).enabled).toBe(true);
    });
  });
}); 