import { AbstractTextProviderAdapter } from './abstract-adapter'
import type {
  TextProvider,
  TextModel,
  TextModelConfig,
  Message,
  LLMResponse,
  StreamHandlers,
  ParameterDefinition,
  ToolDefinition
} from '../types'

const ANTHROPIC_API_VERSION = '2023-06-01'
const DEFAULT_MAX_TOKENS = 1024

interface AnthropicContentBlock {
  type: string
  text?: string
}

interface AnthropicResponse {
  content: AnthropicContentBlock[]
  model: string
  stop_reason?: string | null
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
}

/**
 * Anthropic API适配器实现
 * 支持Claude系列模型，基于HTTP调用实现
 *
 * 职责：
 * - 封装Anthropic HTTP API调用逻辑（非官方SDK）
 * - 处理Claude特定的消息格式和system指令
 * - 提供Claude模型静态列表
 * - 保留原始错误堆栈
 *
 * 注意：Anthropic不支持官方SDK在本项目中直接使用，因此采用fetch实现。
 */
export class AnthropicAdapter extends AbstractTextProviderAdapter {
  // ===== Provider元数据 =====

  /**
   * 获取Provider元数据
   */
  public getProvider(): TextProvider {
    return {
      id: 'anthropic',
      name: 'Anthropic',
      description: 'Anthropic Claude models',
      requiresApiKey: true,
      defaultBaseURL: 'https://api.anthropic.com/v1',
      supportsDynamicModels: false, // Anthropic不支持动态模型获取
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
   * 获取静态模型列表（Claude系列）
   * 从service.ts的fetchAnthropicModelsInfo迁移 (L1115-1120)
   */
  public getModels(): TextModel[] {
    const providerId = 'anthropic'

    return [
      // Claude 4.0 系列
      {
        id: 'claude-opus-4-20250514',
        name: 'Claude 4.0 Opus',
        description: 'Most powerful Claude model for complex tasks',
        providerId,
        capabilities: {
          supportsStreaming: true,
          supportsTools: true,
          supportsReasoning: false,
          maxContextLength: 200000
        },
        parameterDefinitions: this.getParameterDefinitions('claude-opus-4-20250514'),
        defaultParameterValues: this.getDefaultParameterValues('claude-opus-4-20250514')
      },
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude 4.0 Sonnet',
        description: 'Balanced Claude model for most tasks',
        providerId,
        capabilities: {
          supportsStreaming: true,
          supportsTools: true,
          supportsReasoning: false,
          maxContextLength: 200000
        },
        parameterDefinitions: this.getParameterDefinitions('claude-sonnet-4-20250514'),
        defaultParameterValues: this.getDefaultParameterValues('claude-sonnet-4-20250514')
      },

      // Claude 3.7/3.5 系列
      {
        id: 'claude-3-7-sonnet-latest',
        name: 'Claude 3.7 Sonnet',
        description: 'Latest Claude 3.7 Sonnet model',
        providerId,
        capabilities: {
          supportsStreaming: true,
          supportsTools: true,
          supportsReasoning: false,
          maxContextLength: 200000
        },
        parameterDefinitions: this.getParameterDefinitions('claude-3-7-sonnet-latest'),
        defaultParameterValues: this.getDefaultParameterValues('claude-3-7-sonnet-latest')
      },
      {
        id: 'claude-3-5-haiku-latest',
        name: 'Claude 3.5 Haiku',
        description: 'Fast and affordable Claude model',
        providerId,
        capabilities: {
          supportsStreaming: true,
          supportsTools: true,
          supportsReasoning: false,
          maxContextLength: 200000
        },
        parameterDefinitions: this.getParameterDefinitions('claude-3-5-haiku-latest'),
        defaultParameterValues: this.getDefaultParameterValues('claude-3-5-haiku-latest')
      }
    ]
  }

  /**
   * 动态获取模型列表（Anthropic不支持，返回静态列表）
   * @param config 连接配置
   * @returns 静态模型列表
   */
  public async getModelsAsync(_config: TextModelConfig): Promise<TextModel[]> {
    console.log('[AnthropicAdapter] Anthropic does not support dynamic model fetching, returning static list')
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
        description: 'Sampling temperature (0-1)',
        default: 1,
        min: 0,
        max: 1
      },
      {
        name: 'top_p',
        type: 'number',
        description: 'Nucleus sampling parameter',
        default: 1,
        min: 0,
        max: 1
      },
      {
        name: 'top_k',
        type: 'number',
        description: 'Top-k sampling parameter',
        min: 1
      },
      {
        name: 'max_tokens',
        type: 'number',
        description: 'Maximum tokens to generate',
        default: 4096,
        min: 1
      }
    ]
  }

  /**
   * 获取默认参数值
   */
  protected getDefaultParameterValues(_modelId: string): Record<string, unknown> {
    return {
      temperature: 1,
      top_p: 1,
      max_tokens: DEFAULT_MAX_TOKENS
    }
  }

  // ===== 核心方法实现 =====

  /**
   * 发送消息（结构化格式）
   */
  protected async doSendMessage(
    messages: Message[],
    config: TextModelConfig
  ): Promise<LLMResponse> {
    const result = await this.invokeAnthropic(messages, config)

    const content = this.extractTextContent(result)

    return {
      content,
      metadata: {
        model: result.model,
        finishReason: result.stop_reason || undefined
      }
    }
  }

  /**
   * 发送流式消息（模拟流式，按句分段推送）
   */
  protected async doSendMessageStream(
    messages: Message[],
    config: TextModelConfig,
    callbacks: StreamHandlers
  ): Promise<void> {
    try {
      const response = await this.doSendMessage(messages, config)

      // 简单地按句号/换行切分内容，模拟流式响应
      const chunks = response.content.split(/(?<=[。！？!?.])/)
      for (const chunk of chunks) {
        const text = chunk.trim()
        if (text.length > 0) {
          callbacks.onToken(text)
        }
      }

      callbacks.onComplete(response)
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * 发送带工具调用的流式消息（当前无真实工具调用，复用doSendMessageStream逻辑）
   */
  public async sendMessageStreamWithTools(
    messages: Message[],
    config: TextModelConfig,
    tools: ToolDefinition[],
    callbacks: StreamHandlers
  ): Promise<void> {
    try {
      const result = await this.invokeAnthropic(messages, config, tools)
      const response: LLMResponse = {
        content: this.extractTextContent(result),
        metadata: {
          model: result.model,
          finishReason: result.stop_reason || undefined
        }
      }

      for (const chunk of response.content.split(/(?<=[。！？!?.])/)) {
        const text = chunk.trim()
        if (text.length > 0) {
          callbacks.onToken(text)
        }
      }

      callbacks.onComplete(response)
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  // ===== 内部辅助方法 =====

  private async invokeAnthropic(
    messages: Message[],
    config: TextModelConfig,
    tools?: ToolDefinition[]
  ): Promise<AnthropicResponse> {
    const apiKey = config.connectionConfig?.apiKey || ''
    if (!apiKey) {
      throw new Error('[AnthropicAdapter] Missing API key')
    }

    const endpoint = this.buildEndpoint(config)
    const payload = this.buildRequestPayload(messages, config, tools)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_API_VERSION
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Anthropic API error (${response.status}): ${errorBody}`)
    }

    return (await response.json()) as AnthropicResponse
  }

  private buildEndpoint(config: TextModelConfig): string {
    const base = config.connectionConfig?.baseURL || this.getProvider().defaultBaseURL
    const normalized = base.replace(/\/?$/, '') // 去除末尾斜杠
    return `${normalized}/messages`
  }

  private buildRequestPayload(
    messages: Message[],
    config: TextModelConfig,
    tools?: ToolDefinition[]
  ): Record<string, unknown> {
    const systemMessages = messages.filter((msg) => msg.role === 'system')
    const nonSystemMessages = messages.filter((msg) => msg.role !== 'system')

    const anthropicMessages = nonSystemMessages.map((msg) => ({
      role: msg.role,
      content: msg.content
    }))

    const paramOverrides = config.paramOverrides || {}

    const payload: Record<string, unknown> = {
      model: config.modelMeta.id,
      max_tokens: paramOverrides.max_tokens || DEFAULT_MAX_TOKENS,
      messages: anthropicMessages,
      temperature: paramOverrides.temperature,
      top_p: paramOverrides.top_p
    }

    if (systemMessages.length > 0) {
      payload.system = systemMessages.map((msg) => msg.content).join('\n')
    }

    if (tools && tools.length > 0) {
      payload.tools = tools.map((tool) => ({
        type: 'tool',
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters ?? {}
      }))
    }

    return payload
  }

  private extractTextContent(response: AnthropicResponse): string {
    if (!response.content || response.content.length === 0) {
      return ''
    }

    return response.content
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text as string)
      .join('\n')
  }
}
