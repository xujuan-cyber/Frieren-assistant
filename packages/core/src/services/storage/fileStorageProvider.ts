import * as fs from 'fs/promises';
import * as path from 'path';
import { IStorageProvider } from './types';
import { StorageError } from './errors';

/**
 * 基于文件的存储提供器
 * 专为Electron桌面环境设计，使用JSON文件持久化存储数据
 * 
 * 特性：
 * - 延迟写入优化性能，减少I/O操作
 * - 内存缓存提供快速读取
 * - 原子写入确保数据完整性
 * - 关键时刻立即写入保证数据安全
 */
export class FileStorageProvider implements IStorageProvider {
  private filePath: string;
  private data: Map<string, string> = new Map();
  private writeTimeout: NodeJS.Timeout | null = null;
  private isDirty: boolean = false;
  private writeLock: Promise<void> = Promise.resolve();
  private initialized: boolean = false;
  
  // 配置常量
  private readonly WRITE_DELAY = 500; // 500ms延迟写入
  private readonly TEMP_FILE_SUFFIX = '.tmp';
  
  constructor(userDataPath: string) {
    if (!userDataPath) {
      throw new StorageError('FileStorageProvider requires userDataPath parameter', 'read');
    }

    this.filePath = path.join(userDataPath, 'storage.json');
  }
  
  /**
   * 确保存储已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
  
  /**
   * 初始化存储，加载现有数据
   */
  private async initialize(): Promise<void> {
    try {
      await this.loadFromFile();
      this.initialized = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new StorageError(`Failed to initialize file storage: ${errorMessage}`, 'read');
    }
  }
  
  /**
   * 从文件加载数据到内存
   */
  private async loadFromFile(): Promise<void> {
    try {
      // 检查文件是否存在
      try {
        await fs.access(this.filePath);
      } catch {
        // 文件不存在，创建空存储
        console.log('[FileStorage] Storage file not found, creating new storage');
        this.data = new Map();
        await this.saveToFile();
        return;
      }
      
      // 读取文件内容
      const content = await fs.readFile(this.filePath, 'utf8');
      
      // 验证JSON格式
      if (!this.validateJSON(content)) {
        console.warn('[FileStorage] Storage file corrupted, creating new storage');
        this.data = new Map();
        await this.saveToFile();
        return;
      }
      
      // 解析并加载数据
      const parsed = JSON.parse(content);
      this.data = new Map(Object.entries(parsed || {}));
      
      console.log(`[FileStorage] Loaded ${this.data.size} items from storage`);
      
    } catch (error) {
      console.error('[FileStorage] Failed to load from file:', error);
      // 创建新的空存储
      this.data = new Map();
      await this.saveToFile();
    }
  }
  
  /**
   * 将内存数据保存到文件
   */
  private async saveToFile(): Promise<void> {
    const data = Object.fromEntries(this.data);
    const jsonString = JSON.stringify(data, null, 2);
    await this.atomicWrite(jsonString);
  }
  
  /**
   * 原子写入文件
   */
  private async atomicWrite(data: string): Promise<void> {
    const tempPath = this.filePath + this.TEMP_FILE_SUFFIX;
    
    try {
      // 确保目录存在
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      
      // 1. 写入临时文件
      await fs.writeFile(tempPath, data, 'utf8');
      
      // 2. 验证文件格式
      if (!this.validateJSON(data)) {
        throw new Error('Invalid JSON format');
      }
      
      // 3. 原子性重命名
      await fs.rename(tempPath, this.filePath);
      
    } catch (error) {
      // 清理临时文件
      try {
        await fs.unlink(tempPath);
      } catch {}
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new StorageError(`Atomic write failed: ${errorMessage}`, 'write');
    }
  }
  
  /**
   * 验证JSON格式
   */
  private validateJSON(data: string): boolean {
    try {
      JSON.parse(data);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 调度延迟写入
   */
  private scheduleWrite(): void {
    this.isDirty = true;
    
    // 如果已有待写入任务，重置计时器
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
    }
    
    this.writeTimeout = setTimeout(async () => {
      if (this.isDirty) {
        try {
          await this.acquireWriteLock(async () => {
            await this.saveToFile();
            this.isDirty = false;
          });
        } catch (error) {
          console.error('[FileStorage] Scheduled write failed:', error);
        }
      }
      this.writeTimeout = null;
    }, this.WRITE_DELAY);
  }
  
  /**
   * 立即写入（关键时刻使用）
   */
  async flush(): Promise<void> {
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
      this.writeTimeout = null;
    }
    
    if (this.isDirty) {
      await this.acquireWriteLock(async () => {
        await this.saveToFile();
        this.isDirty = false;
      });
    }
  }
  
  /**
   * 获取写入锁，确保写入操作串行执行
   */
  private async acquireWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    const currentLock = this.writeLock;
    let resolveLock: () => void;
    
    this.writeLock = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    
    try {
      await currentLock;
      const result = await operation();
      return result;
    } finally {
      resolveLock!();
    }
  }
  
  // IStorageProvider接口实现
  
  async getItem(key: string): Promise<string | null> {
    await this.ensureInitialized();
    return this.data.get(key) || null;
  }
  
  async setItem(key: string, value: string): Promise<void> {
    await this.ensureInitialized();
    this.data.set(key, value);
    this.scheduleWrite(); // 延迟写入
  }
  
  async removeItem(key: string): Promise<void> {
    await this.ensureInitialized();
    this.data.delete(key);
    this.scheduleWrite(); // 延迟写入
  }
  
  async clearAll(): Promise<void> {
    await this.ensureInitialized();
    this.data.clear();
    // 强制写入，即使没有脏数据
    await this.acquireWriteLock(async () => {
      await this.saveToFile();
    });
  }
  
  async updateData<T>(key: string, modifier: (currentValue: T | null) => T): Promise<void> {
    await this.ensureInitialized();
    
    try {
      // 读取当前值
      const currentData = this.data.get(key);
      const currentValue: T | null = currentData ? JSON.parse(currentData) : null;
      
      // 应用修改 - 允许业务逻辑错误透传
      const newValue = modifier(currentValue);
      
      // 写入新值
      this.data.set(key, JSON.stringify(newValue));
      this.scheduleWrite(); // 延迟写入
      
    } catch (error) {
      // 业务逻辑错误直接透传，保持错误类型
      if (error instanceof Error && 
          (error.name.includes('Error') || 
           error.constructor.name !== 'Error' ||
           error.message.includes('模型') ||
           error.message.includes('不存在'))) {
        throw error;
      }
      // 只有真正的存储错误才包装为StorageError
      throw new StorageError(`Data update failed: ${key}`, 'write');
    }
  }
  
  async batchUpdate(operations: Array<{
    key: string;
    operation: 'set' | 'remove';
    value?: string;
  }>): Promise<void> {
    await this.ensureInitialized();
    
    try {
      for (const op of operations) {
        if (op.operation === 'set' && op.value !== undefined) {
          this.data.set(op.key, op.value);
        } else if (op.operation === 'remove') {
          this.data.delete(op.key);
        }
      }
      
      await this.flush(); // 批量操作后立即写入
      
    } catch (error) {
      throw new StorageError('Batch update failed', 'write');
    }
  }
  
  getCapabilities() {
    return {
      supportsAtomic: true,
      supportsBatch: true,
      maxStorageSize: undefined // 文件存储无固定大小限制
    };
  }
}
