import { LLMService } from '../../../../src/services/llm';
import { expect, describe, it, beforeEach } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
beforeAll(() => {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
});

describe('自定义模型测试', () => {
  let llmService;

  beforeEach(() => {
    localStorage.clear();
    llmService = new LLMService();
  });

  it('应该能正确加载和使用自定义模型', () => {
    const customConfig = {
      name: 'Custom Model',
      baseUrl: 'https://api.custom.com/v1/chat/completions',
      models: ['custom-model'],
      defaultModel: 'custom-model'
    };

    llmService.addCustomModel('custom', customConfig);
    const model = llmService.getModel('custom');

    expect(model).toBeDefined();
    expect(model.name).toBe(customConfig.name);
    expect(model.baseUrl).toBe(customConfig.baseUrl);
    expect(model.models).toEqual(customConfig.models);
    expect(model.defaultModel).toBe(customConfig.defaultModel);
  });

  it('应该能正确处理自定义模型的配置更新', () => {
    const initialConfig = {
      name: 'Custom Model',
      baseUrl: 'https://api.custom.com/v1/chat/completions',
      models: ['custom-model'],
      defaultModel: 'custom-model'
    };

    llmService.addCustomModel('custom', initialConfig);

    const updatedConfig = {
      name: 'Updated Model',
      baseUrl: 'https://api.updated.com/v1/chat/completions',
      models: ['updated-model'],
      defaultModel: 'updated-model'
    };

    llmService.updateModelConfig('custom', updatedConfig);
    const model = llmService.getModel('custom');

    expect(model.name).toBe(updatedConfig.name);
    expect(model.baseUrl).toBe(updatedConfig.baseUrl);
    expect(model.models).toEqual(updatedConfig.models);
    expect(model.defaultModel).toBe(updatedConfig.defaultModel);
  });

  it('应该能正确处理自定义模型的删除', () => {
    const customConfig = {
      name: 'Custom Model',
      baseUrl: 'https://api.custom.com/v1/chat/completions',
      models: ['custom-model'],
      defaultModel: 'custom-model'
    };

    llmService.addCustomModel('custom', customConfig);
    expect(llmService.getModel('custom')).toBeDefined();

    llmService.deleteModel('custom');
    expect(llmService.getModel('custom')).toBeUndefined();
  });
}); 