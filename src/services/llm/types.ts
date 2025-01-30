import { ModelConfig } from '../model/types';

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

/**
 * 请求配置类型
 */
export interface RequestConfig {
  url: string;
  headers: Record<string, string>;
  body: {
    model: string;
    messages: Message[];
  };
}

/**
 * LLM服务接口
 */
export interface ILLMService {
  /**
   * 构建请求配置
   * @throws {RequestConfigError} 当配置无效时
   */
  buildRequestConfig(modelConfig: ModelConfig, messages: Message[]): RequestConfig;

  /**
   * 发送请求
   * @throws {APIError} 当请求失败时
   */
  sendRequest(config: RequestConfig): Promise<string>;

  /**
   * 发送消息
   * @throws {RequestConfigError} 当参数无效时
   * @throws {APIError} 当请求失败时
   */
  sendMessage(messages: Message[], provider: string): Promise<string>;
} 