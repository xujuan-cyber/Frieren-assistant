import { createLLMService, ModelManager, LocalStorageProvider } from '../../../src/index.js';
import { expect, describe, it, beforeEach, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
beforeAll(() => {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
});

const RUN_REAL_API = process.env.RUN_REAL_API === '1'

describe.skipIf(!RUN_REAL_API)('Tool Calls Real API Integration Tests', () => {
  // 检查OpenAI兼容的环境变量（任何一个存在就可以运行测试）
  const openaiCompatibleKeys = [
    'OPENAI_API_KEY', 'VITE_OPENAI_API_KEY',
    'DEEPSEEK_API_KEY', 'VITE_DEEPSEEK_API_KEY', 
    'SILICONFLOW_API_KEY', 'VITE_SILICONFLOW_API_KEY',
    'ZHIPU_API_KEY', 'VITE_ZHIPU_API_KEY',
    'CUSTOM_API_KEY', 'VITE_CUSTOM_API_KEY'
  ];

  const geminiKeys = ['GEMINI_API_KEY', 'VITE_GEMINI_API_KEY'];

  const availableOpenAIKeys = openaiCompatibleKeys.filter(key => 
    process.env[key] && process.env[key].trim()
  );
  
  const availableGeminiKeys = geminiKeys.filter(key => 
    process.env[key] && process.env[key].trim()
  );

  console.log('工具调用真实API测试环境检查:', {
    openaiCompatible: availableOpenAIKeys.length > 0,
    gemini: availableGeminiKeys.length > 0
  });

  // 测试用工具定义
  const weatherTool = {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather information for a specific location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The location to get weather for (e.g., "Beijing", "New York")'
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'Temperature unit',
            default: 'celsius'
          }
        },
        required: ['location']
      }
    }
  };

  const calculatorTool = {
    type: 'function',
    function: {
      name: 'calculate',
      description: 'Perform basic mathematical calculations',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression to evaluate (e.g., "2 + 3 * 4")'
          }
        },
        required: ['expression']
      }
    }
  };

  // 获取OpenAI兼容模型配置
  const getOpenAIModelConfig = () => {
    if (process.env.SILICONFLOW_API_KEY || process.env.VITE_SILICONFLOW_API_KEY) {
      return {
        key: 'siliconflow',
        apiKey: process.env.SILICONFLOW_API_KEY || process.env.VITE_SILICONFLOW_API_KEY,
        baseURL: 'https://api.siliconflow.cn/v1',
        defaultModel: 'Qwen/Qwen3-32B'
      };
    }
    if (process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY) {
      return {
        key: 'openai',
        apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
        baseURL: 'https://api.openai.com/v1',
        defaultModel: 'gpt-3.5-turbo'
      };
    }
    if (process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY) {
      return {
        key: 'deepseek',
        apiKey: process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com/v1',
        defaultModel: 'deepseek-chat'
      };
    }
    return null;
  };

  // 获取Gemini模型配置
  const getGeminiModelConfig = () => {
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    
    return {
      key: 'gemini',
      apiKey: apiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta',
      defaultModel: 'gemini-2.0-flash'
    };
  };

  describe('OpenAI Compatible API Tool Calls', () => {
    const modelConfig = getOpenAIModelConfig();
    const runTests = !!modelConfig;

    it.runIf(runTests)('should handle tool calls with OpenAI compatible API', async () => {
      const storage = new LocalStorageProvider();
      const modelManager = new ModelManager(storage);
      const llmService = createLLMService(modelManager);

      // 清理存储，确保测试独立
      await storage.clearAll();

      // 添加模型配置
      await modelManager.addModel(`${modelConfig.key}_tool_test`, {
        name: `${modelConfig.key} Tool Test`,
        baseURL: modelConfig.baseURL,
        apiKey: modelConfig.apiKey,
        models: [modelConfig.defaultModel],
        defaultModel: modelConfig.defaultModel,
        enabled: true,
        provider: 'openai'
      });

      const messages = [
        { role: 'system', content: 'You are a helpful assistant that can get weather information and perform calculations. When users ask about weather or math, use the appropriate tools.' },
        { role: 'user', content: 'What is the weather like in Beijing, and what is 15 * 24?' }
      ];

      const tools = [weatherTool, calculatorTool];
      let toolCallsReceived = [];
      let responseContent = '';

      const result = await new Promise((resolve, reject) => {
        llmService.sendMessageStreamWithTools(
          messages,
          `${modelConfig.key}_tool_test`,
          tools,
          {
            onToken: (token) => {
              responseContent += token;
            },
            onToolCall: (toolCall) => {
              toolCallsReceived.push(toolCall);
              console.log('OpenAI Tool Call received:', toolCall);
            },
            onComplete: (response) => {
              resolve({ content: responseContent, toolCalls: toolCallsReceived, response });
            },
            onError: reject
          }
        );
      });

      // 验证响应
      expect(result).toBeDefined();
      expect(typeof result.content).toBe('string');
      console.log('OpenAI Response content:', result.content);
      console.log('OpenAI Tool calls received:', result.toolCalls.length);

      // 验证工具调用（如果有的话）
      if (result.toolCalls.length > 0) {
        result.toolCalls.forEach(toolCall => {
          expect(toolCall).toHaveProperty('id');
          expect(toolCall.type).toBe('function');
          expect(toolCall.function).toHaveProperty('name');
          expect(toolCall.function).toHaveProperty('arguments');
          expect(['get_weather', 'calculate']).toContain(toolCall.function.name);
          
          // 验证参数是有效的JSON
          expect(() => JSON.parse(toolCall.function.arguments)).not.toThrow();
        });
      }

    }, 30000);

    it.skipIf(!runTests)(`跳过OpenAI兼容API工具调用测试 - 未设置API密钥`, () => {
      expect(true).toBe(true);
    });
  });

  describe('Gemini API Tool Calls', () => {
    const modelConfig = getGeminiModelConfig();
    const runTests = !!modelConfig;

    // Gemini API可能有频率限制，在测试间添加延迟
    beforeEach(async () => {
      if (runTests) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
      }
    });

    it.runIf(runTests)('should handle tool calls with Gemini API', async () => {
      const storage = new LocalStorageProvider();
      const modelManager = new ModelManager(storage);
      const llmService = createLLMService(modelManager);

      // 清理存储，确保测试独立
      await storage.clearAll();

      // 添加Gemini模型配置
      await modelManager.addModel(`${modelConfig.key}_tool_test`, {
        name: 'Gemini Tool Test',
        baseURL: modelConfig.baseURL,
        apiKey: modelConfig.apiKey,
        models: [modelConfig.defaultModel],
        defaultModel: modelConfig.defaultModel,
        enabled: true,
        provider: 'gemini'
      });

      const messages = [
        { role: 'system', content: 'You are a helpful assistant that can get weather information and perform calculations. When users ask about weather or math, use the appropriate tools.' },
        { role: 'user', content: 'Please tell me the weather in Shanghai and calculate 25 + 17' }
      ];

      const tools = [weatherTool, calculatorTool];
      let toolCallsReceived = [];
      let responseContent = '';

      const result = await new Promise((resolve, reject) => {
        llmService.sendMessageStreamWithTools(
          messages,
          `${modelConfig.key}_tool_test`,
          tools,
          {
            onToken: (token) => {
              responseContent += token;
            },
            onToolCall: (toolCall) => {
              toolCallsReceived.push(toolCall);
              console.log('Gemini Tool Call received:', toolCall);
            },
            onComplete: (response) => {
              resolve({ content: responseContent, toolCalls: toolCallsReceived, response });
            },
            onError: reject
          }
        );
      });

      // 验证响应
      expect(result).toBeDefined();
      expect(typeof result.content).toBe('string');
      console.log('Gemini Response content:', result.content);
      console.log('Gemini Tool calls received:', result.toolCalls.length);

      // 验证工具调用（如果有的话）
      if (result.toolCalls.length > 0) {
        result.toolCalls.forEach(toolCall => {
          expect(toolCall).toHaveProperty('id');
          expect(toolCall.type).toBe('function');
          expect(toolCall.function).toHaveProperty('name');
          expect(toolCall.function).toHaveProperty('arguments');
          expect(['get_weather', 'calculate']).toContain(toolCall.function.name);
          
          // 验证参数是有效的JSON
          expect(() => JSON.parse(toolCall.function.arguments)).not.toThrow();
        });
      }

    }, 30000);

    it.skipIf(!runTests)(`跳过Gemini API工具调用测试 - 未设置API密钥`, () => {
      expect(true).toBe(true);
    });
  });

  describe('Tool Call Format Validation', () => {
    const openaiConfig = getOpenAIModelConfig();
    const geminiConfig = getGeminiModelConfig();
    const runTests = !!(openaiConfig || geminiConfig);

    it.runIf(runTests)('should generate valid tool call IDs and formats', async () => {
      const config = openaiConfig || geminiConfig;
      const storage = new LocalStorageProvider();
      const modelManager = new ModelManager(storage);
      const llmService = createLLMService(modelManager);

      // 清理存储，确保测试独立
      await storage.clearAll();

      // 添加模型配置
      await modelManager.addModel(`${config.key}_format_test`, {
        name: `${config.key} Format Test`,
        baseURL: config.baseURL,
        apiKey: config.apiKey,
        models: [config.defaultModel],
        defaultModel: config.defaultModel,
        enabled: true,
        provider: config.key === 'gemini' ? 'gemini' : 'openai'
      });

      const messages = [
        { role: 'user', content: 'What is the weather in Tokyo?' }
      ];

      const tools = [weatherTool];
      let toolCallsReceived = [];

      await new Promise((resolve, reject) => {
        llmService.sendMessageStreamWithTools(
          messages,
          `${config.key}_format_test`,
          tools,
          {
            onToken: () => {}, // 忽略token
            onToolCall: (toolCall) => {
              toolCallsReceived.push(toolCall);
              
              // 验证工具调用格式
              expect(toolCall.id).toMatch(/^call_\d+_[a-z0-9]+$/);
              expect(toolCall.type).toBe('function');
              expect(toolCall.function.name).toBe('get_weather');
              
              const args = JSON.parse(toolCall.function.arguments);
              expect(args).toHaveProperty('location');
              expect(typeof args.location).toBe('string');
              expect(args.location.toLowerCase()).toContain('tokyo');
            },
            onComplete: resolve,
            onError: reject
          }
        );
      });

      console.log(`${config.key} format validation - Tool calls received:`, toolCallsReceived.length);

    }, 30000);

    it.skipIf(!runTests)(`跳过工具调用格式验证测试 - 未设置API密钥`, () => {
      expect(true).toBe(true);
    });
  });

  describe('Complex Tool Scenarios', () => {
    const openaiConfig = getOpenAIModelConfig();
    const runTests = !!openaiConfig; // 只在OpenAI兼容API上测试复杂场景

    it.runIf(runTests)('should handle multiple tools in single request', async () => {
      const storage = new LocalStorageProvider();
      const modelManager = new ModelManager(storage);
      const llmService = createLLMService(modelManager);

      // 清理存储，确保测试独立
      await storage.clearAll();

      // 添加模型配置
      await modelManager.addModel(`${openaiConfig.key}_multi_tool_test`, {
        name: `${openaiConfig.key} Multi Tool Test`,
        baseURL: openaiConfig.baseURL,
        apiKey: openaiConfig.apiKey,
        models: [openaiConfig.defaultModel],
        defaultModel: openaiConfig.defaultModel,
        enabled: true,
        provider: 'openai'
      });

      const complexTool = {
        type: 'function',
        function: {
          name: 'search_database',
          description: 'Search database with filters',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              category: { 
                type: 'string', 
                enum: ['news', 'articles', 'reports'],
                description: 'Content category'
              },
              limit: { 
                type: 'integer', 
                minimum: 1, 
                maximum: 100,
                default: 10,
                description: 'Number of results to return'
              }
            },
            required: ['query']
          }
        }
      };

      const messages = [
        { role: 'system', content: 'You have access to weather data, calculator, and database search. Use appropriate tools for user requests.' },
        { role: 'user', content: 'Search for news about AI, get weather for London, and calculate 45 * 12' }
      ];

      const tools = [weatherTool, calculatorTool, complexTool];
      let toolCallsReceived = [];
      let responseContent = '';

      const result = await new Promise((resolve, reject) => {
        llmService.sendMessageStreamWithTools(
          messages,
          `${openaiConfig.key}_multi_tool_test`,
          tools,
          {
            onToken: (token) => {
              responseContent += token;
            },
            onToolCall: (toolCall) => {
              toolCallsReceived.push(toolCall);
              console.log('Complex scenario tool call:', toolCall);
            },
            onComplete: (response) => {
              resolve({ content: responseContent, toolCalls: toolCallsReceived });
            },
            onError: reject
          }
        );
      });

      expect(result).toBeDefined();
      console.log('Complex scenario results:', {
        contentLength: result.content.length,
        toolCallsCount: result.toolCalls.length
      });

      // 验证工具调用的多样性
      if (result.toolCalls.length > 0) {
        const toolNames = result.toolCalls.map(tc => tc.function.name);
        const uniqueTools = [...new Set(toolNames)];
        console.log('Unique tools called:', uniqueTools);
        
        result.toolCalls.forEach(toolCall => {
          expect(['get_weather', 'calculate', 'search_database']).toContain(toolCall.function.name);
          const args = JSON.parse(toolCall.function.arguments);
          expect(args).toBeDefined();
        });
      }

    }, 45000);

    it.skipIf(!runTests)(`跳过复杂工具场景测试 - 未设置OpenAI兼容API密钥`, () => {
      expect(true).toBe(true);
    });
  });
});
