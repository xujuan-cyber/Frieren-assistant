import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiAdapter } from '../../../src/services/llm/adapters/gemini-adapter';
import type { TextModelConfig, Message } from '../../../src/services/llm/types';

// Mock Google Generative AI SDK
vi.mock('@google/generative-ai');

describe('GeminiAdapter', () => {
  let adapter: GeminiAdapter;

  const mockConfig: TextModelConfig = {
    id: 'gemini',
    name: 'Gemini',
    enabled: true,
    providerMeta: {
      id: 'gemini',
      name: 'Google Gemini',
      description: 'Google Generative AI models',
      requiresApiKey: true,
      defaultBaseURL: 'https://generativelanguage.googleapis.com',
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
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      description: 'Latest Gemini model',
      providerId: 'gemini',
      capabilities: {
        supportsTools: true,
        supportsReasoning: false,
        maxContextLength: 1000000
      },
      parameterDefinitions: [],
      defaultParameterValues: {}
    },
    connectionConfig: {
      apiKey: 'test-api-key',
      baseURL: 'https://generativelanguage.googleapis.com'
    },
    paramOverrides: {}
  };

  const mockMessages: Message[] = [
    { role: 'user', content: 'Hello, Gemini!' }
  ];

  beforeEach(() => {
    adapter = new GeminiAdapter();
    vi.clearAllMocks();
  });

  describe('getProvider', () => {
    it('should return Gemini provider metadata', () => {
      const provider = adapter.getProvider();

      expect(provider.id).toBe('gemini');
      expect(provider.name).toBe('Google Gemini');
      expect(provider.defaultBaseURL).toBe('https://generativelanguage.googleapis.com');
      expect(provider.supportsDynamicModels).toBe(false);
      expect(provider.requiresApiKey).toBe(true);
    });
  });

  describe('getModels', () => {
    it('should return static Gemini models list', () => {
      const models = adapter.getModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);

      const gemini2Flash = models.find(m => m.id === 'gemini-2.0-flash-exp');
      expect(gemini2Flash).toBeDefined();
      expect(gemini2Flash?.providerId).toBe('gemini');
    });
  });

  describe('buildDefaultModel', () => {
    it('should build valid TextModel for unknown model ID', () => {
      const model = adapter.buildDefaultModel('unknown-gemini-model');

      expect(model.id).toBe('unknown-gemini-model');
      expect(model.providerId).toBe('gemini');
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
});
