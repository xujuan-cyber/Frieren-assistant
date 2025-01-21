import { ModelConfig } from '../model/types';

/**
 * 消息角色类型
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * 消息接口
 */
export interface Message {
  /** 消息角色 */
  role: MessageRole;
  /** 消息内容 */
  content: string;
}

/**
 * 请求配置接口
 */
export interface RequestConfig {
  /** 请求URL */
  url: string;
  /** 请求头 */
  headers: Record<string, string>;
  /** 请求体 */
  body: {
    model: string;
    messages: Message[];
    temperature?: number;
    max_tokens?: number;
    [key: string]: any;
  };
}

/**
 * LLM服务接口
 */
export interface ILLMService {
  /** 发送请求到LLM服务 */
  sendRequest(config: RequestConfig): Promise<string>;
  /** 构建请求配置 */
  buildRequestConfig(modelConfig: ModelConfig, messages: Message[]): RequestConfig;
} 