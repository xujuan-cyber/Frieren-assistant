import { PromptRecord } from '../history/types';
import { StreamHandlers } from '../llm/types';

/**
 * 统一的消息结构
 */
export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;  // 可包含变量语法 {{variableName}}
}

/**
 * 优化模式枚举
 * 用于区分不同的提示词优化类型
 */
export type OptimizationMode = 'system' | 'user';

/**
 * 优化请求接口
 */
export interface OptimizationRequest {
  optimizationMode: OptimizationMode;
  targetPrompt: string;           // 待优化的提示词
  templateId?: string;
  modelKey: string;
  // 新增：高级模式上下文（可选，保持向后兼容）
  advancedContext?: {
    variables?: Record<string, string>;          // 自定义变量
    messages?: ConversationMessage[];            // 自定义会话消息
  };
}

/**
 * 自定义会话测试请求（与OptimizationRequest保持一致）
 */
export interface CustomConversationRequest {
  modelKey: string;
  messages: ConversationMessage[];               // 使用相同的消息结构
  variables: Record<string, string>;            // 包含预定义+自定义变量
}

/**
 * 提示词服务接口
 */
export interface IPromptService {
  /** 优化提示词 - 支持提示词类型和增强功能 */
  optimizePrompt(request: OptimizationRequest): Promise<string>;
  
  /** 迭代优化提示词 */
  iteratePrompt(
    originalPrompt: string,
    lastOptimizedPrompt: string,
    iterateInput: string,
    modelKey: string,
    templateId?: string
  ): Promise<string>;
  
  /** 测试提示词 - 支持可选系统提示词 */
  testPrompt(
    systemPrompt: string,
    userPrompt: string,
    modelKey: string
  ): Promise<string>;
  
  /** 获取历史记录 */
  getHistory(): Promise<PromptRecord[]>;
  
  /** 获取迭代链 */
  getIterationChain(recordId: string): Promise<PromptRecord[]>;

  /** 优化提示词（流式）- 支持提示词类型和增强功能 */
  optimizePromptStream(
    request: OptimizationRequest,
    callbacks: StreamHandlers
  ): Promise<void>;

  /** 迭代优化提示词（流式） */
  iteratePromptStream(
    originalPrompt: string,
    lastOptimizedPrompt: string,
    iterateInput: string,
    modelKey: string,
    handlers: StreamHandlers,
    templateId: string
  ): Promise<void>;

  /** 测试提示词（流式）- 支持可选系统提示词 */
  testPromptStream(
    systemPrompt: string,
    userPrompt: string,
    modelKey: string,
    callbacks: StreamHandlers
  ): Promise<void>;

  /** 自定义会话测试（流式）- 高级模式功能 */
  testCustomConversationStream(
    request: CustomConversationRequest,
    callbacks: StreamHandlers
  ): Promise<void>;
}

export type { StreamHandlers }; 