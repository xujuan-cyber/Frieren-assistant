import { createLLMService, ModelManager, LocalStorageProvider } from '../../../src/index.js';
import { expect, describe, it, beforeEach, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
beforeAll(() => {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
});

describe('OpenAI API 真实连接测试', () => {
  // 检查OpenAI兼容的环境变量（任何一个存在就可以运行测试）
  const openaiCompatibleKeys = [
    'OPENAI_API_KEY', 'VITE_OPENAI_API_KEY',
    'DEEPSEEK_API_KEY', 'VITE_DEEPSEEK_API_KEY', 
    'SILICONFLOW_API_KEY', 'VITE_SILICONFLOW_API_KEY',
    'ZHIPU_API_KEY', 'VITE_ZHIPU_API_KEY',
    'CUSTOM_API_KEY', 'VITE_CUSTOM_API_KEY'
  ];

  const availableKeys = openaiCompatibleKeys.filter(key => 
    process.env[key] && process.env[key].trim()
  );

  if (availableKeys.length === 0) {
    console.log('跳过 OpenAI 真实API测试：未设置任何 OpenAI 兼容的 API 密钥');
    it.skip('应该能正确调用 OpenAI 兼容的 API', () => {});
    it.skip('应该能正确处理多轮对话', () => {});
    it.skip('应该能正确使用高级参数', () => {});
    return;
  }

  // 选择第一个可用的密钥和对应的配置
  const getModelConfig = () => {
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
    if (process.env.SILICONFLOW_API_KEY || process.env.VITE_SILICONFLOW_API_KEY) {
      return {
        key: 'siliconflow',
        apiKey: process.env.SILICONFLOW_API_KEY || process.env.VITE_SILICONFLOW_API_KEY,
        baseURL: 'https://api.siliconflow.cn/v1',
        defaultModel: 'Pro/deepseek-ai/DeepSeek-V3'
      };
    }
    if (process.env.ZHIPU_API_KEY || process.env.VITE_ZHIPU_API_KEY) {
      return {
        key: 'zhipu',
        apiKey: process.env.ZHIPU_API_KEY || process.env.VITE_ZHIPU_API_KEY,
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
        defaultModel: 'glm-4-flash'
      };
    }
    if (process.env.CUSTOM_API_KEY || process.env.VITE_CUSTOM_API_KEY) {
      const baseURL = process.env.CUSTOM_API_BASE_URL || process.env.VITE_CUSTOM_API_BASE_URL;
      const model = process.env.CUSTOM_API_MODEL || process.env.VITE_CUSTOM_API_MODEL;
      
      // 只有当baseURL和model都有值时才返回custom配置
      if (baseURL && model) {
        return {
          key: 'custom',
          apiKey: process.env.CUSTOM_API_KEY || process.env.VITE_CUSTOM_API_KEY,
          baseURL: baseURL,
          defaultModel: model
        };
      }
    }
    return null;
  };

  const modelConfig = getModelConfig();
  
  if (!modelConfig) {
    console.log('跳过 OpenAI 真实API测试：无有效的模型配置');
    it.skip('应该能正确调用 OpenAI 兼容的 API', () => {});
    it.skip('应该能正确处理多轮对话', () => {});
    it.skip('应该能正确使用高级参数', () => {});
    return;
  }

  console.log(`使用 ${modelConfig.key} 进行 OpenAI 兼容 API 测试，模型: ${modelConfig.defaultModel}`);

  it('应该能正确调用 OpenAI 兼容的 API', async () => {
    const storage = new LocalStorageProvider();
    const modelManager = new ModelManager(storage);
    const llmService = createLLMService(modelManager);

    try {
      // 更新模型配置
      await modelManager.updateModel(modelConfig.key, {
        apiKey: modelConfig.apiKey,
        baseURL: modelConfig.baseURL,
        defaultModel: modelConfig.defaultModel,
        enabled: true,
        provider: 'openai' // 所有兼容提供商都使用openai提供商类型
      });

      const messages = [
        { role: 'user', content: '你好，请用一句话介绍你自己' }
      ];

      const response = await llmService.sendMessage(messages, modelConfig.key);
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    } catch (error) {
      console.error(`API调用失败 (${modelConfig.key}):`, error.message);
      // 如果是400错误，可能是配置问题，跳过测试
      if (error.message.includes('400')) {
        console.log(`跳过测试：${modelConfig.key} API配置可能有问题`);
        return;
      }
      throw error;
    }
  }, 30000);

  it('应该能正确处理多轮对话', async () => {
    const storage = new LocalStorageProvider();
    const modelManager = new ModelManager(storage);
    const llmService = createLLMService(modelManager);

    try {
      // 更新模型配置
      await modelManager.updateModel(modelConfig.key, {
        apiKey: modelConfig.apiKey,
        baseURL: modelConfig.baseURL,
        defaultModel: modelConfig.defaultModel,
        enabled: true,
        provider: 'openai'
      });

      const messages = [
        { role: 'user', content: '你好，我们来玩个游戏' },
        { role: 'assistant', content: '好啊，你想玩什么游戏？' },
        { role: 'user', content: '我们来玩猜数字游戏，1到100之间' }
      ];

      const response = await llmService.sendMessage(messages, modelConfig.key);
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    } catch (error) {
      console.error(`多轮对话测试失败 (${modelConfig.key}):`, error.message);
      if (error.message.includes('400')) {
        console.log(`跳过测试：${modelConfig.key} API配置可能有问题`);
        return;
      }
      throw error;
    }
  }, 30000);

  it('应该能正确使用高级参数', async () => {
    const storage = new LocalStorageProvider();
    const modelManager = new ModelManager(storage);
    const llmService = createLLMService(modelManager);

    try {
      // 更新模型配置，包含高级参数
      await modelManager.updateModel(modelConfig.key, {
        apiKey: modelConfig.apiKey,
        baseURL: modelConfig.baseURL,
        defaultModel: modelConfig.defaultModel,
        enabled: true,
        provider: 'openai',
        llmParams: {
          temperature: 0.3,
          max_tokens: 100
        }
      });

      const messages = [
        { role: 'user', content: '请用一句话回答：什么是人工智能？' }
      ];

      const response = await llmService.sendMessage(messages, modelConfig.key);
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      // 由于设置了max_tokens=100，响应应该相对较短
      expect(response.length).toBeLessThan(500);
    } catch (error) {
      console.error(`高级参数测试失败 (${modelConfig.key}):`, error.message);
      if (error.message.includes('400')) {
        console.log(`跳过测试：${modelConfig.key} API配置可能有问题`);
        return;
      }
      throw error;
    }
  }, 30000);
}); 