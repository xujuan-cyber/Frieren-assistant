/**
 * 提示词记录类型
 */
export type PromptRecordType = 'optimize' | 'iterate' | 'test';

/**
 * 提示词记录接口
 */
export interface PromptRecord {
  /** 记录ID */
  id: string;
  /** 原始提示词 */
  prompt: string;
  /** 结果 */
  result: string;
  /** 记录类型 */
  type: PromptRecordType;
  /** 父记录ID（用于迭代链） */
  parentId?: string;
  /** 时间戳 */
  timestamp: number;
  /** 使用的模型key */
  modelKey: string;
  /** 使用的模板ID */
  templateId: string;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 历史记录管理器接口
 */
export interface IHistoryManager {
  /** 添加记录 */
  addRecord(record: PromptRecord): void;
  /** 获取所有记录 */
  getRecords(): PromptRecord[];
  /** 获取指定记录 */
  getRecord(id: string): PromptRecord;
  /** 删除记录 */
  deleteRecord(id: string): void;
  /** 获取迭代链 */
  getIterationChain(recordId: string): PromptRecord[];
  /** 清除所有记录 */
  clearHistory(): void;
} 