import Dexie, { type Table } from 'dexie';
import { IStorageProvider } from './types';
import { LocalStorageProvider } from './localStorageProvider';

/**
 * 数据表接口定义
 */
interface StorageRecord {
  key: string;
  value: string;
  timestamp?: number;
}

/**
 * Dexie 数据库类
 */
class PromptOptimizerDB extends Dexie {
  storage!: Table<StorageRecord, string>;

  constructor() {
    super('PromptOptimizerDB');
    
    // 定义数据库结构
    this.version(1).stores({
      storage: 'key, value, timestamp'
    });
  }
}

/**
 * 基于 Dexie 的存储提供器实现
 * 
 * 相比 LocalStorageProvider 的优势：
 * - 更大的存储容量（几GB vs 5MB）
 * - 原生事务支持，更好的并发安全
 * - 异步操作，不阻塞UI
 * - 更好的查询性能
 */
export class DexieStorageProvider implements IStorageProvider {
  private db: PromptOptimizerDB;
  private migrated = false;
  
  // 全局静态迁移状态，防止多个实例重复迁移
  private static globalMigrationCompleted = false;
  private static migrationLock = Promise.resolve();
  
  // 用于原子操作的锁机制
  private keyLocks = new Map<string, Promise<void>>();

  constructor() {
    this.db = new PromptOptimizerDB();
  }

  /**
   * 初始化并执行数据迁移（如果需要）
   */
  private async initialize(): Promise<void> {
    if (this.migrated) return;

    try {
      // 检查是否需要从 localStorage 迁移数据
      await this.migrateFromLocalStorage();
      this.migrated = true;
    } catch (error) {
      console.error('Dexie storage initialization failed:', error);
      throw error;
    }
  }

  /**
   * 从 localStorage 迁移数据到 Dexie
   */
  private async migrateFromLocalStorage(): Promise<void> {
    // 使用原子锁确保迁移的线程安全
    DexieStorageProvider.migrationLock = DexieStorageProvider.migrationLock.then(async () => {
      // 如果全局迁移已完成，直接返回
      if (DexieStorageProvider.globalMigrationCompleted) {
        console.log('全局迁移已完成，跳过重复迁移');
        return;
      }

      try {
        await this.performMigration();
        DexieStorageProvider.globalMigrationCompleted = true;
        console.log('数据迁移成功完成');
      } catch (error) {
        console.error('数据迁移失败:', error);
        // 迁移失败时重置状态，允许重试
        DexieStorageProvider.globalMigrationCompleted = false;
        throw error;
      }
    });
    
    await DexieStorageProvider.migrationLock;
  }



  /**
   * 执行实际的迁移操作
   */
  private async performMigration(): Promise<void> {
    try {
      // 检查 Dexie 中是否已有数据
      const existingCount = await this.db.storage.count();
      if (existingCount > 0) {
        console.log('Dexie存储已有数据，跳过迁移');
        return;
      }

      // 检查是否已经迁移过（防止重复迁移）
      const migrationFlag = 'dexie_migration_completed';
      if (typeof window !== 'undefined' && window.localStorage) {
        const migrationCompleted = window.localStorage.getItem(migrationFlag);
        if (migrationCompleted === 'true') {
          console.log('数据迁移已完成，跳过重复迁移');
          return;
        }
      }

      // 获取 localStorage 中的所有数据
      const localStorageProvider = new LocalStorageProvider();
      const allLocalStorageData: Record<string, string> = {};
      
      // 遍历所有 localStorage 键
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && !key.startsWith('dexie_')) { // 排除 Dexie 内部键
            const value = await localStorageProvider.getItem(key);
            if (value !== null) {
              allLocalStorageData[key] = value;
            }
          }
        }
      }

      const keysToMigrate = Object.keys(allLocalStorageData);
      if (keysToMigrate.length === 0) {
        console.log('localStorage中没有找到需要迁移的数据');
        return;
      }

      console.log(`开始迁移localStorage数据，共发现 ${keysToMigrate.length} 个键:`, keysToMigrate);

      // 批量迁移数据
      const migratePromises = keysToMigrate.map(async (key) => {
        try {
          const value = allLocalStorageData[key];
          await this.db.storage.put({
            key,
            value,
            timestamp: Date.now()
          });
          console.log(`✅ 已迁移数据: ${key} (${Math.round(value.length / 1024)}KB)`);
          return { key, success: true, size: value.length };
        } catch (error) {
          console.warn(`❌ 迁移数据失败 ${key}:`, error);
          return { key, success: false, error };
        }
      });

      const results = await Promise.all(migratePromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      console.log(`数据迁移完成: 成功 ${successful.length}/${keysToMigrate.length} 项`);
      
      if (failed.length > 0) {
        console.warn(`迁移失败的键:`, failed.map(f => f.key));
      }

      // 标记迁移完成，防止重复迁移
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(migrationFlag, 'true');
      }
      
      console.log('原localStorage数据已保留作为备份');
      
    } catch (error) {
      console.error('数据迁移过程中出现错误:', error);
      // 迁移失败不应该阻止 Dexie 的正常使用
    }
  }

  /**
   * 重置迁移状态（主要用于测试）
   */
  static resetMigrationState(): void {
    DexieStorageProvider.globalMigrationCompleted = false;
    DexieStorageProvider.migrationLock = Promise.resolve();
    
    // 清除localStorage中的迁移标志
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('dexie_migration_completed');
    }
  }

  /**
   * 获取存储项
   */
  async getItem(key: string): Promise<string | null> {
    await this.initialize();
    
    try {
      const record = await this.db.storage.get(key);
      return record?.value ?? null;
    } catch (error) {
      console.error(`获取存储项失败 (${key}):`, error);
      throw new Error(`Failed to get item: ${key}`);
    }
  }

  /**
   * 设置存储项
   */
  async setItem(key: string, value: string): Promise<void> {
    await this.initialize();
    
    try {
      await this.db.storage.put({
        key,
        value,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(`设置存储项失败 (${key}):`, error);
      throw new Error(`Failed to set item: ${key}`);
    }
  }

  /**
   * 删除存储项
   */
  async removeItem(key: string): Promise<void> {
    await this.initialize();
    
    try {
      await this.db.storage.delete(key);
    } catch (error) {
      console.error(`删除存储项失败 (${key}):`, error);
      throw new Error(`Failed to remove item: ${key}`);
    }
  }

  /**
   * 清空所有存储
   */
  async clearAll(): Promise<void> {
    await this.initialize();
    
    try {
      await this.db.storage.clear();
    } catch (error) {
      console.error('清空存储失败:', error);
      throw new Error('Failed to clear storage');
    }
  }

  /**
   * 原子更新操作
   * 使用 Dexie 的事务机制确保原子性
   */
  async atomicUpdate<T>(
    key: string,
    updateFn: (currentValue: T | null) => T
  ): Promise<void> {
    await this.initialize();

    // 获取键级别的锁
    const lockKey = `atomic_${key}`;
    if (this.keyLocks.has(lockKey)) {
      await this.keyLocks.get(lockKey);
    }

    const lockPromise = this._performAtomicUpdate(key, updateFn);
    this.keyLocks.set(lockKey, lockPromise);

    try {
      await lockPromise;
    } finally {
      this.keyLocks.delete(lockKey);
    }
  }

  /**
   * 隐藏式数据更新 - 内部使用原子更新实现
   * 实现 IStorageProvider 接口要求
   */
  async updateData<T>(
    key: string,
    modifier: (currentValue: T | null) => T
  ): Promise<void> {
    // 直接使用内部的原子更新实现
    await this.atomicUpdate(key, modifier);
  }

  /**
   * 执行原子更新
   */
  private async _performAtomicUpdate<T>(
    key: string,
    updateFn: (currentValue: T | null) => T
  ): Promise<void> {
    try {
      await this.db.transaction('rw', this.db.storage, async () => {
        // 读取当前值
        const currentRecord = await this.db.storage.get(key);
        const currentValue = currentRecord?.value 
          ? JSON.parse(currentRecord.value) as T
          : null;

        // 应用更新函数
        const newValue = updateFn(currentValue);

        // 写入新值
        await this.db.storage.put({
          key,
          value: JSON.stringify(newValue),
          timestamp: Date.now()
        });
      });
    } catch (error) {
      console.error(`原子更新失败 (${key}):`, error);
      throw new Error(`Failed to perform atomic update: ${key}`);
    }
  }

  /**
   * 批量更新操作
   */
  async batchUpdate(operations: Array<{
    key: string;
    operation: 'set' | 'remove';
    value?: string;
  }>): Promise<void> {
    await this.initialize();

    try {
      await this.db.transaction('rw', this.db.storage, async () => {
        const updates: Array<StorageRecord> = [];
        const deletions: string[] = [];

        for (const { key, operation, value } of operations) {
          if (operation === 'set' && value !== undefined) {
            updates.push({
              key,
              value,
              timestamp: Date.now()
            });
          } else if (operation === 'remove') {
            deletions.push(key);
          }
        }

        // 批量写入
        if (updates.length > 0) {
          await this.db.storage.bulkPut(updates);
        }

        // 批量删除
        if (deletions.length > 0) {
          await this.db.storage.bulkDelete(deletions);
        }
      });
    } catch (error) {
      console.error('批量更新失败:', error);
      throw new Error('Failed to perform batch update');
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageInfo(): Promise<{
    itemCount: number;
    estimatedSize: number;
    lastUpdated: number | null;
  }> {
    await this.initialize();

    try {
      const itemCount = await this.db.storage.count();
      const lastRecord = await this.db.storage
        .orderBy('timestamp')
        .last();
      
      // 估算存储大小（粗略计算）
      const allRecords = await this.db.storage.toArray();
      const estimatedSize = allRecords.reduce(
        (total, record) => total + record.value.length,
        0
      );

      return {
        itemCount,
        estimatedSize,
        lastUpdated: lastRecord?.timestamp ?? null
      };
    } catch (error) {
      console.error('获取存储信息失败:', error);
      return {
        itemCount: 0,
        estimatedSize: 0,
        lastUpdated: null
      };
    }
  }

  /**
   * 导出所有数据（用于备份）
   */
  async exportAll(): Promise<Record<string, string>> {
    await this.initialize();

    try {
      const allRecords = await this.db.storage.toArray();
      const result: Record<string, string> = {};
      
      allRecords.forEach(record => {
        result[record.key] = record.value;
      });

      return result;
    } catch (error) {
      console.error('导出数据失败:', error);
      throw new Error('Failed to export data');
    }
  }

  /**
   * 导入数据（用于恢复）
   */
  async importAll(data: Record<string, string>): Promise<void> {
    await this.initialize();

    try {
      const records: StorageRecord[] = Object.entries(data).map(([key, value]) => ({
        key,
        value,
        timestamp: Date.now()
      }));

      await this.db.storage.bulkPut(records);
    } catch (error) {
      console.error('导入数据失败:', error);
      throw new Error('Failed to import data');
    }
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    try {
      await this.db.close();
    } catch (error) {
      console.error('关闭数据库失败:', error);
    }
  }
} 