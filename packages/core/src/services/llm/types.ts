
/**
 * 消息角色类型
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * 消息类型
 */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamHandlers {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

/**
 * LLM服务接口
 */
export interface ILLMService {
  /**
   * 发送消息
   * @throws {RequestConfigError} 当参数无效时
   * @throws {APIError} 当请求失败时
   */
  sendMessage(messages: Message[], provider: string): Promise<string>;

  /**
   * 发送流式消息
   * @throws {RequestConfigError} 当参数无效时
   * @throws {APIError} 当请求失败时
   */
  sendMessageStream(
    messages: Message[], 
    provider: string, 
    callbacks: {
      onToken: (token: string) => void;
      onComplete: () => void;
      onError: (error: Error) => void;
    }
  ): Promise<void>;

  /**
   * 测试连接
   */
  testConnection(provider: string): Promise<void>;
} 