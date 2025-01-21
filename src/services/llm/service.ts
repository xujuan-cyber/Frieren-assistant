import { ILLMService, Message, MessageRole, RequestConfig } from './types';
import { ModelConfig } from '../model/types';
import { APIError, RequestConfigError } from './errors';
import { ModelManager } from '../model/manager';

/**
 * LLM服务实现
 */
export class LLMService implements ILLMService {
  constructor(private modelManager: ModelManager) {}

  /**
   * 发送消息
   */
  async sendMessage(messages: Message[], provider: string): Promise<string> {
    const model = this.modelManager.getModel(provider);
    if (!model) {
      throw new RequestConfigError(`模型 ${provider} 不存在`);
    }
    const config = this.buildRequestConfig(model, messages);
    return this.sendRequest(config);
  }

  /**
   * 优化提示词
   */
  async optimizePrompt(prompt: string, type: string, provider: string): Promise<string> {
    const messages: Message[] = [
      { role: 'system' as MessageRole, content: `你是一个专业的提示词优化助手。请根据用户的原始提示词，生成一个更${type}的版本。` },
      { role: 'user' as MessageRole, content: prompt }
    ];
    return this.sendMessage(messages, provider);
  }

  /**
   * 迭代优化提示词
   */
  async iteratePrompt(originalPrompt: string, iterateInput: string, provider: string): Promise<string> {
    const messages: Message[] = [
      { role: 'system' as MessageRole, content: '你是一个专业的提示词优化助手。请根据用户的反馈，迭代优化提示词。' },
      { role: 'user' as MessageRole, content: `原始提示词: ${originalPrompt}\n优化建议: ${iterateInput}` }
    ];
    return this.sendMessage(messages, provider);
  }

  /**
   * 发送请求到LLM服务
   */
  async sendRequest(config: RequestConfig): Promise<string> {
    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(config.body)
      });

      if (!response.ok) {
        throw new APIError(
          '请求失败',
          response.status,
          response.statusText
        );
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(`请求失败: ${error.message}`);
    }
  }

  /**
   * 构建请求配置
   */
  buildRequestConfig(modelConfig: ModelConfig, messages: Message[]): RequestConfig {
    if (!modelConfig.enabled) {
      throw new RequestConfigError(`模型未启用`);
    }

    if (!messages || messages.length === 0) {
      throw new RequestConfigError('消息列表不能为空');
    }

    // 验证消息格式
    for (const msg of messages) {
      if (!['system', 'user', 'assistant'].includes(msg.role)) {
        throw new RequestConfigError('无效的消息格式');
      }
    }

    return {
      url: modelConfig.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${modelConfig.apiKey}`
      },
      body: {
        model: modelConfig.defaultModel,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      }
    };
  }
}

// 导出工厂函数
export function createLLMService(modelManager: ModelManager): LLMService {
  return new LLMService(modelManager);
} 