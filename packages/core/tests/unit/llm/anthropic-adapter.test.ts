import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnthropicAdapter } from '../../../src/services/llm/adapters/anthropic-adapter';
import type { TextModelConfig, Message, StreamHandlers } from '../../../src/services/llm/types';

describe('AnthropicAdapter', () => {
  let adapter: AnthropicAdapter;
  const originalFetch = globalThis.fetch;

  const mockConfig: TextModelConfig = {
    id: 'anthropic',
    name: 'Anthropic',
    enabled: true,
    providerMeta: {
      id: 'anthropic',
      name: 'Anthropic',
      description: 'Anthropic Claude models',
      requiresApiKey: true,
      defaultBaseURL: 'https://api.anthropic.com/v1',
      supportsDynamicModels: false,
      connectionSchema: {
        required: ['apiKey'],
        optional: ['baseURL'],
        fieldTypes: {
          apiKey: 'string',
          baseURL: 'string'
        }
      }
    },
    modelMeta: {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      description: 'Most intelligent Claude model',
      providerId: 'anthropic',
      capabilities: {
        supportsTools: true,
        supportsReasoning: false,
        maxContextLength: 200000
      },
      parameterDefinitions: [],
      defaultParameterValues: {}
    },
    connectionConfig: {
      apiKey: 'test-api-key',
      baseURL: 'https://api.anthropic.com/v1'
    },
    paramOverrides: {}
  };

  const mockMessages: Message[] = [
    { role: 'user', content: 'Hello, Claude!' }
  ];

  beforeEach(() => {
    adapter = new AnthropicAdapter();
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('getProvider', () => {
    it('should return Anthropic provider metadata', () => {
      const provider = adapter.getProvider();

      expect(provider.id).toBe('anthropic');
      expect(provider.name).toBe('Anthropic');
      expect(provider.defaultBaseURL).toBe('https://api.anthropic.com/v1');
      expect(provider.supportsDynamicModels).toBe(false);
      expect(provider.requiresApiKey).toBe(true);
    });
  });

  describe('getModels', () => {
    it('should return static Claude models list', () => {
      const models = adapter.getModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);

      const claude35 = models.find(m => m.id.includes('claude-3-5'));
      expect(claude35).toBeDefined();
      expect(claude35?.providerId).toBe('anthropic');
    });
  });

  describe('buildDefaultModel', () => {
    it('should build valid TextModel for unknown model ID', () => {
      const model = adapter.buildDefaultModel('unknown-claude-model');

      expect(model.id).toBe('unknown-claude-model');
      expect(model.providerId).toBe('anthropic');
      expect(model.capabilities).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should throw error when API key is missing', async () => {
      const configWithoutKey = {
        ...mockConfig,
        connectionConfig: {
          ...mockConfig.connectionConfig,
          apiKey: ''
        }
      };

      await expect(
        adapter.sendMessage(mockMessages, configWithoutKey)
      ).rejects.toThrow();
    });
  });

  describe('sendMessage', () => {
    it('should return response content from Anthropic API', async () => {
      const anthropicResponse = {
        content: [
          { type: 'text', text: 'Hello from Claude.' }
        ],
        model: 'claude-sonnet-4-5',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 12,
          output_tokens: 50
        }
      };

      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => anthropicResponse
      });

      const response = await adapter.sendMessage(mockMessages, mockConfig);

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(response.content).toBe('Hello from Claude.');
      expect(response.metadata).toEqual({
        model: 'claude-sonnet-4-5',
        finishReason: 'end_turn'
      });
    });

    it('should throw descriptive error when HTTP request fails', async () => {
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      });

      await expect(adapter.sendMessage(mockMessages, mockConfig)).rejects.toThrow(
        /Anthropic API error \(401\)/
      );
    });
  });

  describe('sendMessageStream', () => {
    it('should simulate streaming by splitting response content', async () => {
      const anthropicResponse = {
        content: [
          { type: 'text', text: 'Hello world. This is Claude.' }
        ],
        model: 'claude-sonnet-4-5'
      };

      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => anthropicResponse
      });

      const callbacks: StreamHandlers = {
        onToken: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn()
      };

      await adapter.sendMessageStream(mockMessages, mockConfig, callbacks);

      expect(callbacks.onToken).toHaveBeenCalledTimes(2);
      expect(callbacks.onToken).toHaveBeenNthCalledWith(1, 'Hello world.');
      expect(callbacks.onToken).toHaveBeenNthCalledWith(2, 'This is Claude.');
      expect(callbacks.onComplete).toHaveBeenCalledWith({
        content: 'Hello world. This is Claude.',
        metadata: {
          model: 'claude-sonnet-4-5',
          stopReason: undefined,
          usage: undefined
        }
      });
      expect(callbacks.onError).not.toHaveBeenCalled();
    });
  });
});
