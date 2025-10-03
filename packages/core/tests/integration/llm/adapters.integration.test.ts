import { describe, it, expect, beforeAll } from 'vitest';
import { TextAdapterRegistry } from '../../../src/services/llm/adapters/registry';
import type { TextModelConfig, Message } from '../../../src/services/llm/types';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
beforeAll(() => {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
});

const RUN_REAL_API = process.env.RUN_REAL_API === '1';

describe.skipIf(!RUN_REAL_API)('Adapter Integration Tests - Real SDK', () => {
  let registry: TextAdapterRegistry;

  beforeAll(() => {
    registry = new TextAdapterRegistry();
  });

  describe('OpenAIAdapter Real API', () => {
    const hasApiKey = !!(process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY);

    it.skipIf(!hasApiKey)('should successfully call OpenAI API with sendMessage', async () => {
      const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

      const config: TextModelConfig = {
        id: 'openai',
        name: 'OpenAI',
        enabled: true,
        providerMeta: registry.getAdapter('openai').getProvider(),
        modelMeta: {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          description: 'Fast and cost-effective model',
          providerId: 'openai',
          capabilities: {
            supportsStreaming: true,
            supportsTools: true,
            supportsReasoning: false,
            maxContextLength: 16000
          },
          parameterDefinitions: [],
          defaultParameterValues: {}
        },
        connectionConfig: {
          apiKey: apiKey!,
          baseURL: 'https://api.openai.com/v1'
        },
        paramOverrides: {
          temperature: 0.7,
          max_tokens: 100
        }
      };

      const messages: Message[] = [
        { role: 'user', content: '请用一句话介绍你自己' }
      ];

      const adapter = registry.getAdapter('openai');
      const response = await adapter.sendMessage(messages, config);

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
      expect(response.metadata.model).toBe('gpt-3.5-turbo');

      console.log('OpenAI API Response:', response.content.substring(0, 100));
    }, 30000);

    it.skipIf(!hasApiKey)('should successfully stream OpenAI API with callbacks', async () => {
      const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

      const config: TextModelConfig = {
        id: 'openai',
        name: 'OpenAI',
        enabled: true,
        providerMeta: registry.getAdapter('openai').getProvider(),
        modelMeta: {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          description: 'Fast and cost-effective model',
          providerId: 'openai',
          capabilities: {
            supportsStreaming: true,
            supportsTools: true,
            supportsReasoning: false,
            maxContextLength: 16000
          },
          parameterDefinitions: [],
          defaultParameterValues: {}
        },
        connectionConfig: {
          apiKey: apiKey!,
          baseURL: 'https://api.openai.com/v1'
        },
        paramOverrides: {}
      };

      const messages: Message[] = [
        { role: 'user', content: '请说"你好"' }
      ];

      let contentTokens = '';
      let tokenCount = 0;
      let finalResponse: any = null;
      let isCompleted = false;

      const adapter = registry.getAdapter('openai');
      await adapter.sendMessageStream(messages, config, {
        onToken: (token) => {
          contentTokens += token;
          tokenCount++;
        },
        onComplete: (response) => {
          finalResponse = response;
          isCompleted = true;
        },
        onError: (error) => {
          console.error('Streaming error:', error);
        }
      });

      // Wait for stream to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(isCompleted).toBe(true);
      expect(tokenCount).toBeGreaterThan(0);
      expect(contentTokens.length).toBeGreaterThan(0);
      expect(finalResponse).toBeDefined();
      expect(finalResponse.content).toBe(contentTokens);

      console.log('OpenAI Streaming Result:', {
        tokenCount,
        contentLength: contentTokens.length,
        content: contentTokens
      });
    }, 30000);

    it.skipIf(!hasApiKey)('should handle OpenAI API errors with stack trace', async () => {
      const config: TextModelConfig = {
        id: 'openai',
        name: 'OpenAI',
        enabled: true,
        providerMeta: registry.getAdapter('openai').getProvider(),
        modelMeta: {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          description: 'Fast and cost-effective model',
          providerId: 'openai',
          capabilities: {
            supportsStreaming: true,
            supportsTools: true,
            supportsReasoning: false,
            maxContextLength: 16000
          },
          parameterDefinitions: [],
          defaultParameterValues: {}
        },
        connectionConfig: {
          apiKey: 'invalid-api-key',
          baseURL: 'https://api.openai.com/v1'
        },
        paramOverrides: {}
      };

      const messages: Message[] = [
        { role: 'user', content: 'Test' }
      ];

      const adapter = registry.getAdapter('openai');

      try {
        await adapter.sendMessage(messages, config);
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.stack).toBeDefined();
        expect(error.message).toBeDefined();
        console.log('OpenAI Error Stack Preserved:', error.stack.substring(0, 200));
      }
    }, 30000);
  });

  describe('GeminiAdapter Real API', () => {
    const hasApiKey = !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);

    it.skipIf(!hasApiKey)('should successfully call Gemini API', async () => {
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

      const config: TextModelConfig = {
        id: 'gemini',
        name: 'Gemini',
        enabled: true,
        providerMeta: registry.getAdapter('gemini').getProvider(),
        modelMeta: {
          id: 'gemini-2.0-flash-exp',
          name: 'Gemini 2.0 Flash',
          description: 'Latest Gemini model',
          providerId: 'gemini',
          capabilities: {
            supportsStreaming: true,
            supportsTools: true,
            supportsReasoning: false,
            maxContextLength: 1000000
          },
          parameterDefinitions: [],
          defaultParameterValues: {}
        },
        connectionConfig: {
          apiKey: apiKey!
        },
        paramOverrides: {
          temperature: 0.7,
          maxOutputTokens: 100
        }
      };

      const messages: Message[] = [
        { role: 'user', content: '请用一句话介绍你自己' }
      ];

      const adapter = registry.getAdapter('gemini');
      const response = await adapter.sendMessage(messages, config);

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);

      console.log('Gemini API Response:', response.content.substring(0, 100));
    }, 30000);

    it.skipIf(!hasApiKey)('should successfully stream Gemini API', async () => {
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

      const config: TextModelConfig = {
        id: 'gemini',
        name: 'Gemini',
        enabled: true,
        providerMeta: registry.getAdapter('gemini').getProvider(),
        modelMeta: {
          id: 'gemini-2.0-flash-exp',
          name: 'Gemini 2.0 Flash',
          description: 'Latest Gemini model',
          providerId: 'gemini',
          capabilities: {
            supportsStreaming: true,
            supportsTools: true,
            supportsReasoning: false,
            maxContextLength: 1000000
          },
          parameterDefinitions: [],
          defaultParameterValues: {}
        },
        connectionConfig: {
          apiKey: apiKey!
        },
        paramOverrides: {}
      };

      const messages: Message[] = [
        { role: 'user', content: '请说"你好"' }
      ];

      let contentTokens = '';
      let tokenCount = 0;
      let isCompleted = false;

      const adapter = registry.getAdapter('gemini');
      await adapter.sendMessageStream(messages, config, {
        onToken: (token) => {
          contentTokens += token;
          tokenCount++;
        },
        onComplete: (response) => {
          isCompleted = true;
        },
        onError: (error) => {
          console.error('Gemini streaming error:', error);
        }
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(isCompleted).toBe(true);
      expect(tokenCount).toBeGreaterThan(0);
      expect(contentTokens.length).toBeGreaterThan(0);

      console.log('Gemini Streaming Result:', {
        tokenCount,
        contentLength: contentTokens.length,
        content: contentTokens
      });
    }, 30000);
  });

  describe('AnthropicAdapter Real API', () => {
    const hasApiKey = !!(process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY);

    it.skipIf(!hasApiKey)('should successfully call Anthropic API', async () => {
      const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;

      const config: TextModelConfig = {
        id: 'anthropic',
        name: 'Anthropic',
        enabled: true,
        providerMeta: registry.getAdapter('anthropic').getProvider(),
        modelMeta: {
          id: 'claude-3-5-sonnet-20241022',
          name: 'Claude 3.5 Sonnet',
          description: 'Most intelligent Claude model',
          providerId: 'anthropic',
          capabilities: {
            supportsStreaming: true,
            supportsTools: true,
            supportsReasoning: false,
            maxContextLength: 200000
          },
          parameterDefinitions: [],
          defaultParameterValues: {}
        },
        connectionConfig: {
          apiKey: apiKey!
        },
        paramOverrides: {
          temperature: 0.7,
          max_tokens: 100
        }
      };

      const messages: Message[] = [
        { role: 'user', content: '请用一句话介绍你自己' }
      ];

      const adapter = registry.getAdapter('anthropic');
      const response = await adapter.sendMessage(messages, config);

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);

      console.log('Anthropic API Response:', response.content.substring(0, 100));
    }, 30000);

    it.skipIf(!hasApiKey)('should successfully stream Anthropic API', async () => {
      const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;

      const config: TextModelConfig = {
        id: 'anthropic',
        name: 'Anthropic',
        enabled: true,
        providerMeta: registry.getAdapter('anthropic').getProvider(),
        modelMeta: {
          id: 'claude-3-5-sonnet-20241022',
          name: 'Claude 3.5 Sonnet',
          description: 'Most intelligent Claude model',
          providerId: 'anthropic',
          capabilities: {
            supportsStreaming: true,
            supportsTools: true,
            supportsReasoning: false,
            maxContextLength: 200000
          },
          parameterDefinitions: [],
          defaultParameterValues: {}
        },
        connectionConfig: {
          apiKey: apiKey!
        },
        paramOverrides: {}
      };

      const messages: Message[] = [
        { role: 'user', content: '请说"你好"' }
      ];

      let contentTokens = '';
      let tokenCount = 0;
      let isCompleted = false;

      const adapter = registry.getAdapter('anthropic');
      await adapter.sendMessageStream(messages, config, {
        onToken: (token) => {
          contentTokens += token;
          tokenCount++;
        },
        onComplete: (response) => {
          isCompleted = true;
        },
        onError: (error) => {
          console.error('Anthropic streaming error:', error);
        }
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(isCompleted).toBe(true);
      expect(tokenCount).toBeGreaterThan(0);
      expect(contentTokens.length).toBeGreaterThan(0);

      console.log('Anthropic Streaming Result:', {
        tokenCount,
        contentLength: contentTokens.length,
        content: contentTokens
      });
    }, 30000);
  });

  describe('Tool Calls Integration', () => {
    const hasOpenAI = !!(process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY);

    it.skipIf(!hasOpenAI)('should handle tool calls with OpenAI', async () => {
      const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

      const config: TextModelConfig = {
        id: 'openai',
        name: 'OpenAI',
        enabled: true,
        providerMeta: registry.getAdapter('openai').getProvider(),
        modelMeta: {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          description: 'Fast and cost-effective model',
          providerId: 'openai',
          capabilities: {
            supportsStreaming: true,
            supportsTools: true,
            supportsReasoning: false,
            maxContextLength: 16000
          },
          parameterDefinitions: [],
          defaultParameterValues: {}
        },
        connectionConfig: {
          apiKey: apiKey!,
          baseURL: 'https://api.openai.com/v1'
        },
        paramOverrides: {}
      };

      const messages: Message[] = [
        { role: 'user', content: '现在北京的天气怎么样?' }
      ];

      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'get_weather',
            description: '获取指定城市的天气信息',
            parameters: {
              type: 'object',
              properties: {
                city: {
                  type: 'string',
                  description: '城市名称'
                }
              },
              required: ['city']
            }
          }
        }
      ];

      let toolCalls: any[] = [];
      let isCompleted = false;

      const adapter = registry.getAdapter('openai');
      await adapter.sendMessageStreamWithTools(messages, config, tools, {
        onToken: (token) => {
          // Content tokens
        },
        onToolCall: (toolCall) => {
          toolCalls.push(toolCall);
          console.log('Tool Call Received:', toolCall);
        },
        onComplete: (response) => {
          isCompleted = true;
        },
        onError: (error) => {
          console.error('Tool call error:', error);
        }
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      expect(isCompleted).toBe(true);
      expect(toolCalls.length).toBeGreaterThan(0);
      expect(toolCalls[0].function).toBeDefined();
      expect(toolCalls[0].function.name).toBe('get_weather');
      expect(toolCalls[0].function.arguments).toBeDefined();

      console.log('Tool Calls Result:', toolCalls);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should throw clear error for unknown provider', () => {
      expect(() => registry.getAdapter('unknown-provider'))
        .toThrow('Unknown provider: unknown-provider');
    });

    it('should return correct static models for each provider', () => {
      const openaiModels = registry.getStaticModels('openai');
      const geminiModels = registry.getStaticModels('gemini');
      const anthropicModels = registry.getStaticModels('anthropic');

      expect(openaiModels.length).toBeGreaterThan(0);
      expect(geminiModels.length).toBeGreaterThan(0);
      expect(anthropicModels.length).toBeGreaterThan(0);

      expect(openaiModels.every(m => m.providerId === 'openai')).toBe(true);
      expect(geminiModels.every(m => m.providerId === 'gemini')).toBe(true);
      expect(anthropicModels.every(m => m.providerId === 'anthropic')).toBe(true);
    });
  });
});
