import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai'
import { AbstractTextProviderAdapter } from './abstract-adapter'
import type {
  TextProvider,
  TextModel,
  TextModelConfig,
  Message,
  LLMResponse,
  StreamHandlers,
  ParameterDefinition
} from '../types'

/**
 * Google Gemini适配器实现
 * 使用Google Generative AI SDK
 *
 * 职责：
 * - 封装Google Generative AI SDK调用逻辑
 * - 处理系统消息（systemInstruction）
 * - 格式化历史消息（user→user, assistant→model）
 * - 处理baseURL规范化（移除'/v1beta'后缀）
 * - 保留SDK原始错误堆栈
 */
export class GeminiAdapter extends AbstractTextProviderAdapter {
  // ===== Provider元数据 =====

  /**
   * 获取Provider元数据
   */
  public getProvider(): TextProvider {
    return {
      id: 'gemini',
      name: 'Google Gemini',
      description: 'Google Generative AI models',
      requiresApiKey: true,
      defaultBaseURL: 'https://generativelanguage.googleapis.com',
      supportsDynamicModels: false, // Gemini不支持动态模型获取
      connectionSchema: {
        required: ['apiKey'],
        optional: ['baseURL', 'timeout'],
        fieldTypes: {
          apiKey: 'string',
          baseURL: 'string',
          timeout: 'number'
        }
      }
    }
  }

  /**
   * 获取静态模型列表（Gemini 2.0系列）
   * 从service.ts的fetchGeminiModelsInfo参考 (L1099-1106)
   */
  public getModels(): TextModel[] {
    const providerId = 'gemini'

    return [
      {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash (Experimental)',
        description: 'Latest experimental Gemini 2.0 Flash model',
        providerId,
        capabilities: {
          supportsStreaming: true,
          supportsTools: true,
          supportsReasoning: false,
          maxContextLength: 1000000
        },
        parameterDefinitions: this.getParameterDefinitions('gemini-2.0-flash-exp'),
        defaultParameterValues: this.getDefaultParameterValues('gemini-2.0-flash-exp')
      },
      {
        id: 'gemini-2.0-flash-thinking-exp-1219',
        name: 'Gemini 2.0 Flash Thinking',
        description: 'Gemini 2.0 Flash with extended thinking capabilities',
        providerId,
        capabilities: {
          supportsStreaming: true,
          supportsTools: true,
          supportsReasoning: true,
          maxContextLength: 32000
        },
        parameterDefinitions: this.getParameterDefinitions('gemini-2.0-flash-thinking-exp-1219'),
        defaultParameterValues: this.getDefaultParameterValues('gemini-2.0-flash-thinking-exp-1219')
      },
      {
        id: 'gemini-exp-1206',
        name: 'Gemini Experimental 1206',
        description: 'Experimental Gemini model (December 6th)',
        providerId,
        capabilities: {
          supportsStreaming: true,
          supportsTools: true,
          supportsReasoning: false,
          maxContextLength: 200000
        },
        parameterDefinitions: this.getParameterDefinitions('gemini-exp-1206'),
        defaultParameterValues: this.getDefaultParameterValues('gemini-exp-1206')
      }
    ]
  }

  /**
   * 动态获取模型列表（Gemini不支持，返回静态列表）
   */
  public async getModelsAsync(_config: TextModelConfig): Promise<TextModel[]> {
    console.log('[GeminiAdapter] Gemini does not support dynamic model fetching, returning static list')
    return this.getModels()
  }

  // ===== 参数定义（用于buildDefaultModel） =====

  /**
   * 获取参数定义
   */
  protected getParameterDefinitions(_modelId: string): readonly ParameterDefinition[] {
    return [
      {
        name: 'temperature',
        type: 'number',
        description: 'Sampling temperature (0-2)',
        default: 1,
        min: 0,
        max: 2
      },
      {
        name: 'topP',
        type: 'number',
        description: 'Nucleus sampling parameter',
        default: 0.95,
        min: 0,
        max: 1
      },
      {
        name: 'topK',
        type: 'number',
        description: 'Top-k sampling parameter',
        min: 1
      },
      {
        name: 'maxOutputTokens',
        type: 'number',
        description: 'Maximum tokens to generate',
        default: 8192,
        min: 1
      },
      {
        name: 'candidateCount',
        type: 'number',
        description: 'Number of response candidates',
        default: 1,
        min: 1
      },
      {
        name: 'stopSequences',
        type: 'array',
        description: 'Stop sequences for generation'
      }
    ]
  }

  /**
   * 获取默认参数值
   */
  protected getDefaultParameterValues(_modelId: string): Record<string, unknown> {
    return {
      temperature: 1,
      topP: 0.95,
      maxOutputTokens: 8192,
      candidateCount: 1
    }
  }

  // ===== SDK实例创建（从service.ts迁移） =====

  /**
   * 创建Gemini模型实例
   * 从service.ts的getGeminiModel迁移 (L99-121)
   *
   * @param config 模型配置
   * @param systemInstruction 系统指令（可选）
   * @param isStream 是否为流式请求
   * @returns GenerativeModel实例
   */
  private createGeminiModel(
    config: TextModelConfig,
    systemInstruction?: string,
    _isStream: boolean = false
  ): GenerativeModel {
    const apiKey = config.connectionConfig.apiKey || ''

    // 创建GoogleGenerativeAI实例
    const genAI = new GoogleGenerativeAI(apiKey)

    // 创建模型配置
    const modelOptions: any = {
      model: config.modelMeta.id
    }

    // 如果有系统指令，添加到模型配置中
    if (systemInstruction) {
      modelOptions.systemInstruction = systemInstruction
    }

    // 处理baseURL，如果以'/v1beta'结尾则去掉
    let processedBaseURL = config.connectionConfig.baseURL || this.getProvider().defaultBaseURL
    if (processedBaseURL?.endsWith('/v1beta')) {
      processedBaseURL = processedBaseURL.slice(0, -'/v1beta'.length)
    }

    return genAI.getGenerativeModel(modelOptions, { baseUrl: processedBaseURL })
  }

  /**
   * 构建Gemini generation配置
   * 从service.ts的buildGeminiGenerationConfig迁移 (L1149-1191)
   *
   * @param params 参数对象
   * @returns Gemini generation配置
   */
  private buildGeminiGenerationConfig(params: Record<string, any> = {}): any {
    const {
      temperature,
      maxOutputTokens,
      topP,
      topK,
      candidateCount,
      stopSequences,
      ...otherParams
    } = params

    const generationConfig: any = {}

    // 添加已知参数
    if (temperature !== undefined) {
      generationConfig.temperature = temperature
    }
    if (maxOutputTokens !== undefined) {
      generationConfig.maxOutputTokens = maxOutputTokens
    }
    if (topP !== undefined) {
      generationConfig.topP = topP
    }
    if (topK !== undefined) {
      generationConfig.topK = topK
    }
    if (candidateCount !== undefined) {
      generationConfig.candidateCount = candidateCount
    }
    if (stopSequences !== undefined && Array.isArray(stopSequences)) {
      generationConfig.stopSequences = stopSequences
    }

    // 添加其他参数（排除明显不属于generationConfig的参数）
    for (const [key, value] of Object.entries(otherParams)) {
      if (!['timeout', 'model', 'messages', 'stream'].includes(key)) {
        generationConfig[key] = value
      }
    }

    return generationConfig
  }

  /**
   * 格式化Gemini历史消息
   * 从service.ts的formatGeminiHistory迁移 (L249-274)
   *
   * @param messages 消息数组
   * @returns Gemini格式的历史消息
   */
  private formatGeminiHistory(messages: Message[]): any[] {
    if (messages.length <= 1) {
      return []
    }

    // 排除最后一条消息（将由sendMessage单独发送）
    const historyMessages = messages.slice(0, -1)
    const formattedHistory = []

    for (let i = 0; i < historyMessages.length; i++) {
      const msg = historyMessages[i]
      if (msg.role === 'user') {
        formattedHistory.push({
          role: 'user',
          parts: [{ text: msg.content }]
        })
      } else if (msg.role === 'assistant') {
        formattedHistory.push({
          role: 'model', // Gemini使用'model'而非'assistant'
          parts: [{ text: msg.content }]
        })
      }
    }

    return formattedHistory
  }

  // ===== 核心方法实现 =====

  /**
   * 发送消息（结构化格式）
   * 从service.ts的sendGeminiMessageStructured迁移 (L193-241)
   *
   * @param messages 消息数组
   * @param config 模型配置
   * @returns LLM响应
   * @throws SDK原始错误（保留完整堆栈）
   */
  protected async doSendMessage(messages: Message[], config: TextModelConfig): Promise<LLMResponse> {
    // 提取系统消息
    const systemMessages = messages.filter((msg) => msg.role === 'system')
    const systemInstruction =
      systemMessages.length > 0 ? systemMessages.map((msg) => msg.content).join('\n') : ''

    // 获取带有系统指令的模型实例
    const model = this.createGeminiModel(config, systemInstruction, false)

    // 过滤出用户和助手消息
    const conversationMessages = messages.filter((msg) => msg.role !== 'system')

    // 创建聊天会话
    const generationConfig = this.buildGeminiGenerationConfig(config.paramOverrides || {})

    const chatOptions: any = {
      history: this.formatGeminiHistory(conversationMessages)
    }
    if (Object.keys(generationConfig).length > 0) {
      chatOptions.generationConfig = generationConfig
    }
    const chat = model.startChat(chatOptions)

    // 获取最后一条用户消息
    const lastUserMessage =
      conversationMessages.length > 0 &&
      conversationMessages[conversationMessages.length - 1].role === 'user'
        ? conversationMessages[conversationMessages.length - 1].content
        : ''

    // 如果没有用户消息，返回空响应
    if (!lastUserMessage) {
      return {
        content: '',
        metadata: {
          model: config.modelMeta.id
        }
      }
    }

    try {
      // 发送消息并获取响应
      const result = await chat.sendMessage(lastUserMessage)

      return {
        content: result.response.text(),
        metadata: {
          model: config.modelMeta.id
        }
      }
    } catch (error) {
      console.error('[GeminiAdapter] API call failed:', error)
      throw error // 保留原始错误堆栈
    }
  }

  /**
   * 发送流式消息
   * 从service.ts的streamGeminiMessage迁移 (L707-785)
   *
   * @param messages 消息数组
   * @param config 模型配置
   * @param callbacks 流式响应回调
   * @throws SDK原始错误（保留完整堆栈）
   */
  protected async doSendMessageStream(
    messages: Message[],
    config: TextModelConfig,
    callbacks: StreamHandlers
  ): Promise<void> {
    // 提取系统消息
    const systemMessages = messages.filter((msg) => msg.role === 'system')
    const systemInstruction =
      systemMessages.length > 0 ? systemMessages.map((msg) => msg.content).join('\n') : ''

    // 获取带有系统指令的模型实例
    const model = this.createGeminiModel(config, systemInstruction, true)

    // 过滤出用户和助手消息
    const conversationMessages = messages.filter((msg) => msg.role !== 'system')

    // 创建聊天会话
    const generationConfig = this.buildGeminiGenerationConfig(config.paramOverrides || {})

    const chatOptions: any = {
      history: this.formatGeminiHistory(conversationMessages)
    }
    if (Object.keys(generationConfig).length > 0) {
      chatOptions.generationConfig = generationConfig
    }
    const chat = model.startChat(chatOptions)

    // 获取最后一条用户消息
    const lastUserMessage =
      conversationMessages.length > 0 &&
      conversationMessages[conversationMessages.length - 1].role === 'user'
        ? conversationMessages[conversationMessages.length - 1].content
        : ''

    // 如果没有用户消息，发送空响应
    if (!lastUserMessage) {
      const response: LLMResponse = {
        content: '',
        metadata: {
          model: config.modelMeta.id
        }
      }

      callbacks.onComplete(response)
      return
    }

    try {
      console.log('[GeminiAdapter] Creating stream request...')
      const result = await chat.sendMessageStream(lastUserMessage)

      console.log('[GeminiAdapter] Stream response received')

      let accumulatedContent = ''

      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) {
          accumulatedContent += text
          callbacks.onToken(text)
        }
      }

      console.log('[GeminiAdapter] Stream completed')

      // 构建完整响应
      const response: LLMResponse = {
        content: accumulatedContent,
        metadata: {
          model: config.modelMeta.id
        }
      }

      callbacks.onComplete(response)
    } catch (error) {
      console.error('[GeminiAdapter] Stream error:', error)
      callbacks.onError(error instanceof Error ? error : new Error(String(error)))
      throw error // 保留原始错误堆栈
    }
  }
}
