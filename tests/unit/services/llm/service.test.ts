import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMService } from '../../../../src/services/llm/service';
import { APIError, RequestConfigError } from '../../../../src/services/llm/errors';
import { ModelConfig } from '../../../../src/services/model/types';
import { Message } from '../../../../src/services/llm/types';
import { ModelManager } from '../../../../src/services/model/manager';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AIMessageChunk } from '@langchain/core/messages';

describe('LLMService', () => {
  let service: LLMService;
  let modelManager: ModelManager;
  
  beforeEach(() => {
    modelManager = new ModelManager();
    service = new LLMService(modelManager);
    vi.clearAllMocks();
  });

  const mockModelConfig: ModelConfig = {
    name: 'Test Model',
    baseURL: 'https://api.test.com',
    apiKey: 'test-key',
    models: ['model-1'],
    defaultModel: 'model-1',
    enabled: true,
    provider: 'openai'
  };

  const mockMessages: Message[] = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
  ];

  describe('sendMessage', () => {
    it('should throw error when model is disabled', async () => {
      const disabledConfig = { ...mockModelConfig, enabled: false };
      vi.spyOn(modelManager, 'getModel').mockReturnValue(disabledConfig);

      await expect(service.sendMessage(mockMessages, 'test'))
        .rejects
        .toThrow(RequestConfigError);
    });

    it('should throw error when model does not exist', async () => {
      vi.spyOn(modelManager, 'getModel').mockReturnValue(undefined);

      await expect(service.sendMessage(mockMessages, 'non-existent'))
        .rejects
        .toThrow(RequestConfigError);
    });

    it('should successfully send message using OpenAI model', async () => {
      vi.spyOn(modelManager, 'getModel').mockReturnValue(mockModelConfig);
      const mockResponse = new AIMessageChunk('Test response');
      vi.spyOn(ChatOpenAI.prototype, 'invoke').mockResolvedValue(mockResponse);

      const response = await service.sendMessage(mockMessages, 'test');
      expect(response).toBe('Test response');
    });

    it('should successfully send message using Gemini model', async () => {
      const geminiConfig = { ...mockModelConfig, provider: 'gemini' };
      vi.spyOn(modelManager, 'getModel').mockReturnValue(geminiConfig);
      const mockResponse = new AIMessageChunk('Test response');
      vi.spyOn(ChatGoogleGenerativeAI.prototype, 'invoke').mockResolvedValue(mockResponse);

      const response = await service.sendMessage(mockMessages, 'test');
      expect(response).toBe('Test response');
    });

    it('should handle API errors gracefully', async () => {
      vi.spyOn(modelManager, 'getModel').mockReturnValue(mockModelConfig);
      vi.spyOn(ChatOpenAI.prototype, 'invoke').mockRejectedValue(new Error('API Error'));

      await expect(service.sendMessage(mockMessages, 'test'))
        .rejects
        .toThrow(APIError);
    });
  });
}); 