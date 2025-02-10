import { IHistoryManager, PromptRecord } from './types';
import { HistoryError, RecordNotFoundError, StorageError, RecordValidationError } from './errors';

/**
 * 历史记录管理器实现
 */
export class HistoryManager implements IHistoryManager {
  private readonly storageKey = 'prompt_history';
  private readonly maxRecords = 50; // 最多保存50条记录
  private initialized = false;

  /**
   * 初始化历史记录管理器
   */
  async init(): Promise<void> {
    try {
      // 验证存储是否可用
      const testKey = '_test_storage_';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      this.initialized = true;
    } catch (error) {
      console.error('初始化历史记录管理器失败:', error);
      throw new StorageError('初始化失败: 存储不可用', 'init');
    }
  }

  /**
   * 检查初始化状态
   */
  private checkInitialized(): void {
    if (!this.initialized) {
      throw new StorageError('历史记录管理器未初始化', 'init');
    }
  }

  /**
   * 添加记录
   */
  addRecord(record: PromptRecord): void {
    this.checkInitialized();
    try {
      this.validateRecord(record);
      const history = this.getRecords();
      history.unshift(record);
      this.saveToStorage(history.slice(0, this.maxRecords));
    } catch (error) {
      if (error instanceof HistoryError) {
        throw error;
      }
      throw new StorageError('添加记录失败', 'write');
    }
  }

  /**
   * 获取所有记录
   */
  getRecords(): PromptRecord[] {
    this.checkInitialized();
    try {
      const historyStr = localStorage.getItem(this.storageKey);
      return historyStr ? JSON.parse(historyStr) : [];
    } catch (error) {
      console.error('获取历史记录失败:', error);
      throw new StorageError('获取历史记录失败', 'read');
    }
  }

  /**
   * 获取指定记录
   */
  getRecord(id: string): PromptRecord {
    this.checkInitialized();
    const history = this.getRecords();
    const record = history.find(r => r.id === id);
    if (!record) {
      throw new RecordNotFoundError('记录不存在', id);
    }
    return record;
  }

  /**
   * 删除记录
   */
  deleteRecord(id: string): void {
    this.checkInitialized();
    const records = this.getRecords();
    const index = records.findIndex(record => record.id === id);
    if (index === -1) {
      throw new RecordNotFoundError('记录不存在', id);
    }
    records.splice(index, 1);
    try {
      this.saveToStorage(records);
    } catch (error) {
      throw new StorageError('删除记录失败', 'delete');
    }
  }

  /**
   * 获取迭代链
   */
  getIterationChain(recordId: string): PromptRecord[] {
    this.checkInitialized();
    try {
      const history = this.getRecords();
      const chain: PromptRecord[] = [];
      let currentId = recordId;

      while (currentId) {
        const record = history.find(r => r.id === currentId);
        if (!record) break;
        
        chain.unshift(record);
        currentId = record.parentId ?? '';
      }

      return chain;
    } catch (error) {
      console.error('获取迭代链失败:', error);
      throw new StorageError('获取迭代链失败', 'read');
    }
  }

  /**
   * 清除所有记录
   */
  clearHistory(): void {
    this.checkInitialized();
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('清除历史记录失败:', error);
      throw new StorageError('清除历史记录失败', 'delete');
    }
  }

  /**
   * 验证记录
   */
  private validateRecord(record: PromptRecord): void {
    const errors: string[] = [];

    if (!record.id) errors.push('缺少记录ID');
    if (!record.prompt) errors.push('缺少提示词');
    if (!record.result) errors.push('缺少结果');
    if (!record.type) errors.push('缺少记录类型');
    if (!record.timestamp) errors.push('缺少时间戳');
    if (!record.modelKey) errors.push('缺少模型标识');
    if (!record.templateId) errors.push('缺少提示词标识');

    if (errors.length > 0) {
      throw new RecordValidationError('记录验证失败', errors);
    }
  }

  /**
   * 保存到存储
   */
  private saveToStorage(records: PromptRecord[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(records));
    } catch (error) {
      throw new StorageError('保存历史记录失败', 'write');
    }
  }
}

// 导出单例实例
export const historyManager = new HistoryManager(); 