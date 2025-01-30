import { createLLMService } from '../../../../src/services/llm/service';
import { ModelManager } from '../../../../src/services/model/manager';
import { expect, describe, it, beforeEach, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
beforeAll(() => {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
});

describe('自定义模型测试', () => {
  let llmService;
  let modelManager;

  beforeEach(() => {
    localStorage.clear();
    modelManager = new ModelManager();
    llmService = createLLMService(modelManager);
  });

  it('应该能正确加载和使用自定义模型', () => {
    const customConfig = {
      name: 'Custom Model',
      baseURL: 'https://api.custom.com/v1/chat/completions',
      models: ['custom-model'],
      defaultModel: 'custom-model',
      apiKey: 'test-api-key',
      enabled: true,
      provider: 'openai'
    };

    modelManager.addModel('custom', customConfig);
    const model = modelManager.getModel('custom');

    expect(model).toBeDefined();
    expect(model.name).toBe(customConfig.name);
    expect(model.baseURL).toBe(customConfig.baseURL);
    expect(model.models).toEqual(customConfig.models);
    expect(model.defaultModel).toBe(customConfig.defaultModel);
    expect(model.enabled).toBe(true);
  });

  it('应该能正确处理自定义模型的配置更新', () => {
    const initialConfig = {
      name: 'Custom Model',
      baseURL: 'https://api.custom.com/v1/chat/completions',
      models: ['custom-model'],
      defaultModel: 'custom-model',
      apiKey: 'test-api-key',
      enabled: true,
      provider: 'openai'
    };

    modelManager.addModel('custom', initialConfig);

    const updatedConfig = {
      name: 'Updated Custom Model',
      baseURL: 'https://api.updated.com/v1/chat/completions'
    };

    modelManager.updateModel('custom', updatedConfig);
    const model = modelManager.getModel('custom');

    expect(model.name).toBe(updatedConfig.name);
    expect(model.baseURL).toBe(updatedConfig.baseURL);
    expect(model.models).toEqual(initialConfig.models);
    expect(model.defaultModel).toBe(initialConfig.defaultModel);
    expect(model.enabled).toBe(true);
  });

  it('应该能正确处理自定义模型的删除', () => {
    const customConfig = {
      name: 'Custom Model',
      baseURL: 'https://api.custom.com/v1/chat/completions',
      models: ['custom-model'],
      defaultModel: 'custom-model',
      apiKey: 'test-api-key',
      enabled: true,
      provider: 'openai'
    };

    modelManager.addModel('custom', customConfig);
    expect(modelManager.getModel('custom')).toBeDefined();

    modelManager.deleteModel('custom');
    expect(modelManager.getModel('custom')).toBeUndefined();
  });

  it('应该能正确调用自定义模型的 API', async () => {
    const apiKey = import.meta.env.VITE_CUSTOM_API_KEY;
    if (!apiKey) {
      console.log('跳过测试：未设置 VITE_CUSTOM_API_KEY 环境变量');
      return;
    }

    const customConfig = {
      name: 'Custom Model',
      baseURL: 'https://api.custom.com/v1/chat/completions',
      models: ['custom-model'],
      defaultModel: 'custom-model',
      apiKey,
      enabled: true,
      provider: 'openai'
    };

    modelManager.addModel('custom', customConfig);
    const messages = [
      { role: 'user', content: '你好，我们来玩个游戏' }
    ];

    const response = await llmService.sendMessage(messages, 'custom');
    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);
  });

  it('应该能正确处理自定义模型的多轮对话', async () => {
    const apiKey = import.meta.env.VITE_CUSTOM_API_KEY;
    if (!apiKey) {
      console.log('跳过测试：未设置 VITE_CUSTOM_API_KEY 环境变量');
      return;
    }

    const customConfig = {
      name: 'Custom Model',
      baseURL: 'https://api.custom.com/v1/chat/completions',
      models: ['custom-model'],
      defaultModel: 'custom-model',
      apiKey,
      enabled: true,
      provider: 'openai'
    };

    modelManager.addModel('custom', customConfig);
    const messages = [
      { role: 'user', content: '你好，我们来玩个游戏' },
      { role: 'assistant', content: '好的，你想玩什么游戏？' },
      { role: 'user', content: '我们来玩猜数字游戏，1到100之间' }
    ];

    const response = await llmService.sendMessage(messages, 'custom');
    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);
  });
}); 