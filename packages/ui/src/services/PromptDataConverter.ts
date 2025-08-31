/**
 * 多格式数据转换器实现
 */

import type {
  DataConverter,
  StandardPromptData,
  OpenAIRequest,
  ConversionResult,
  StandardMessage,
  ConversationMessage
} from '../types'

export class PromptDataConverter implements DataConverter {
  /**
   * 从LangFuse trace数据转换为标准格式
   * 支持多种LangFuse数据结构：
   * 1. 手工复制的消息列表: [{"role":"","content":""}]
   * 2. LangFuse官方导出: [{"id":"","input":[消息列表]}]
   * 3. 工具调用消息分离处理
   */
  fromLangFuse(langfuseData: any): ConversionResult<StandardPromptData> {
    try {
      let messages: any[] = []
      const extractedTools: any[] = []
      let metadata: any = {}

      // 智能识别LangFuse数据结构层级
      if (Array.isArray(langfuseData)) {
        // 情况1: 直接是消息数组 [{"role":"","content":""}]
        if (langfuseData.length > 0 && langfuseData[0].role) {
          messages = langfuseData
        }
        // 情况2: LangFuse官方导出格式 [{"id":"","input":[消息列表]}]
        else if (langfuseData.length > 0 && langfuseData[0].input) {
          const firstRecord = langfuseData[0]
          messages = firstRecord.input.messages || firstRecord.input || []
          
          // 提取元数据
          metadata = {
            langfuse_trace_id: firstRecord.id,
            timestamp: firstRecord.timestamp,
            ...firstRecord.metadata
          }
        }
        else {
          return {
            success: false,
            error: 'Invalid LangFuse data: unrecognized array structure'
          }
        }
      }
      // 情况3: 单个LangFuse trace对象
      else if (langfuseData.input) {
        messages = langfuseData.input.messages || langfuseData.input || []
        metadata = {
          langfuse_trace_id: langfuseData.id,
          timestamp: langfuseData.timestamp,
          ...langfuseData.metadata
        }
      }
      else {
        return {
          success: false,
          error: 'Invalid LangFuse data: missing input or messages'
        }
      }

      // 分离工具调用消息和普通对话消息
      const conversationMessages: any[] = []
      
      for (const msg of messages) {
        if (msg.role === 'tool') {
          // 工具消息：提取工具定义
          if (msg.content?.type === 'function' && msg.content?.function) {
            extractedTools.push({
              type: 'function',
              function: msg.content.function
            })
          }
        } else {
          // 普通对话消息
          conversationMessages.push({
            role: msg.role,
            content: msg.content,
            name: msg.name,
            tool_calls: msg.tool_calls,
            tool_call_id: msg.tool_call_id
          })
        }
      }

      const standardData: StandardPromptData = {
        messages: conversationMessages,
        model: metadata?.model,
        temperature: metadata?.temperature,
        tools: extractedTools.length > 0 ? extractedTools : undefined,
        metadata: {
          source: 'langfuse',
          template_info: {
            name: metadata?.name
          },
          timestamp: metadata?.timestamp,
          langfuse_trace_id: metadata?.langfuse_trace_id,
          usage: metadata?.usage,
          extracted_tools_count: extractedTools.length
        }
      }

      return {
        success: true,
        data: standardData
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to convert LangFuse data: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * 从OpenAI请求格式转换为标准格式
   */
  fromOpenAI(request: OpenAIRequest): ConversionResult<StandardPromptData> {
    try {
      if (!request.messages || !Array.isArray(request.messages)) {
        return {
          success: false,
          error: 'Invalid OpenAI request: missing or invalid messages array'
        }
      }

      const standardData: StandardPromptData = {
        messages: request.messages,
        tools: request.tools,
        model: request.model,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        top_p: request.top_p,
        frequency_penalty: request.frequency_penalty,
        presence_penalty: request.presence_penalty,
        stop: request.stop,
        stream: request.stream,
        metadata: {
          source: 'openai',
          timestamp: new Date().toISOString()
        }
      }

      return {
        success: true,
        data: standardData
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to convert OpenAI data: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * 从会话消息格式转换为标准格式
   */
  fromConversationMessages(
    messages: ConversationMessage[], 
    metadata?: any
  ): ConversionResult<StandardPromptData> {
    try {
      if (!messages || !Array.isArray(messages)) {
        return {
          success: false,
          error: 'Invalid conversation messages: must be an array'
        }
      }

      const standardMessages: StandardMessage[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      const standardData: StandardPromptData = {
        messages: standardMessages,
        metadata: {
          source: 'conversation',
          timestamp: new Date().toISOString(),
          ...metadata
        }
      }

      return {
        success: true,
        data: standardData
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to convert conversation messages: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * 从标准格式转换为OpenAI请求格式
   */
  toOpenAI(
    data: StandardPromptData, 
    variables?: Record<string, string>
  ): ConversionResult<OpenAIRequest> {
    try {
      if (!data.messages || !Array.isArray(data.messages)) {
        return {
          success: false,
          error: 'Invalid standard data: missing or invalid messages array'
        }
      }

      // 替换变量
      let processedMessages = data.messages
      if (variables) {
        processedMessages = data.messages.map(msg => ({
          ...msg,
          content: this.replaceVariables(msg.content, variables)
        }))
      }

      const openaiRequest: OpenAIRequest = {
        messages: processedMessages,
        model: data.model || 'gpt-3.5-turbo',
        ...(data.tools && { tools: data.tools }),
        ...(data.temperature !== undefined && { temperature: data.temperature }),
        ...(data.max_tokens !== undefined && { max_tokens: data.max_tokens }),
        ...(data.top_p !== undefined && { top_p: data.top_p }),
        ...(data.frequency_penalty !== undefined && { frequency_penalty: data.frequency_penalty }),
        ...(data.presence_penalty !== undefined && { presence_penalty: data.presence_penalty }),
        ...(data.stop !== undefined && { stop: data.stop }),
        ...(data.stream !== undefined && { stream: data.stream })
      }

      return {
        success: true,
        data: openaiRequest
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to convert to OpenAI format: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * 从标准格式转换为会话消息格式
   */
  toConversationMessages(data: StandardPromptData): ConversionResult<ConversationMessage[]> {
    try {
      if (!data.messages || !Array.isArray(data.messages)) {
        return {
          success: false,
          error: 'Invalid standard data: missing or invalid messages array'
        }
      }

      const conversationMessages: ConversationMessage[] = data.messages
        .filter(msg => ['system', 'user', 'assistant'].includes(msg.role))
        .map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content
        }))

      const warnings: string[] = []
      const originalLength = data.messages.length
      const filteredLength = conversationMessages.length

      if (originalLength > filteredLength) {
        warnings.push(`Filtered out ${originalLength - filteredLength} tool messages that are not supported in conversation format`)
      }

      return {
        success: true,
        data: conversationMessages,
        warnings
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to convert to conversation messages: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * 验证数据格式是否有效
   */
  validate(data: any, format: 'standard' | 'langfuse' | 'openai' | 'conversation'): ConversionResult<boolean> {
    try {
      switch (format) {
        case 'standard':
          return this.validateStandardFormat(data)
        case 'langfuse':
          return this.validateLangFuseFormat(data)
        case 'openai':
          return this.validateOpenAIFormat(data)
        case 'conversation':
          return this.validateConversationFormat(data)
        default:
          return {
            success: false,
            error: `Unknown format: ${format}`
          }
      }
    } catch (error) {
      return {
        success: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // 私有方法：替换变量
  private replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content
    for (const [name, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, 'g')
      result = result.replace(pattern, value)
    }
    return result
  }

  // 私有方法：验证标准格式
  private validateStandardFormat(data: any): ConversionResult<boolean> {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Data must be an object' }
    }

    if (!data.messages || !Array.isArray(data.messages)) {
      return { success: false, error: 'Messages must be an array' }
    }

    for (const [index, message] of data.messages.entries()) {
      if (!message.role || !['system', 'user', 'assistant', 'tool'].includes(message.role)) {
        return { success: false, error: `Invalid role in message ${index}` }
      }
      if (typeof message.content !== 'string') {
        return { success: false, error: `Invalid content in message ${index}` }
      }
    }

    return { success: true, data: true }
  }

  // 私有方法：验证LangFuse格式
  private validateLangFuseFormat(data: any): ConversionResult<boolean> {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'LangFuse data must be an object' }
    }

    if (!data.input || !data.input.messages) {
      return { success: false, error: 'LangFuse data must have input.messages' }
    }

    return this.validateStandardFormat({ messages: data.input.messages })
  }

  // 私有方法：验证OpenAI格式
  private validateOpenAIFormat(data: any): ConversionResult<boolean> {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'OpenAI data must be an object' }
    }

    if (!data.messages || !Array.isArray(data.messages)) {
      return { success: false, error: 'OpenAI data must have messages array' }
    }

    if (!data.model || typeof data.model !== 'string') {
      return { success: false, error: 'OpenAI data must have model string' }
    }

    return this.validateStandardFormat(data)
  }

  // 私有方法：验证会话格式
  private validateConversationFormat(data: any): ConversionResult<boolean> {
    if (!Array.isArray(data)) {
      return { success: false, error: 'Conversation data must be an array' }
    }

    for (const [index, message] of data.entries()) {
      if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
        return { success: false, error: `Invalid role in conversation message ${index}` }
      }
      if (typeof message.content !== 'string') {
        return { success: false, error: `Invalid content in conversation message ${index}` }
      }
    }

    return { success: true, data: true }
  }
}