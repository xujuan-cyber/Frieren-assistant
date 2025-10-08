import { GoogleGenAI } from '@google/genai'
import { AbstractTextProviderAdapter } from './abstract-adapter'
import type {
  TextProvider,
  TextModel,
  TextModelConfig,
  Message,
  LLMResponse,
  StreamHandlers,
  ParameterDefinition,
  ToolDefinition,
  ToolCall
} from '../types'

// 定义新版 SDK 需要的类型（SDK 可能通过主导出提供）
type Content = any
type GenerateContentConfig = any
type FunctionDeclaration = any
type Tool = any
type FunctionCall = any

/**
 * Google Gemini适配器实现
 * 使用新版 @google/genai SDK (统一的 Google Gen AI SDK)
 *
 * 职责：
 * - 封装 @google/genai SDK 调用逻辑
 * - 处理系统消息（systemInstruction）
 * - 格式化历史消息（Content格式）
 * - 支持动态模型列表获取（models.list API）
 * - 支持工具调用（Function Calling）
 * - 支持思考功能（Thinking with thinkingConfig）
 * - 处理baseURL规范化（setDefaultBaseUrls）
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
      supportsDynamicModels: true, // 新版 SDK 支持动态模型获取
      connectionSchema: {
        required: ['apiKey'],
        optional: ['baseURL'],
        fieldTypes: {
          apiKey: 'string',
          baseURL: 'string'
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
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'Latest experimental Gemini 2.5 Flash model',
        providerId,
        capabilities: {
          supportsTools: true,
          supportsReasoning: false,
          maxContextLength: 1000000
        },
        parameterDefinitions: this.getParameterDefinitions('gemini-2.5-flash'),
        defaultParameterValues: this.getDefaultParameterValues('gemini-2.5-flash')
      }
    ]
  }

  /**
   * 动态获取模型列表（使用新版 SDK 的 models.list API）
   */
  public async getModelsAsync(config: TextModelConfig): Promise<TextModel[]> {
    try {
      const apiKey = config.connectionConfig.apiKey || ''

      const customBaseURL = config.connectionConfig.baseURL
      const genAI = new GoogleGenAI(
        customBaseURL
          ? {
              apiKey,
              httpOptions: {
                baseUrl: customBaseURL
              }
            }
          : { apiKey }
      )

      console.log('[GeminiAdapter] Fetching models from API...')

      const modelsPager = await genAI.models.list({
        config: {
          pageSize: 100 // 获取更多模型
        }
      })

      const dynamicModels: TextModel[] = []
      const providerId = 'gemini'

      for await (const model of modelsPager) {
        // 只包含支持 generateContent 的模型
        // 注意：新版 SDK 的 Model 类型可能不包含 supportedGenerationMethods，我们暂时包含所有模型
        dynamicModels.push({
          id: model.name?.replace('models/', '') || model.name || '', // 移除 'models/' 前缀
          name: model.displayName || model.name || '',
          description: model.description || '',
          providerId,
          capabilities: {
            supportsTools: true,
            supportsReasoning: false,
            maxContextLength: model.inputTokenLimit || 1000000
          },
          parameterDefinitions: this.getParameterDefinitions(model.name || ''),
          defaultParameterValues: this.getDefaultParameterValues(model.name || '')
        })
      }

      console.log(`[GeminiAdapter] Found ${dynamicModels.length} models supporting generateContent`)

      // 如果动态获取失败，返回静态列表
      return dynamicModels.length > 0 ? dynamicModels : this.getModels()
    } catch (error) {
      console.error('[GeminiAdapter] Failed to fetch models dynamically, falling back to static list:', error)
      return this.getModels()
    }
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
      },
      {
        name: 'thinkingBudget',
        type: 'number',
        description: 'Thinking budget in tokens (Gemini 2.5+)',
        min: 1,
        max: 8192
      },
      {
        name: 'includeThoughts',
        type: 'boolean',
        description: 'Include thinking process in response (Gemini 2.5+)'
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

  // ===== SDK实例创建和配置构建 =====

  /**
   * 创建 GoogleGenAI 实例
   *
   * @param config 模型配置
   * @returns GoogleGenAI实例
   */
  private createClient(config: TextModelConfig): GoogleGenAI {
    const apiKey = config.connectionConfig.apiKey || ''

    const customBaseURL = config.connectionConfig.baseURL

    return new GoogleGenAI(
      customBaseURL
        ? {
            apiKey,
            httpOptions: {
              baseUrl: customBaseURL
            }
          }
        : { apiKey }
    )
  }

  /**
   * 构建 GenerateContentConfig 配置
   * 从旧版的 buildGeminiGenerationConfig 迁移并适配新版 API
   *
   * @param params 参数对象
   * @param systemInstruction 系统指令（可选）
   * @returns GenerateContentConfig
   */
  private buildGenerationConfig(
    params: Record<string, any> = {},
    systemInstruction?: string
  ): GenerateContentConfig {
    const {
      temperature,
      maxOutputTokens,
      topP,
      topK,
      candidateCount,
      stopSequences,
      thinkingBudget,      // 思考预算（token数）
      includeThoughts,      // 是否包含思考过程
      ...otherParams
    } = params

    const config: GenerateContentConfig = {}

    // 添加系统指令
    if (systemInstruction) {
      config.systemInstruction = systemInstruction
    }

    // 添加已知参数
    if (temperature !== undefined) {
      config.temperature = temperature
    }
    if (maxOutputTokens !== undefined) {
      config.maxOutputTokens = maxOutputTokens
    }
    if (topP !== undefined) {
      config.topP = topP
    }
    if (topK !== undefined) {
      config.topK = topK
    }
    if (candidateCount !== undefined) {
      config.candidateCount = candidateCount
    }
    if (stopSequences !== undefined && Array.isArray(stopSequences)) {
      config.stopSequences = stopSequences
    }

    // 添加思考配置（Gemini 2.5+ 支持）
    if (thinkingBudget !== undefined || includeThoughts !== undefined) {
      ;(config as any).thinkingConfig = {}

      if (thinkingBudget !== undefined) {
        ;(config as any).thinkingConfig.thinkingBudget = thinkingBudget
      }

      if (includeThoughts !== undefined) {
        ;(config as any).thinkingConfig.includeThoughts = includeThoughts
      }
    }

    // 添加其他参数（排除明显不属于 generationConfig 的参数）
    for (const [key, value] of Object.entries(otherParams)) {
      if (!['timeout', 'model', 'messages', 'stream'].includes(key)) {
        ;(config as any)[key] = value
      }
    }

    return config
  }

  /**
   * 转换工具定义为 Gemini 格式
   * 将标准的 ToolDefinition 转换为 Gemini SDK 所需的 Tool 格式
   *
   * @param tools 工具定义数组
   * @returns Gemini 格式的工具数组
   */
  private convertToolsToGemini(tools: ToolDefinition[]): Tool[] {
    if (!tools || tools.length === 0) {
      return []
    }

    const functionDeclarations: FunctionDeclaration[] = tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters
    }))

    return [{ functionDeclarations }]
  }

  /**
   * 转换 Gemini 的 FunctionCall 为标准的 ToolCall 格式
   *
   * @param functionCalls Gemini 返回的函数调用数组
   * @returns 标准格式的工具调用数组
   */
  private convertGeminiFunctionCallsToToolCalls(functionCalls: FunctionCall[]): ToolCall[] {
    if (!functionCalls || functionCalls.length === 0) {
      return []
    }

    return functionCalls.map((fc) => ({
      id: fc.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'function' as const,
      function: {
        name: fc.name || '',
        arguments: JSON.stringify(fc.args || {})
      }
    }))
  }

  /**
   * 格式化消息为新版 SDK 的 Content 格式
   * 新版 SDK 使用标准的 Content[] 格式，不再需要区分 history 和 last message
   *
   * @param messages 消息数组
   * @returns Content[] 格式的消息
   */
  private formatMessages(messages: Message[]): Content[] {
    const formattedContents: Content[] = []

    for (const msg of messages) {
      if (msg.role === 'user') {
        formattedContents.push({
          role: 'user',
          parts: [{ text: msg.content }]
        })
      } else if (msg.role === 'assistant') {
        formattedContents.push({
          role: 'model', // Gemini 使用 'model' 而非 'assistant'
          parts: [{ text: msg.content }]
        })
      }
      // 跳过 system 消息，它们会在 systemInstruction 中处理
    }

    return formattedContents
  }

  // ===== 核心方法实现 =====

  /**
   * 发送消息（结构化格式）
   * 使用新版 SDK 的 models.generateContent API
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

    // 过滤出用户和助手消息
    const conversationMessages = messages.filter((msg) => msg.role !== 'system')

    // 如果没有对话消息，返回空响应
    if (conversationMessages.length === 0) {
      return {
        content: '',
        metadata: {
          model: config.modelMeta.id
        }
      }
    }

    try {
      const client = this.createClient(config)

      // 构建配置（包含系统指令）
      const generationConfig = this.buildGenerationConfig(
        config.paramOverrides || {},
        systemInstruction
      )

      // 格式化消息
      const contents = this.formatMessages(conversationMessages)

      console.log('[GeminiAdapter] Sending request to models.generateContent...')

      // 调用新版 API
      const response = await client.models.generateContent({
        model: config.modelMeta.id,
        contents,
        config: generationConfig
      })

      // 提取思考内容（如果启用了 thinkingConfig）
      let reasoning: string | undefined
      if (response.candidates?.[0]?.content?.parts) {
        const reasoningParts: string[] = []
        for (const part of response.candidates[0].content.parts) {
          // Gemini 2.5+ 在 part.thought 中标记思考过程，文本位于 part.text
          if ((part as any).thought) {
            const rawThought = (part as any).text ?? (part as any).thought
            if (rawThought !== undefined) {
              const normalized = typeof rawThought === 'string'
                ? rawThought
                : JSON.stringify(rawThought)
              reasoningParts.push(normalized)
            }
          }
        }

        if (reasoningParts.length > 0) {
          reasoning = reasoningParts.join('')
        }
      }

      return {
        content: response.text || '',
        reasoning,
        metadata: {
          model: config.modelMeta.id,
          finishReason: response.candidates?.[0]?.finishReason
        }
      }
    } catch (error) {
      console.error('[GeminiAdapter] API call failed:', error)
      throw error // 保留原始错误堆栈
    }
  }

  /**
   * 发送流式消息
   * 使用新版 SDK 的 models.generateContentStream API
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

    // 过滤出用户和助手消息
    const conversationMessages = messages.filter((msg) => msg.role !== 'system')

    // 如果没有对话消息，发送空响应
    if (conversationMessages.length === 0) {
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
      const client = this.createClient(config)

      // 构建配置（包含系统指令）
      const generationConfig = this.buildGenerationConfig(
        config.paramOverrides || {},
        systemInstruction
      )

      // 格式化消息
      const contents = this.formatMessages(conversationMessages)

      console.log('[GeminiAdapter] Creating stream request...')

      // 调用新版流式 API
      const responseStream = await client.models.generateContentStream({
        model: config.modelMeta.id,
        contents,
        config: generationConfig
      })

      console.log('[GeminiAdapter] Stream response received')

      let accumulatedContent = ''
      let accumulatedReasoning = ''

      // 遍历流式响应
      for await (const chunk of responseStream) {
        const text = chunk.text
        if (text) {
          accumulatedContent += text
          callbacks.onToken(text)
        }

        // 提取思考内容（流式）
        if (chunk.candidates?.[0]?.content?.parts) {
          for (const part of chunk.candidates[0].content.parts) {
            if ((part as any).thought) {
              const rawThought = (part as any).text ?? (part as any).thought
              if (rawThought !== undefined) {
                const thoughtStr = typeof rawThought === 'string'
                  ? rawThought
                  : JSON.stringify(rawThought)

                accumulatedReasoning += thoughtStr

                // 如果有思考内容的回调，触发它
                if (callbacks.onReasoningToken) {
                  callbacks.onReasoningToken(thoughtStr)
                }
              }
            }
          }
        }
      }

      console.log('[GeminiAdapter] Stream completed')

      // 构建完整响应
      const response: LLMResponse = {
        content: accumulatedContent,
        reasoning: accumulatedReasoning || undefined,
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

  /**
   * 发送带工具调用的流式消息
   * 使用新版 SDK 的工具调用功能
   *
   * @param messages 消息数组
   * @param config 模型配置
   * @param tools 工具定义数组
   * @param callbacks 流式响应回调
   * @throws SDK原始错误（保留完整堆栈）
   */
  protected async doSendMessageStreamWithTools(
    messages: Message[],
    config: TextModelConfig,
    tools: ToolDefinition[],
    callbacks: StreamHandlers
  ): Promise<void> {
    console.log('[GeminiAdapter] Sending stream request with tools, count:', tools.length)

    // 提取系统消息
    const systemMessages = messages.filter((msg) => msg.role === 'system')
    const systemInstruction =
      systemMessages.length > 0 ? systemMessages.map((msg) => msg.content).join('\n') : ''

    // 过滤出用户和助手消息
    const conversationMessages = messages.filter((msg) => msg.role !== 'system')

    if (conversationMessages.length === 0) {
      const response: LLMResponse = {
        content: '',
        metadata: { model: config.modelMeta.id }
      }
      callbacks.onComplete(response)
      return
    }

    try {
      const client = this.createClient(config)

      // 构建配置（包含系统指令和工具）
      const generationConfig = this.buildGenerationConfig(
        config.paramOverrides || {},
        systemInstruction
      )

      // 添加工具配置
      const geminiTools = this.convertToolsToGemini(tools)
      if (geminiTools.length > 0) {
        ;(generationConfig as any).tools = geminiTools
      }

      // 格式化消息
      const contents = this.formatMessages(conversationMessages)

      console.log('[GeminiAdapter] Creating stream request with tools...')

      // 调用新版流式 API
      const responseStream = await client.models.generateContentStream({
        model: config.modelMeta.id,
        contents,
        config: generationConfig
      })

      console.log('[GeminiAdapter] Stream response with tools received')

      let accumulatedContent = ''
      let accumulatedReasoning = ''
      const toolCalls: ToolCall[] = []

      // 遍历流式响应
      for await (const chunk of responseStream) {
        const text = chunk.text
        if (text) {
          accumulatedContent += text
          callbacks.onToken(text)
        }

        // 检查是否有函数调用
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          const convertedCalls = this.convertGeminiFunctionCallsToToolCalls(chunk.functionCalls)
          toolCalls.push(...convertedCalls)

          // 通知每个工具调用
          if (callbacks.onToolCall) {
            convertedCalls.forEach((toolCall) => callbacks.onToolCall!(toolCall))
          }
        }

        if (chunk.candidates?.[0]?.content?.parts) {
          for (const part of chunk.candidates[0].content.parts) {
            if ((part as any).thought) {
              const rawThought = (part as any).text ?? (part as any).thought
              if (rawThought !== undefined) {
                const thoughtStr = typeof rawThought === 'string'
                  ? rawThought
                  : JSON.stringify(rawThought)

                accumulatedReasoning += thoughtStr

                if (callbacks.onReasoningToken) {
                  callbacks.onReasoningToken(thoughtStr)
                }
              }
            }
          }
        }
      }

      console.log('[GeminiAdapter] Stream with tools completed, tool calls:', toolCalls.length)

      // 构建完整响应
      const response: LLMResponse = {
        content: accumulatedContent,
        reasoning: accumulatedReasoning || undefined,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        metadata: {
          model: config.modelMeta.id
        }
      }

      callbacks.onComplete(response)
    } catch (error) {
      console.error('[GeminiAdapter] Stream with tools error:', error)
      callbacks.onError(error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }
}
