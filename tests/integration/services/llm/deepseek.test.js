import { LLMService } from '../../../../src/services/llm';
import { expect, describe, it, beforeEach } from 'vitest';

describe('DeepSeek API 测试', () => {
  let llmService;

  beforeEach(() => {
    localStorage.clear();
    llmService = new LLMService();
  });

  it('应该能正确调用 DeepSeek API', async () => {
    const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.log('跳过测试：未配置 DeepSeek API 密钥');
      return;
    }

    llmService.setApiKey('deepseek', apiKey);
    llmService.setProvider('deepseek');

    try {
      const response = await llmService.sendMessage([
        { role: 'user', content: '你好，这是一个测试消息。请用中文回复。' }
      ]);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    } catch (error) {
      if (error.message.includes('ECONNRESET') || error.message.includes('ETIMEDOUT')) {
        console.log('跳过测试：网络连接问题');
        return;
      }
      throw error;
    }
  }, 30000);

  it('应该能正确处理多轮对话', async () => {
    const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.log('跳过测试：未配置 DeepSeek API 密钥');
      return;
    }

    llmService.setApiKey('deepseek', apiKey);
    llmService.setProvider('deepseek');

    try {
      const messages = [
        { role: 'user', content: '你好，我们来玩个游戏。' },
        { role: 'assistant', content: '好的，你想玩什么游戏？' },
        { role: 'user', content: '我们来玩数字游戏，你说一个 1-10 的数字。' }
      ];

      const response = await llmService.sendMessage(messages);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    } catch (error) {
      if (error.message.includes('ECONNRESET') || error.message.includes('ETIMEDOUT')) {
        console.log('跳过测试：网络连接问题');
        return;
      }
      throw error;
    }
  }, 30000);
}); 