import { ILLMService, Message, StreamHandlers, LLMResponse, ModelInfo, ModelOption, ToolDefinition, ToolCall } from './types';
import { ModelConfig } from '../model/types';
import { ModelManager } from '../model/manager';
import { APIError, RequestConfigError } from './errors';
import OpenAI from 'openai';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { isRunningInElectron } from '../../utils/environment';
import { ElectronLLMProxy } from './electron-proxy';

/**
 * LLM服务实现 - 基于官方SDK
 */
export class LLMService implements ILLMService {
  constructor(private modelManager: ModelManager) { }

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
    // API key允许为空字符串，某些服务（如Ollama）不需要API key
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
  private getOpenAIInstance(modelConfig: ModelConfig, _isStream: boolean = false): OpenAI {

    const apiKey = modelConfig.apiKey || '';

    // 处理baseURL，如果以'/chat/completions'结尾则去掉
    let processedBaseURL = modelConfig.baseURL;
    if (processedBaseURL?.endsWith('/chat/completions')) {
      processedBaseURL = processedBaseURL.slice(0, -'/chat/completions'.length);
    }

    // 创建OpenAI实例配置
    const defaultTimeout = _isStream ? 90000 : 60000;
    const timeout = modelConfig.llmParams?.timeout !== undefined
                    ? modelConfig.llmParams.timeout
                    : defaultTimeout;

    const config: any = {
      apiKey: apiKey,
      baseURL: processedBaseURL,
      timeout: timeout,
      maxRetries: _isStream ? 2 : 3
    };

    // In any browser-like environment, we must set this flag to true 
    // to bypass the SDK's environment check.
    if (typeof window !== 'undefined') {
      config.dangerouslyAllowBrowser = true;
      console.log('[LLM Service] Browser-like environment detected. Setting dangerouslyAllowBrowser=true.');
    }

    const instance = new OpenAI(config);

    return instance;
  }

  /**
   * 获取Gemini实例
   */
  private getGeminiModel(modelConfig: ModelConfig, systemInstruction?: string, _isStream: boolean = false): GenerativeModel {
    const apiKey = modelConfig.apiKey || '';

    // 创建GoogleGenerativeAI实例 - 旧版本直接传入字符串API key
    const genAI = new GoogleGenerativeAI(apiKey);

    // 创建模型配置
    const modelOptions: any = {
      model: modelConfig.defaultModel
    };

    // 如果有系统指令，添加到模型配置中
    if (systemInstruction) {
      modelOptions.systemInstruction = systemInstruction;
    }

    // 处理baseURL，如果以'/v1beta'结尾则去掉
    let processedBaseURL = modelConfig.baseURL;
    if (processedBaseURL?.endsWith('/v1beta')) {
      processedBaseURL = processedBaseURL.slice(0, -'/v1beta'.length);
    }
    return genAI.getGenerativeModel(modelOptions, { "baseUrl": processedBaseURL });
  }

  /**
   * 发送OpenAI消息（结构化格式）
   */
  private async sendOpenAIMessageStructured(messages: Message[], modelConfig: ModelConfig): Promise<LLMResponse> {
    const openai = this.getOpenAIInstance(modelConfig);

    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const {
      timeout, // Handled in getOpenAIInstance
      model: llmParamsModel, // Avoid overriding main model
      messages: llmParamsMessages, // Avoid overriding main messages
      ...restLlmParams
    } = modelConfig.llmParams || {};

    const completionConfig: any = {
      model: modelConfig.defaultModel,
      messages: formattedMessages,
      ...restLlmParams // Spread other params from llmParams
    };

    try {
      const response = await openai.chat.completions.create(completionConfig);

      // 处理响应中的 reasoning_content 和普通 content
      const choice = response.choices[0];
      if (!choice?.message) {
        throw new Error('未收到有效的响应');
      }

      let content = choice.message.content || '';
      let reasoning = '';

      // 处理推理内容（如果存在）
      // SiliconFlow 等提供商在 choice.message 中并列提供 reasoning_content 字段
      if ((choice.message as any).reasoning_content) {
        reasoning = (choice.message as any).reasoning_content;
      } else {
        // 检测并分离content中的think标签
        const thinkMatch = content.match(/<think>(.*?)<\/think>/s);
        if (thinkMatch) {
          reasoning = thinkMatch[1];
          content = content.replace(/<think>.*?<\/think>/s, '').trim();
        }
      }

      const result: LLMResponse = {
        content: content,
        reasoning: reasoning || undefined,
        metadata: {
          model: modelConfig.defaultModel,
          finishReason: choice.finish_reason || undefined
        }
      };

      return result;
    } catch (error) {
      console.error('OpenAI API调用失败:', error);
      throw new Error(`OpenAI API调用失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }



  /**
   * 发送Gemini消息（结构化格式）
   */
  private async sendGeminiMessageStructured(messages: Message[], modelConfig: ModelConfig): Promise<LLMResponse> {
    // 提取系统消息
    const systemMessages = messages.filter(msg => msg.role === 'system');
    const systemInstruction = systemMessages.length > 0
      ? systemMessages.map(msg => msg.content).join('\n')
      : '';

    // 获取带有系统指令的模型实例
    const model = this.getGeminiModel(modelConfig, systemInstruction, false);

    // 过滤出用户和助手消息
    const conversationMessages = messages.filter(msg => msg.role !== 'system');

    // 创建聊天会话
    const generationConfig = this.buildGeminiGenerationConfig(modelConfig.llmParams);

    const chatOptions: any = {
      history: this.formatGeminiHistory(conversationMessages)
    };
    if (Object.keys(generationConfig).length > 0) {
      chatOptions.generationConfig = generationConfig;
    }
    const chat = model.startChat(chatOptions);

    // 获取最后一条用户消息
    const lastUserMessage = conversationMessages.length > 0 &&
      conversationMessages[conversationMessages.length - 1].role === 'user'
      ? conversationMessages[conversationMessages.length - 1].content
      : '';

    // 如果没有用户消息，返回空响应
    if (!lastUserMessage) {
      return {
        content: '',
        metadata: {
          model: modelConfig.defaultModel
        }
      };
    }

    // 发送消息并获取响应
    const result = await chat.sendMessage(lastUserMessage);
    
    return {
      content: result.response.text(),
      metadata: {
        model: modelConfig.defaultModel
      }
    };
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
   * 发送消息（结构化格式）
   */
  async sendMessageStructured(messages: Message[], provider: string): Promise<LLMResponse> {
    try {
      if (!provider) {
        throw new RequestConfigError('模型提供商不能为空');
      }

      const modelConfig = await this.modelManager.getModel(provider);
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
        return this.sendGeminiMessageStructured(messages, modelConfig);
      } else {
        // OpenAI兼容格式的API，包括DeepSeek和自定义模型
        return this.sendOpenAIMessageStructured(messages, modelConfig);
      }
    } catch (error: any) {
      if (error instanceof RequestConfigError || error instanceof APIError) {
        throw error;
      }
      throw new APIError(`发送消息失败: ${error.message}`);
    }
  }

  /**
   * 发送消息（传统格式，只返回主要内容）
   */
  async sendMessage(messages: Message[], provider: string): Promise<string> {
    const response = await this.sendMessageStructured(messages, provider);
    
    // 只返回主要内容，不包含推理内容
    // 如果需要推理内容，请使用 sendMessageStructured 方法
    return response.content;
  }

  /**
   * 发送消息（流式，支持结构化和传统格式）
   */
  async sendMessageStream(
    messages: Message[],
    provider: string,
    callbacks: StreamHandlers
  ): Promise<void> {
    try {
      console.log('开始流式请求:', { provider, messagesCount: messages.length });
      this.validateMessages(messages);

      const modelConfig = await this.modelManager.getModel(provider);
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
   * 发送消息（流式，支持工具调用）
   * 🆕 支持工具调用的流式消息发送
   */
  async sendMessageStreamWithTools(
    messages: Message[],
    provider: string,
    tools: ToolDefinition[],
    callbacks: StreamHandlers
  ): Promise<void> {
    try {
      console.log('开始带工具的流式请求:', { 
        provider, 
        messagesCount: messages.length,
        toolsCount: tools.length 
      });
      
      this.validateMessages(messages);

      const modelConfig = await this.modelManager.getModel(provider);
      if (!modelConfig) {
        throw new RequestConfigError(`模型 ${provider} 不存在`);
      }

      this.validateModelConfig(modelConfig);

      console.log('获取到模型实例（带工具）:', {
        provider: modelConfig.provider,
        model: modelConfig.defaultModel,
        tools: tools.map(t => t.function.name)
      });

      if (modelConfig.provider === 'gemini') {
        // Gemini工具调用支持
        await this.streamGeminiMessageWithTools(messages, modelConfig, tools, callbacks);
      } else {
        // OpenAI兼容格式的API工具调用
        await this.streamOpenAIMessageWithTools(messages, modelConfig, tools, callbacks);
      }
    } catch (error) {
      console.error('带工具的流式请求失败:', error);
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 处理流式内容中的think标签(用于流式场景)
   */
  private processStreamContentWithThinkTags(
    content: string, 
    callbacks: StreamHandlers,
    thinkState: { isInThinkMode: boolean; buffer: string }
  ): void {
    // 如果没有推理回调，直接发送到主要内容流
    if (!callbacks.onReasoningToken) {
      callbacks.onToken(content);
      return;
    }

    // 将新内容添加到缓冲区
    thinkState.buffer += content;
    let remaining = thinkState.buffer;
    let processed = '';
    
    while (remaining.length > 0) {
      if (!thinkState.isInThinkMode) {
        // 不在think模式中，查找<think>标签
        const thinkStartIndex = remaining.indexOf('<think>');
        
        if (thinkStartIndex !== -1) {
          // 找到了开始标签
          // 发送开始标签前的内容到主要流
          if (thinkStartIndex > 0) {
            const beforeThink = remaining.slice(0, thinkStartIndex);
            callbacks.onToken(beforeThink);
            processed += beforeThink + '<think>';
          } else {
            processed += '<think>';
          }
          
          // 进入think模式
          thinkState.isInThinkMode = true;
          remaining = remaining.slice(thinkStartIndex + 7); // 7 = '<think>'.length
        } else {
          // 没有找到开始标签
          // 检查buffer末尾是否可能是不完整的标签开始
          if (remaining.endsWith('<') || remaining.endsWith('<t') || 
              remaining.endsWith('<th') || remaining.endsWith('<thi') || 
              remaining.endsWith('<thin') || remaining.endsWith('<think')) {
            // 可能是不完整的标签，保留在buffer中等待更多内容
            thinkState.buffer = remaining;
            return;
          } else {
            // 确定没有标签，发送所有内容到主要流
            callbacks.onToken(remaining);
            processed += remaining;
            remaining = '';
          }
        }
      } else {
        // 在think模式中，查找</think>标签
        const thinkEndIndex = remaining.indexOf('</think>');
        
        if (thinkEndIndex !== -1) {
          // 找到了结束标签
          // 发送结束标签前的内容到推理流
          if (thinkEndIndex > 0) {
            const thinkContent = remaining.slice(0, thinkEndIndex);
            callbacks.onReasoningToken(thinkContent);
          }
          
          // 退出think模式
          thinkState.isInThinkMode = false;
          processed += remaining.slice(0, thinkEndIndex) + '</think>';
          remaining = remaining.slice(thinkEndIndex + 8); // 8 = '</think>'.length
        } else {
          // 没有找到结束标签
          // 检查buffer末尾是否可能是不完整的结束标签
          if (remaining.endsWith('<') || remaining.endsWith('</') || 
              remaining.endsWith('</t') || remaining.endsWith('</th') || 
              remaining.endsWith('</thi') || remaining.endsWith('</thin') || 
              remaining.endsWith('</think')) {
            // 可能是不完整的结束标签，保留在buffer中等待更多内容
            thinkState.buffer = remaining;
            return;
          } else {
            // 确定是think内容，发送到推理流
            callbacks.onReasoningToken(remaining);
            processed += remaining;
            remaining = '';
          }
        }
      }
    }
    
    // 更新缓冲区为已处理的内容
    thinkState.buffer = '';
  }

  /**
   * 流式发送OpenAI消息
   */
  private async streamOpenAIMessage(
    messages: Message[],
    modelConfig: ModelConfig,
    callbacks: StreamHandlers
  ): Promise<void> {
    try {
      // 获取流式OpenAI实例
      const openai = this.getOpenAIInstance(modelConfig, true);

      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      console.log('开始创建流式请求...');
      const {
        timeout, // Handled in getOpenAIInstance
        model: llmParamsModel, // Avoid overriding main model
        messages: llmParamsMessages, // Avoid overriding main messages
        stream: llmParamsStream, // Avoid overriding main stream flag
        ...restLlmParams
      } = modelConfig.llmParams || {};

      const completionConfig: any = {
        model: modelConfig.defaultModel,
        messages: formattedMessages,
        stream: true, // Essential for streaming
        ...restLlmParams // User-defined parameters from llmParams
      };
      
      // 直接使用流式响应，无需类型转换
      const stream = await openai.chat.completions.create(completionConfig);

      console.log('成功获取到流式响应');

      // 使用类型断言来确保TypeScript知道这是流式响应
      let accumulatedReasoning = '';
      let accumulatedContent = '';
      
      // think标签状态跟踪
      const thinkState = { isInThinkMode: false, buffer: '' };

      for await (const chunk of stream as any) {
        // 处理推理内容（SiliconFlow 等提供商在 delta 中提供 reasoning_content）
        const reasoningContent = chunk.choices[0]?.delta?.reasoning_content || '';
        if (reasoningContent) {
          accumulatedReasoning += reasoningContent;

          // 如果有推理回调，发送推理内容
          if (callbacks.onReasoningToken) {
            callbacks.onReasoningToken(reasoningContent);
          }
        }

        // 处理主要内容
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          accumulatedContent += content;

          // 使用流式think标签处理
          this.processStreamContentWithThinkTags(content, callbacks, thinkState);
        }
      }

      console.log('流式响应完成');
      
      // 构建完整响应
      const response: LLMResponse = {
        content: accumulatedContent,
        reasoning: accumulatedReasoning || undefined,
        metadata: {
          model: modelConfig.defaultModel
        }
      };

      callbacks.onComplete(response);
    } catch (error) {
      console.error('流式处理过程中出错:', error);
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 流式发送OpenAI消息（支持工具调用）
   * 🆕 基于streamOpenAIMessage扩展工具调用支持
   */
  private async streamOpenAIMessageWithTools(
    messages: Message[],
    modelConfig: ModelConfig,
    tools: ToolDefinition[],
    callbacks: StreamHandlers
  ): Promise<void> {
    try {
      // 获取流式OpenAI实例
      const openai = this.getOpenAIInstance(modelConfig, true);

      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      console.log('开始创建带工具的流式请求...');
      const {
        timeout,
        model: llmParamsModel,
        messages: llmParamsMessages,
        stream: llmParamsStream,
        tools: llmParamsTools,
        ...restLlmParams
      } = modelConfig.llmParams || {};

      const completionConfig: any = {
        model: modelConfig.defaultModel,
        messages: formattedMessages,
        tools: tools,
        tool_choice: 'auto',
        stream: true,
        ...restLlmParams
      };
      
      const stream = await openai.chat.completions.create(completionConfig);
      console.log('成功获取到带工具的流式响应');

      let accumulatedReasoning = '';
      let accumulatedContent = '';
      const toolCalls: any[] = [];
      const thinkState = { isInThinkMode: false, buffer: '' };

      for await (const chunk of stream as any) {
        // 处理推理内容
        const reasoningContent = chunk.choices[0]?.delta?.reasoning_content || '';
        if (reasoningContent) {
          accumulatedReasoning += reasoningContent;
          if (callbacks.onReasoningToken) {
            callbacks.onReasoningToken(reasoningContent);
          }
        }

        // 🆕 处理工具调用
        const toolCallDeltas = chunk.choices[0]?.delta?.tool_calls;
        if (toolCallDeltas) {
          for (const toolCallDelta of toolCallDeltas) {
            if (toolCallDelta.index !== undefined) {
              while (toolCalls.length <= toolCallDelta.index) {
                toolCalls.push({ id: '', type: 'function' as const, function: { name: '', arguments: '' } });
              }

              const currentToolCall = toolCalls[toolCallDelta.index];

              if (toolCallDelta.id) currentToolCall.id = toolCallDelta.id;
              if (toolCallDelta.type) currentToolCall.type = toolCallDelta.type;
              if (toolCallDelta.function) {
                if (toolCallDelta.function.name) {
                  currentToolCall.function.name += toolCallDelta.function.name;
                }
                if (toolCallDelta.function.arguments) {
                  currentToolCall.function.arguments += toolCallDelta.function.arguments;
                }

                // 当工具调用完整时，通知回调
                if (currentToolCall.id && currentToolCall.function.name &&
                    toolCallDelta.function.arguments && callbacks.onToolCall) {
                  try {
                    JSON.parse(currentToolCall.function.arguments);
                    callbacks.onToolCall(currentToolCall);
                  } catch {
                    // JSON 还不完整
                  }
                }
              }
            }
          }
        }

        // 处理主要内容
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          accumulatedContent += content;
          this.processStreamContentWithThinkTags(content, callbacks, thinkState);
        }
      }

      console.log('带工具的流式响应完成, 工具调用数量:', toolCalls.length);
      
      const response: LLMResponse = {
        content: accumulatedContent,
        reasoning: accumulatedReasoning || undefined,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        metadata: { model: modelConfig.defaultModel }
      };

      callbacks.onComplete(response);
    } catch (error) {
      console.error('带工具的流式处理过程中出错:', error);
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
    const model = this.getGeminiModel(modelConfig, systemInstruction, true);

    // 过滤出用户和助手消息
    const conversationMessages = messages.filter(msg => msg.role !== 'system');

    // 创建聊天会话
    const generationConfig = this.buildGeminiGenerationConfig(modelConfig.llmParams);

    const chatOptions: any = {
      history: this.formatGeminiHistory(conversationMessages)
    };
    if (Object.keys(generationConfig).length > 0) {
      chatOptions.generationConfig = generationConfig;
    }
    const chat = model.startChat(chatOptions);

    // 获取最后一条用户消息
    const lastUserMessage = conversationMessages.length > 0 &&
      conversationMessages[conversationMessages.length - 1].role === 'user'
      ? conversationMessages[conversationMessages.length - 1].content
      : '';

    // 如果没有用户消息，发送空响应
    if (!lastUserMessage) {
      const response: LLMResponse = {
        content: '',
        metadata: {
          model: modelConfig.defaultModel
        }
      };
      
      callbacks.onComplete(response);
      return;
    }

    try {
      console.log('开始创建Gemini流式请求...');
      const result = await chat.sendMessageStream(lastUserMessage);

      console.log('成功获取到流式响应');
      
      let accumulatedContent = '';

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          accumulatedContent += text;
          callbacks.onToken(text);
        }
      }

      console.log('流式响应完成');
      
      // 构建完整响应
      const response: LLMResponse = {
        content: accumulatedContent,
        metadata: {
          model: modelConfig.defaultModel
        }
      };

      callbacks.onComplete(response);
    } catch (error) {
      console.error('流式处理过程中出错:', error);
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 流式发送Gemini消息（支持工具调用）
   * 🆕 基于streamGeminiMessage扩展工具调用支持
   */
  private async streamGeminiMessageWithTools(
    messages: Message[],
    modelConfig: ModelConfig,
    tools: ToolDefinition[],
    callbacks: StreamHandlers
  ): Promise<void> {
    // 提取系统消息
    const systemMessages = messages.filter(msg => msg.role === 'system');
    const systemInstruction = systemMessages.length > 0
      ? systemMessages.map(msg => msg.content).join('\n')
      : '';

    // 获取带有系统指令的模型实例
    const model = this.getGeminiModel(modelConfig, systemInstruction, true);

    // 过滤出用户和助手消息
    const conversationMessages = messages.filter(msg => msg.role !== 'system');

    // 转换工具定义为Gemini格式
    const geminiTools = this.convertToGeminiTools(tools);

    // 创建聊天会话
    const generationConfig = this.buildGeminiGenerationConfig(modelConfig.llmParams);

    const chatOptions: any = {
      history: this.formatGeminiHistory(conversationMessages),
      tools: geminiTools
    };
    if (Object.keys(generationConfig).length > 0) {
      chatOptions.generationConfig = generationConfig;
    }
    const chat = model.startChat(chatOptions);

    // 获取最后一条用户消息
    const lastUserMessage = conversationMessages.length > 0 &&
      conversationMessages[conversationMessages.length - 1].role === 'user'
      ? conversationMessages[conversationMessages.length - 1].content
      : '';

    // 如果没有用户消息，发送空响应
    if (!lastUserMessage) {
      const response: LLMResponse = {
        content: '',
        metadata: {
          model: modelConfig.defaultModel
        }
      };
      
      callbacks.onComplete(response);
      return;
    }

    try {
      console.log('开始创建Gemini带工具的流式请求...', {
        toolsCount: tools.length,
        geminiTools: geminiTools
      });
      const result = await chat.sendMessageStream(lastUserMessage);

      console.log('成功获取到Gemini带工具的流式响应');
      
      let accumulatedContent = '';
      const toolCalls: any[] = [];

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          accumulatedContent += text;
          callbacks.onToken(text);
        }

        // 处理工具调用
        const functionCalls = chunk.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
          for (const functionCall of functionCalls) {
            const toolCall: ToolCall = {
              id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'function' as const,
              function: {
                name: functionCall.name,
                arguments: JSON.stringify(functionCall.args)
              }
            };

            toolCalls.push(toolCall);

            console.log('[Gemini] Tool call received:', toolCall);
            if (callbacks.onToolCall) {
              callbacks.onToolCall(toolCall);
            }
          }
        }
      }

      console.log('Gemini带工具的流式响应完成, 工具调用数量:', toolCalls.length);
      
      // 构建完整响应
      const response: LLMResponse = {
        content: accumulatedContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        metadata: {
          model: modelConfig.defaultModel
        }
      };

      callbacks.onComplete(response);
    } catch (error) {
      console.error('Gemini带工具的流式处理过程中出错:', error);
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 转换工具定义为Gemini格式
   */
  private convertToGeminiTools(tools: ToolDefinition[]): any[] {
    return [{
      functionDeclarations: tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters
      }))
    }];
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

  /**
   * 获取模型列表，以下拉选项格式返回
   * @param provider 提供商标识
   * @param customConfig 自定义配置（可选）
   */
  async fetchModelList(
    provider: string,
    customConfig?: Partial<ModelConfig>
  ): Promise<ModelOption[]> {
    try {
      // 获取基础配置
      let modelConfig = await this.modelManager.getModel(provider);

      // 如果提供了自定义配置，则合并到基础配置
      if (customConfig) {
        modelConfig = {
          ...modelConfig,
          ...(customConfig as ModelConfig),
        };
      }

      if (!modelConfig) {
        console.warn(`模型 ${provider} 不存在，使用自定义配置`);
        if (!customConfig) {
          throw new RequestConfigError(`模型 ${provider} 不存在`);
        }
        modelConfig = customConfig as ModelConfig;
      }

      // 验证必要的配置（仅验证API URL）
      if (!modelConfig.baseURL) {
        throw new RequestConfigError('API URL不能为空');
      }
      // API key允许为空字符串，某些服务（如Ollama）不需要API key

      let models: ModelInfo[] = [];

      // 根据不同提供商实现不同的获取模型列表逻辑
      console.log(`获取 ${modelConfig.name || provider} 的模型列表`);

      if (provider === 'gemini' || modelConfig.provider === 'gemini') {
        models = await this.fetchGeminiModelsInfo(modelConfig);
      } else if (provider === 'anthropic' || modelConfig.provider === 'anthropic') {
        models = await this.fetchAnthropicModelsInfo(modelConfig);
      } else if (provider === 'deepseek' || modelConfig.provider === 'deepseek') {
        models = await this.fetchDeepSeekModelsInfo(modelConfig);
      } else {
        // OpenAI兼容格式的API，包括自定义模型和Ollama
        models = await this.fetchOpenAICompatibleModelsInfo(modelConfig);
      }

      // 转换为选项格式
      return models.map(model => ({
        value: model.id,
        label: model.name
      }));
    } catch (error: any) {
      console.error('获取模型列表失败:', error);
      if (error instanceof RequestConfigError || error instanceof APIError) {
        throw error;
      }
      throw new APIError(`获取模型列表失败: ${error.message}`);
    }
  }

  /**
   * 获取OpenAI兼容API的模型信息
   */
  private async fetchOpenAICompatibleModelsInfo(modelConfig: ModelConfig): Promise<ModelInfo[]> {
    // 先检查baseURL是否以/v1结尾
    if (modelConfig.baseURL && !/\/v1$/.test(modelConfig.baseURL)) {
      throw new APIError(`MISSING_V1_SUFFIX: baseURL should end with "/v1" for OpenAI-compatible APIs. Current: ${modelConfig.baseURL}`);
    }

    const openai = this.getOpenAIInstance(modelConfig);

    try {
      const response = await openai.models.list();
      console.log('API返回的原始模型列表:', response);

      // 检查返回格式
      if (response && response.data && Array.isArray(response.data)) {
        const models = response.data
          .map(model => ({
            id: model.id,
            name: model.id
          }))
          .sort((a, b) => a.id.localeCompare(b.id));

        if (models.length === 0) {
          throw new APIError('EMPTY_MODEL_LIST: API returned empty model list');
        }

        return models;
      }

      // 返回格式不对，抛出标准化错误信息
      throw new APIError(`INVALID_RESPONSE_FORMAT: ${JSON.stringify(response)}`);

    } catch (error: any) {
      console.error('Failed to fetch model list:', error);

      // Core层只负责技术判断，抛出标准化的英文错误信息
      if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('Connection error'))) {
        // 检查是否是真正的跨域错误
        // 跨域错误的特征：不同origin + 没有明显的DNS/连接错误
        const errorString = error.toString();
        let isCrossOriginError = false;

        if (modelConfig.baseURL && typeof window !== 'undefined') {
          try {
            const apiUrl = new URL(modelConfig.baseURL);
            const currentUrl = new URL(window.location.href);



            // 只有在不同origin且没有明显的DNS/连接错误时才认为是跨域
            const isDifferentOrigin = apiUrl.origin !== currentUrl.origin;
            const hasNetworkError = errorString.includes('ERR_NAME_NOT_RESOLVED') ||
                                   errorString.includes('ERR_CONNECTION_REFUSED') ||
                                   errorString.includes('ERR_NETWORK_CHANGED') ||
                                   errorString.includes('ERR_INTERNET_DISCONNECTED') ||
                                   errorString.includes('ERR_EMPTY_RESPONSE');

            isCrossOriginError = isDifferentOrigin && !hasNetworkError;
          } catch (urlError) {
            // URL解析失败，当作普通连接错误处理
          }
        }

        // 根据检测结果抛出相应错误
        if (isCrossOriginError) {
          throw new APIError(`CROSS_ORIGIN_CONNECTION_FAILED: ${error.message}`);
        } else {
          throw new APIError(`CONNECTION_FAILED: ${error.message}`);
        }
      }

      // API返回的错误信息
      if (error.response?.data) {
        throw new APIError(`API_ERROR: ${JSON.stringify(error.response.data)}`);
      }

      // 其他错误，保持原始信息
      throw new APIError(`UNKNOWN_ERROR: ${error.message || 'Unknown error'}`);
    }
  }
  /**
   * 获取Gemini模型信息
   */
  private async fetchGeminiModelsInfo(modelConfig: ModelConfig): Promise<ModelInfo[]> {
    console.log(`获取${modelConfig.name || 'Gemini'}的模型列表`);

    // Gemini API没有直接获取模型列表的接口，返回预定义列表
    return [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' }
    ];
  }

  /**
   * 获取Anthropic模型信息
   */
  private async fetchAnthropicModelsInfo(modelConfig: ModelConfig): Promise<ModelInfo[]> {
    console.log(`获取${modelConfig.name || 'Anthropic'}的模型列表`);

    // Anthropic API的获取模型列表功能未兼容openai格式，所以这里返回一个默认列表
    return [
      { id: 'claude-opus-4-20250514', name: 'Claude 4.0 Opus' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude 4.0 Sonnet' },
      { id: 'claude-3-7-sonnet-latest', name: 'Claude 3.7 Sonnet' },
      { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku' }
    ];
  }

  /**
   * 获取DeepSeek模型信息
   */
  private async fetchDeepSeekModelsInfo(modelConfig: ModelConfig): Promise<ModelInfo[]> {
    console.log(`获取${modelConfig.name || 'DeepSeek'}的模型列表`);

    try {
      // 尝试使用OpenAI兼容API获取模型列表
      return await this.fetchOpenAICompatibleModelsInfo(modelConfig);
    } catch (error) {
      console.error('获取DeepSeek模型列表失败，使用默认列表:', error);

      // 返回默认模型
      return [
        { id: 'deepseek-chat', name: 'DeepSeek Chat' },
        { id: 'deepseek-coder', name: 'DeepSeek Coder' }
      ];
    }
  }

  /**
   * 构建Gemini生成配置
   * 
   * 注意：此方法假设传入的 llmParams 已经通过 ModelManager.validateConfig() 
   * 中的 validateLLMParams 验证，确保安全性
   */
  private buildGeminiGenerationConfig(llmParams: Record<string, any> = {}): any {
    const {
      temperature,
      maxOutputTokens,
      topP,
      topK,
      candidateCount,
      stopSequences,
      ...otherParams
    } = llmParams;

    const generationConfig: any = {};
    
    // 添加已知参数
    if (temperature !== undefined) {
      generationConfig.temperature = temperature;
    }
    if (maxOutputTokens !== undefined) {
      generationConfig.maxOutputTokens = maxOutputTokens;
    }
    if (topP !== undefined) {
      generationConfig.topP = topP;
    }
    if (topK !== undefined) {
      generationConfig.topK = topK;
    }
    if (candidateCount !== undefined) {
      generationConfig.candidateCount = candidateCount;
    }
    if (stopSequences !== undefined && Array.isArray(stopSequences)) {
      generationConfig.stopSequences = stopSequences;
    }

    // 添加其他参数 (已在上层验证过安全性)
    // 排除一些明显不属于 Gemini generationConfig 的参数
    for (const [key, value] of Object.entries(otherParams)) {
      if (!['timeout', 'model', 'messages', 'stream'].includes(key)) {
        generationConfig[key] = value;
      }
    }

    return generationConfig;
  }
}

/**
 * 创建LLM服务实例的工厂函数
 * @param modelManager 模型管理器实例
 * @returns LLM服务实例
 */
export function createLLMService(modelManager: ModelManager): ILLMService {
  // 在Electron环境中，返回代理实例
  if (isRunningInElectron()) {
    console.log('[LLM Service Factory] Electron environment detected, using proxy.');
    return new ElectronLLMProxy();
  }
  return new LLMService(modelManager);
} 
