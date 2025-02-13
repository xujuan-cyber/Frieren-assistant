import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMService } from '../../../src/services/llm/service';
import { ModelManager } from '../../../src/services/model/manager';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { RequestConfigError, APIError } from '../../../src/services/llm/errors';

describe('LLMService', () => {
  let llmService;
  let modelManager;
  const testProvider = 'test-provider';
  const mockModelConfig = {
    provider: 'openai',
    apiKey: 'test-key',
    baseURL: 'https://api.test.com',
    defaultModel: 'test-model',
    enabled: true
  };

  beforeEach(() => {
    modelManager = new ModelManager();
    vi.spyOn(modelManager, 'getModel').mockReturnValue(mockModelConfig);
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
  });

  describe('消息发送', () => {
    it('应该正确发送消息', async () => {
      const mockResponse = new AIMessage('test response');
      vi.spyOn(ChatOpenAI.prototype, 'invoke').mockResolvedValue(mockResponse);

      const messages = [
        { role: 'system', content: 'test' },
        { role: 'user', content: 'test' }
      ];
      const result = await llmService.sendMessage(messages, testProvider);
      expect(result).toBe('test response');
    });

    it('当请求失败时应抛出错误', async () => {
      vi.spyOn(ChatOpenAI.prototype, 'invoke').mockRejectedValue(new Error('API Error'));

      const messages = [
        { role: 'system', content: 'test' }
      ];
      await expect(llmService.sendMessage(messages, testProvider))
        .rejects
        .toThrow('发送消息失败: API Error');
    });
  });
});
