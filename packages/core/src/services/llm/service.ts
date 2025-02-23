import { ILLMService, Message, StreamHandlers } from './types';
import { ModelConfig } from '../model/types';
import { ModelManager, modelManager as defaultModelManager } from '../model/manager';
import { APIError, RequestConfigError, ERROR_MESSAGES } from './errors';
import OpenAI from 'openai';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

/**
 * LLM服务实现 - 基于官方SDK
 */
export class LLMService implements ILLMService {
  private openAIInstances: Map<string, OpenAI> = new Map();

  constructor(private modelManager: ModelManager) {}

  /**
   * 验证消息格式
   */
  private validateMessages(messages: Message[]): void {
    if (!Array.isArray(messages)) {
      throw new RequestConfigError('消息必须是数组格式');
    }
    if (messages.length === 0) {
      throw new RequestConfigError('消息列表不能为空');
    }
    messages.forEach(msg => {
      if (!msg.role || !msg.content) {
        throw new RequestConfigError('消息格式无效: 缺少必要字段');
      }
      if (!['system', 'user', 'assistant'].includes(msg.role)) {
        throw new RequestConfigError(`不支持的消息类型: ${msg.role}`);
      }
      if (typeof msg.content !== 'string') {
        throw new RequestConfigError('消息内容必须是字符串');
      }
    });
  }

  /**
   * 验证模型配置
   */
  private validateModelConfig(modelConfig: ModelConfig): void {
    if (!modelConfig) {
      throw new RequestConfigError('模型配置不能为空');
    }
    if (!modelConfig.provider) {
      throw new RequestConfigError('模型提供商不能为空');
    }
    if (!modelConfig.apiKey) {
      throw new RequestConfigError(ERROR_MESSAGES.API_KEY_REQUIRED);
    }
    if (!modelConfig.defaultModel) {
      throw new RequestConfigError('默认模型不能为空');
    }
    if (!modelConfig.enabled) {
      throw new RequestConfigError('模型未启用');
    }
  }

  /**
   * 获取OpenAI实例
   */
  private getOpenAIInstance(modelConfig: ModelConfig): OpenAI {
    const cacheKey = `${modelConfig.provider}-${modelConfig.defaultModel}`;
    
    if (this.openAIInstances.has(cacheKey)) {
      return this.openAIInstances.get(cacheKey)!;
    }

    const apiKey = modelConfig.apiKey || '';
    
    const instance = new OpenAI({
      apiKey: apiKey,
      baseURL: modelConfig.baseURL,
      dangerouslyAllowBrowser: true
    });
    
    this.openAIInstances.set(cacheKey, instance);
    return instance;
  }

  /**
   * 获取Gemini实例
   */
  private getGeminiModel(modelConfig: ModelConfig, systemInstruction?: string): GenerativeModel {
    const apiKey = modelConfig.apiKey || '';
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 创建模型配置
    const modelOptions: any = {
      model: modelConfig.defaultModel,
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
      }
    };
    
    // 如果有系统指令，添加到模型配置中
    if (systemInstruction) {
      modelOptions.systemInstruction = systemInstruction;
    }
    
    return genAI.getGenerativeModel(modelOptions);
  }

  /**
   * 发送OpenAI消息
   */
  private async sendOpenAIMessage(messages: Message[], modelConfig: ModelConfig): Promise<string> {
    const openai = this.getOpenAIInstance(modelConfig);
    
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const response = await openai.chat.completions.create({
      model: modelConfig.defaultModel,
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 2000
    });

    return response.choices[0].message.content || '';
  }

  /**
   * 发送Gemini消息
   */
  private async sendGeminiMessage(messages: Message[], modelConfig: ModelConfig): Promise<string> {
    // 提取系统消息
    const systemMessages = messages.filter(msg => msg.role === 'system');
    const systemInstruction = systemMessages.length > 0 
      ? systemMessages.map(msg => msg.content).join('\n') 
      : '';
    
    // 获取带有系统指令的模型实例
    const model = this.getGeminiModel(modelConfig, systemInstruction);
    
    // 过滤出用户和助手消息
    const conversationMessages = messages.filter(msg => msg.role !== 'system');
    
    // 创建聊天会话
    const chat = model.startChat({
      history: this.formatGeminiHistory(conversationMessages)
    });
    
    // 获取最后一条用户消息
    const lastUserMessage = conversationMessages.length > 0 && 
                           conversationMessages[conversationMessages.length - 1].role === 'user' 
                           ? conversationMessages[conversationMessages.length - 1].content 
                           : '';
    
    // 如果没有用户消息，返回空字符串
    if (!lastUserMessage) {
      return '';
    }
    
    // 发送消息并获取响应
    const result = await chat.sendMessage(lastUserMessage);
    return result.response.text();
  }
  
  /**
   * 格式化Gemini历史消息
   */
  private formatGeminiHistory(messages: Message[]): any[] {
    if (messages.length <= 1) {
      return [];
    }
    
    // 排除最后一条消息（将由sendMessage单独发送）
    const historyMessages = messages.slice(0, -1);
    const formattedHistory = [];
    
    for (let i = 0; i < historyMessages.length; i++) {
      const msg = historyMessages[i];
      if (msg.role === 'user') {
        formattedHistory.push({
          role: 'user',
          parts: [{ text: msg.content }]
        });
      } else if (msg.role === 'assistant') {
        formattedHistory.push({
          role: 'model',
          parts: [{ text: msg.content }]
        });
      }
    }
    
    return formattedHistory;
  }

  /**
   * 发送消息
   */
  async sendMessage(messages: Message[], provider: string): Promise<string> {
    try {
      if (!provider) {
        throw new RequestConfigError('模型提供商不能为空');
      }

      const modelConfig = this.modelManager.getModel(provider);
      if (!modelConfig) {
        throw new RequestConfigError(`模型 ${provider} 不存在`);
      }

      this.validateModelConfig(modelConfig);
      this.validateMessages(messages);

      console.log('发送消息:', { 
        provider: modelConfig.provider,
        model: modelConfig.defaultModel,
        messagesCount: messages.length
      });

      if (modelConfig.provider === 'gemini') {
        return this.sendGeminiMessage(messages, modelConfig);
      } else {
        // OpenAI兼容格式的API，包括DeepSeek和自定义模型
        return this.sendOpenAIMessage(messages, modelConfig);
      }
    } catch (error: any) {
      if (error instanceof RequestConfigError || error instanceof APIError) {
        throw error;
      }
      throw new APIError(`发送消息失败: ${error.message}`);
    }
  }

  /**
   * 发送消息（流式）
   */
  async sendMessageStream(
    messages: Message[],
    provider: string,
    callbacks: StreamHandlers
  ): Promise<void> {
    try {
      console.log('开始流式请求:', { provider, messagesCount: messages.length });
      this.validateMessages(messages);
      
      const modelConfig = this.modelManager.getModel(provider);
      if (!modelConfig) {
        throw new RequestConfigError(`模型 ${provider} 不存在`);
      }

      this.validateModelConfig(modelConfig);

      console.log('获取到模型实例:', { 
        provider: modelConfig.provider,
        model: modelConfig.defaultModel 
      });
      
      if (modelConfig.provider === 'gemini') {
        await this.streamGeminiMessage(messages, modelConfig, callbacks);
      } else {
        // OpenAI兼容格式的API，包括DeepSeek和自定义模型
        await this.streamOpenAIMessage(messages, modelConfig, callbacks);
      }
    } catch (error) {
      console.error('流式请求失败:', error);
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 流式发送OpenAI消息
   */
  private async streamOpenAIMessage(
    messages: Message[],
    modelConfig: ModelConfig,
    callbacks: StreamHandlers
  ): Promise<void> {
    const openai = this.getOpenAIInstance(modelConfig);
    
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    try {
      const stream = await openai.chat.completions.create({
        model: modelConfig.defaultModel,
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true
      });

      console.log('成功获取到流式响应');
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          console.log('收到数据块:', { 
            contentLength: content.length,
            content: content.substring(0, 50) + (content.length > 50 ? '...' : '')
          });
          
          await callbacks.onToken(content);
          // 添加小延迟，让UI有时间更新
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      console.log('流式响应完成');
      callbacks.onComplete();
    } catch (error) {
      console.error('流式处理过程中出错:', error);
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 流式发送Gemini消息
   */
  private async streamGeminiMessage(
    messages: Message[],
    modelConfig: ModelConfig,
    callbacks: StreamHandlers
  ): Promise<void> {
    // 提取系统消息
    const systemMessages = messages.filter(msg => msg.role === 'system');
    const systemInstruction = systemMessages.length > 0 
      ? systemMessages.map(msg => msg.content).join('\n') 
      : '';
    
    // 获取带有系统指令的模型实例
    const model = this.getGeminiModel(modelConfig, systemInstruction);
    
    // 过滤出用户和助手消息
    const conversationMessages = messages.filter(msg => msg.role !== 'system');
    
    // 创建聊天会话
    const chat = model.startChat({
      history: this.formatGeminiHistory(conversationMessages)
    });
    
    // 获取最后一条用户消息
    const lastUserMessage = conversationMessages.length > 0 && 
                           conversationMessages[conversationMessages.length - 1].role === 'user' 
                           ? conversationMessages[conversationMessages.length - 1].content 
                           : '';
    
    // 如果没有用户消息，返回空字符串
    if (!lastUserMessage) {
      callbacks.onComplete();
      return;
    }
    
    try {
      const result = await chat.sendMessageStream(lastUserMessage);
      
      console.log('成功获取到流式响应');
      
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          console.log('收到数据块:', { 
            contentLength: text.length,
            content: text.substring(0, 50) + (text.length > 50 ? '...' : '')
          });
          
          await callbacks.onToken(text);
          // 添加小延迟，让UI有时间更新
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      console.log('流式响应完成');
      callbacks.onComplete();
    } catch (error) {
      console.error('流式处理过程中出错:', error);
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 测试连接
   */
  async testConnection(provider: string): Promise<void> {
    try {
      if (!provider) {
        throw new RequestConfigError('模型提供商不能为空');
      }
      console.log('测试连接provider:', { 
        provider: provider,
      });
      
      // 发送一个简单的测试消息
      const testMessages: Message[] = [
        {
          role: 'user',
          content: '请回答ok'
        }
      ];

      // 使用 sendMessage 进行测试
      await this.sendMessage(testMessages, provider);

    } catch (error: any) {
      if (error instanceof RequestConfigError || error instanceof APIError) {
        throw error;
      }
      throw new APIError(`连接测试失败: ${error.message}`);
    }
  }
}

// 导出工厂函数
export function createLLMService(modelManager: ModelManager = defaultModelManager): LLMService {
  return new LLMService(modelManager);
} 
