/**
 * 变量管理相关类型定义
 */

// 统一的消息结构
export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;  // 可包含变量语法 {{variableName}}
}

// 自定义会话测试请求
export interface CustomConversationRequest {
  modelKey: string;
  messages: ConversationMessage[];
  variables: Record<string, string>;
}

// 变量值类型（MVP阶段只支持字符串）
export interface VariableValue {
  value: string;
  type: 'string';  // MVP阶段只支持string类型
  description?: string;
  lastModified: number;
}

// 变量存储结构
export interface VariableStorage {
  customVariables: Record<string, string>;  // 简化存储，只存值
  advancedModeEnabled: boolean;
  lastConversationMessages?: ConversationMessage[];
}

// 变量来源标识
export type VariableSource = 'predefined' | 'custom';

// 变量管理器接口
export interface IVariableManager {
  // 变量CRUD
  setVariable(name: string, value: string): void;
  getVariable(name: string): string | undefined;
  deleteVariable(name: string): void;
  listVariables(): Record<string, string>;
  
  // 变量解析（预定义 + 自定义）
  resolveAllVariables(context?: any): Record<string, string>;
  
  // 验证
  validateVariableName(name: string): boolean;
  scanVariablesInContent(content: string): string[];
  
  // 变量来源检查
  getVariableSource(name: string): VariableSource;
  isPredefinedVariable(name: string): boolean;
  
  // 高级模式状态
  getAdvancedModeEnabled(): boolean;
  setAdvancedModeEnabled(enabled: boolean): void;
  
  // 会话消息管理
  getLastConversationMessages(): ConversationMessage[];
  setLastConversationMessages(messages: ConversationMessage[]): void;
}

// 变量错误类
export class VariableError extends Error {
  constructor(
    message: string, 
    public variableName?: string, 
    public position?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'VariableError';
  }
}

// 预定义变量常量
export const PREDEFINED_VARIABLES = [
  'originalPrompt',
  'lastOptimizedPrompt', 
  'iterateInput',
  'currentPrompt',  // 测试阶段使用的当前提示词变量
  'userQuestion',   // 用户问题变量
  'conversationContext'  // 会话上下文变量
] as const;

export type PredefinedVariable = typeof PREDEFINED_VARIABLES[number];

// 变量验证规则
export const VARIABLE_VALIDATION = {
  NAME_PATTERN: /^[a-zA-Z][a-zA-Z0-9_]*$/,
  MAX_NAME_LENGTH: 50,
  MAX_VALUE_LENGTH: 10000,
  VARIABLE_SCAN_PATTERN: /\{\{([^}]+)\}\}/g
} as const;
