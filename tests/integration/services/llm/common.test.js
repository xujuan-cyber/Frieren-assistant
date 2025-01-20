import { LLMService } from '../../../../src/services/llm';
import { expect, describe, it, beforeEach } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
beforeAll(() => {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
});

describe('LLM 服务通用测试', () => {
  let llmService;

  beforeEach(() => {
    localStorage.clear();
    llmService = new LLMService();
  });

  describe('API 调用错误处理', () => {
    it('应该能正确处理无效的 API 密钥', async () => {
      // 添加测试模型
      llmService.addCustomModel('test', {
        name: 'Test Model',
        baseUrl: 'https://test.api/chat/completions',
        models: ['test-model'],
        defaultModel: 'test-model'
      });

      llmService.setApiKey('test', 'invalid-key');
      llmService.setProvider('test');

      const messages = [
        { role: 'user', content: '测试消息' }
      ];

      await expect(llmService.sendMessage(messages))
        .rejects
        .toThrow();
    });

    it('应该能正确处理无效的 baseURL', async () => {
      // 添加测试模型
      llmService.addCustomModel('test', {
        name: 'Test Model',
        baseUrl: 'https://invalid.api/chat/completions',
        models: ['test-model'],
        defaultModel: 'test-model'
      });

      llmService.setApiKey('test', 'test-key');
      llmService.setProvider('test');

      const messages = [
        { role: 'user', content: '测试消息' }
      ];

      await expect(llmService.sendMessage(messages))
        .rejects
        .toThrow();
    });

    it('应该能正确处理无效的消息格式', async () => {
      // 添加测试模型
      llmService.addCustomModel('test', {
        name: 'Test Model',
        baseUrl: 'https://test.api/chat/completions',
        models: ['test-model'],
        defaultModel: 'test-model'
      });

      llmService.setApiKey('test', 'test-key');
      llmService.setProvider('test');

      // 测试无效的消息格式
      await expect(llmService.sendMessage([
        { role: 'invalid', content: '测试消息' }
      ]))
        .rejects
        .toThrow();
    });
  });

  describe('配置管理', () => {
    it('应该能正确处理模型配置更新', () => {
      // 添加测试模型
      const config = {
        name: 'Test Model',
        baseUrl: 'https://test.api/chat/completions',
        models: ['test-model'],
        defaultModel: 'test-model'
      };

      llmService.addCustomModel('test', config);
      expect(llmService.getModel('test')).toBeDefined();

      // 更新配置
      const newConfig = {
        name: 'Updated Model',
        baseUrl: 'https://updated.api/chat/completions'
      };

      llmService.updateModelConfig('test', newConfig);
      const updatedModel = llmService.getModel('test');
      expect(updatedModel.name).toBe(newConfig.name);
      expect(updatedModel.baseUrl).toBe(newConfig.baseUrl);
    });
  });
}); 