import { LLMService } from '../../../../src/services/llm';
import { expect, describe, it, beforeEach, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
beforeAll(() => {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
});

describe('DeepSeek API 测试', () => {
  let llmService;
  const provider = 'deepseek';

  beforeEach(() => {
    localStorage.clear();
    llmService = new LLMService();
  });

  it('应该能正确调用 DeepSeek API', async () => {
    const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.log('跳过测试：未设置 VITE_DEEPSEEK_API_KEY 环境变量');
      return;
    }
    
    // 更新 DeepSeek 配置
    llmService.updateModelConfig(provider, {
      apiKey
    });

    const messages = [
      { role: 'user', content: '你好，请用中文回复我' }
    ];

    const response = await llmService.sendMessage(messages, provider);
    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);
  });

  it('应该能正确处理多轮对话', async () => {
    const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.log('跳过测试：未设置 VITE_DEEPSEEK_API_KEY 环境变量');
      return;
    }
    
    // 更新 DeepSeek 配置
    llmService.updateModelConfig(provider, {
      apiKey
    });

    const messages = [
      { role: 'user', content: '你好，请用中文回复我' },
      { role: 'assistant', content: '你好！我是 AI 助手，很高兴为你服务。' },
      { role: 'user', content: '请问你是谁？' }
    ];

    const response = await llmService.sendMessage(messages, provider);
    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);
  });
}); 