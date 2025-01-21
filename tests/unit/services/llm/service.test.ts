import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMService } from '../../../../src/services/llm/service';
import { APIError, RequestConfigError } from '../../../../src/services/llm/errors';
import { ModelConfig } from '../../../../src/services/model/types';
import { Message, RequestConfig } from '../../../../src/services/llm/types';
import { ModelManager } from '../../../../src/services/model/manager';

describe('LLMService', () => {
  let service: LLMService;
  
  beforeEach(() => {
    const modelManager = new ModelManager();
    service = new LLMService(modelManager);
    // Reset fetch mock
    vi.stubGlobal('fetch', vi.fn());
  });

  const mockModelConfig: ModelConfig = {
    name: 'Test Model',
    baseURL: 'https://api.test.com',
    apiKey: 'test-key',
    models: ['model-1'],
    defaultModel: 'model-1',
    enabled: true
  };

  const mockMessages: Message[] = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
  ];

  describe('buildRequestConfig', () => {
    it('should build valid request config', () => {
      const config = service.buildRequestConfig(mockModelConfig, mockMessages);
      
      expect(config).toEqual({
        url: mockModelConfig.baseURL,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockModelConfig.apiKey}`
        },
        body: {
          model: mockModelConfig.defaultModel,
          messages: mockMessages,
          temperature: 0.7,
          max_tokens: 2000
        }
      });
    });

    it('should throw error when model is disabled', () => {
      const disabledConfig = { ...mockModelConfig, enabled: false };
      expect(() => service.buildRequestConfig(disabledConfig, mockMessages))
        .toThrow(RequestConfigError);
    });

    it('should throw error when messages is empty', () => {
      expect(() => service.buildRequestConfig(mockModelConfig, []))
        .toThrow(RequestConfigError);
    });
  });

  describe('sendRequest', () => {
    const mockRequestConfig: RequestConfig = {
      url: 'https://api.test.com',
      headers: { 'Content-Type': 'application/json' },
      body: {
        model: 'test-model',
        messages: mockMessages
      }
    };

    const mockSuccessResponse = {
      choices: [
        {
          message: {
            content: 'Hello! How can I help you?'
          }
        }
      ]
    };

    it('should send request and return response content', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse)
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await service.sendRequest(mockRequestConfig);
      
      expect(mockFetch).toHaveBeenCalledWith(
        mockRequestConfig.url,
        expect.objectContaining({
          method: 'POST',
          headers: mockRequestConfig.headers,
          body: JSON.stringify(mockRequestConfig.body)
        })
      );
      expect(result).toBe('Hello! How can I help you?');
    });

    it('should throw APIError when response is not ok', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(service.sendRequest(mockRequestConfig))
        .rejects
        .toThrow(APIError);
    });

    it('should throw APIError when fetch fails', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', mockFetch);

      await expect(service.sendRequest(mockRequestConfig))
        .rejects
        .toThrow(APIError);
    });

    it('should throw APIError when response json is invalid', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(service.sendRequest(mockRequestConfig))
        .rejects
        .toThrow(APIError);
    });
  });
}); 