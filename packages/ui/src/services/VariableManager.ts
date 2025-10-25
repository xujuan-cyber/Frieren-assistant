/**
 * UI层变量管理器
 * 负责自定义变量的管理、存储和解析
 */

import type { IPreferenceService } from '@prompt-optimizer/core';
import { 
  PREDEFINED_VARIABLES, 
  VARIABLE_VALIDATION,
  VariableError,
  type IVariableManager, 
  type VariableStorage, 
  type ConversationMessage, 
  type VariableSource,
  type PredefinedVariable
} from '../types/variable';

// 存储键
const STORAGE_KEYS = {
  VARIABLES: 'variableManager.storage',
  ADVANCED_MODE: 'variableManager.advancedMode'
} as const;

/**
 * 变量扫描缓存条目
 */
interface ScanCacheEntry {
  content: string;
  variables: string[];
  timestamp: number;
}

/**
 * 变量管理器实现
 */
export class VariableManager implements IVariableManager {
  private customVariables: Record<string, string> = {};
  private advancedModeEnabled: boolean = false;
  private lastConversationMessages: ConversationMessage[] = [];
  
  // 变量扫描缓存
  private scanCache: Map<string, ScanCacheEntry> = new Map();
  private readonly CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5分钟缓存
  private readonly MAX_CACHE_SIZE = 100; // 最大缓存条目数
  
  constructor(private preferenceService: IPreferenceService) {
    this.loadFromStorage();
  }

  // 变量CRUD操作
  setVariable(name: string, value: string): void {
    if (!this.validateVariableName(name)) {
      throw new VariableError(
        `Invalid variable name: ${name}. Must start with letter and contain only letters, numbers, and underscores.`,
        name,
        undefined,
        'INVALID_VARIABLE_NAME'
      );
    }

    if (this.isPredefinedVariable(name)) {
      throw new VariableError(
        `Cannot override predefined variable: ${name}`,
        name,
        undefined,
        'PREDEFINED_VARIABLE_OVERRIDE'
      );
    }

    if (value.length > VARIABLE_VALIDATION.MAX_VALUE_LENGTH) {
      throw new VariableError(
        `Variable value too long: ${value.length} > ${VARIABLE_VALIDATION.MAX_VALUE_LENGTH}`,
        name,
        undefined,
        'VALUE_TOO_LONG'
      );
    }

    this.customVariables[name] = value;
    this.saveToStorage();
  }

  getVariable(name: string): string | undefined {
    return this.customVariables[name];
  }

  deleteVariable(name: string): void {
    if (this.isPredefinedVariable(name)) {
      throw new VariableError(
        `Cannot delete predefined variable: ${name}`,
        name,
        undefined,
        'DELETE_PREDEFINED_VARIABLE'
      );
    }

    delete this.customVariables[name];
    this.saveToStorage();
  }

  listVariables(): Record<string, string> {
    return { ...this.customVariables };
  }

  // 变量解析
  resolveAllVariables(context?: Record<string, unknown>): Record<string, string> {
    // 获取预定义变量的值
    const predefinedValues: Record<string, string> = {};
    
    if (context) {
      // 从上下文中提取预定义变量
      for (const varName of PREDEFINED_VARIABLES) {
        if (Object.prototype.hasOwnProperty.call(context, varName)) {
          const value = context[varName];
          predefinedValues[varName] = value != null ? String(value) : '';
        } else {
          predefinedValues[varName] = '';
        }
      }
    } else {
      // 没有上下文时，预定义变量为空
      for (const varName of PREDEFINED_VARIABLES) {
        predefinedValues[varName] = '';
      }
    }

    // 合并预定义变量和自定义变量（自定义变量优先级更高，但不能覆盖预定义变量）
    return { ...predefinedValues, ...this.customVariables };
  }

  // 验证方法
  validateVariableName(name: string): boolean {
    if (!name || name.length === 0) return false;
    if (name.length > VARIABLE_VALIDATION.MAX_NAME_LENGTH) return false;
    return VARIABLE_VALIDATION.NAME_PATTERN.test(name);
  }

  scanVariablesInContent(content: string): string[] {
    const variables: string[] = [];
    
    // 防御性编程：确保content是字符串类型
    if (typeof content !== 'string') {
      console.warn('[VariableManager] scanVariablesInContent received non-string input:', typeof content, content);
      return variables;
    }
    
    const matches = content.matchAll(VARIABLE_VALIDATION.VARIABLE_SCAN_PATTERN);
    
    for (const match of matches) {
      if (match[1]) {
        const variableName = match[1].trim();
        if (variableName && !variables.includes(variableName)) {
          variables.push(variableName);
        }
      }
    }
    
    return variables;
  }

  // 变量来源检查
  getVariableSource(name: string): VariableSource {
    return this.isPredefinedVariable(name) ? 'predefined' : 'custom';
  }

  isPredefinedVariable(name: string): boolean {
    return PREDEFINED_VARIABLES.includes(name as PredefinedVariable);
  }

  // 高级模式状态管理
  getAdvancedModeEnabled(): boolean {
    return this.advancedModeEnabled;
  }

  setAdvancedModeEnabled(enabled: boolean): void {
    this.advancedModeEnabled = enabled;
    this.saveToStorage();
  }

  // 会话消息管理
  getLastConversationMessages(): ConversationMessage[] {
    return [...this.lastConversationMessages];
  }

  setLastConversationMessages(messages: ConversationMessage[]): void {
    this.lastConversationMessages = [...messages];
    this.saveToStorage();
  }

  // 缺失变量检测
  detectMissingVariables(
    content: string | ConversationMessage[], 
    availableVariables?: Record<string, string>
  ): string[] {
    const variables = availableVariables || this.resolveAllVariables();
    const usedVariables = new Set<string>();

    if (typeof content === 'string') {
      // 单个字符串内容
      const foundVariables = this.scanVariablesInContent(content);
      foundVariables.forEach(varName => usedVariables.add(varName));
    } else {
      // 消息数组
      content.forEach(message => {
        const foundVariables = this.scanVariablesInContent(message.content);
        foundVariables.forEach(varName => usedVariables.add(varName));
      });
    }

    // 返回缺失的变量
    return Array.from(usedVariables).filter(varName => 
      variables[varName] === undefined
    );
  }

  // 变量替换
  replaceVariables(content: string, variables?: Record<string, string>): string {
    const finalVariables = variables || this.resolveAllVariables();
    
    return content.replace(VARIABLE_VALIDATION.VARIABLE_SCAN_PATTERN, (match, variableName) => {
      const trimmedName = variableName.trim();
      const value = finalVariables[trimmedName];
      
      // 如果变量不存在，保留原始占位符（不要静默失败）
      return value !== undefined ? String(value) : match;
    });
  }

  // 数据持久化
  private async loadFromStorage(): Promise<void> {
    try {
      const storage = await this.preferenceService.get<VariableStorage>(
        STORAGE_KEYS.VARIABLES, 
        {
          customVariables: {},
          advancedModeEnabled: false,
          lastConversationMessages: []
        }
      );

      this.customVariables = storage.customVariables || {};
      this.advancedModeEnabled = storage.advancedModeEnabled || false;
      this.lastConversationMessages = storage.lastConversationMessages || [];
    } catch (error) {
      console.warn('[VariableManager] Failed to load from storage:', error);
      // 继续使用默认值
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const storage: VariableStorage = {
        customVariables: this.customVariables,
        advancedModeEnabled: this.advancedModeEnabled,
        lastConversationMessages: this.lastConversationMessages
      };

      await this.preferenceService.set(STORAGE_KEYS.VARIABLES, storage);
    } catch (error) {
      console.error('[VariableManager] Failed to save to storage:', error);
      // 不抛出错误，避免影响用户操作
    }
  }

  // 调试和工具方法
  exportVariables(): string {
    const exportData = {
      customVariables: this.customVariables,
      advancedModeEnabled: this.advancedModeEnabled,
      exportTime: new Date().toISOString()
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  importVariables(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.customVariables && typeof data.customVariables === 'object') {
        // 验证每个变量名
        for (const [name, value] of Object.entries(data.customVariables)) {
          if (typeof value === 'string' && this.validateVariableName(name)) {
            this.customVariables[name] = value;
          }
        }
      }

      if (typeof data.advancedModeEnabled === 'boolean') {
        this.advancedModeEnabled = data.advancedModeEnabled;
      }

      this.saveToStorage();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new VariableError(
        `Failed to import variables: ${errorMessage}`,
        undefined,
        undefined,
        'IMPORT_ERROR'
      );
    }
  }

  // 获取变量统计信息
  getStatistics(): {
    customVariableCount: number;
    predefinedVariableCount: number;
    totalVariableCount: number;
    advancedModeEnabled: boolean;
  } {
    return {
      customVariableCount: Object.keys(this.customVariables).length,
      predefinedVariableCount: PREDEFINED_VARIABLES.length,
      totalVariableCount: Object.keys(this.customVariables).length + PREDEFINED_VARIABLES.length,
      advancedModeEnabled: this.advancedModeEnabled
    };
  }
}
