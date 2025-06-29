import type { IPreferenceService } from './types';
import type { IStorageProvider } from '../storage/types';

/**
 * 基于IStorageProvider的偏好设置服务实现
 */
export class PreferenceService implements IPreferenceService {
  private readonly PREFIX = 'pref:';
  private keyCache: Set<string> = new Set();
  private storageProvider: IStorageProvider;
  
  constructor(storageProvider: IStorageProvider) {
    this.storageProvider = storageProvider;
  }

  /**
   * 获取偏好设置
   * @param key 键名
   * @param defaultValue 默认值
   * @returns 设置值，如果不存在则返回默认值
   */
  async get<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const prefKey = this.getPrefKey(key);
      const storedValue = await this.storageProvider.getItem(prefKey);
      if (storedValue === null) {
        return defaultValue;
      }
      // 将键添加到缓存中
      this.keyCache.add(key);
      return JSON.parse(storedValue) as T;
    } catch (error) {
      console.error(`[PreferenceService] Error getting preference for key "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * 设置偏好设置
   * @param key 键名
   * @param value 值
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      const prefKey = this.getPrefKey(key);
      const stringValue = JSON.stringify(value);
      await this.storageProvider.setItem(prefKey, stringValue);
      // 将键添加到缓存中
      this.keyCache.add(key);
    } catch (error) {
      console.error(`[PreferenceService] Error setting preference for key "${key}":`, error);
      throw new Error(`Failed to set preference: ${error}`);
    }
  }

  /**
   * 删除偏好设置
   * @param key 键名
   */
  async delete(key: string): Promise<void> {
    try {
      const prefKey = this.getPrefKey(key);
      await this.storageProvider.removeItem(prefKey);
      // 从缓存中移除键
      this.keyCache.delete(key);
    } catch (error) {
      console.error(`[PreferenceService] Error deleting preference for key "${key}":`, error);
      throw new Error(`Failed to delete preference: ${error}`);
    }
  }

  /**
   * 获取所有偏好设置的键名
   * @returns 键名列表
   */
  async keys(): Promise<string[]> {
    // 由于IStorageProvider没有getAllKeys方法，我们只能返回已知的键
    // 这是一个限制，但在大多数情况下应该足够了
    return Array.from(this.keyCache);
  }

  /**
   * 清除所有偏好设置
   */
  async clear(): Promise<void> {
    try {
      const prefKeys = Array.from(this.keyCache);
      for (const key of prefKeys) {
        await this.delete(key);
      }
      this.keyCache.clear();
    } catch (error) {
      console.error('[PreferenceService] Error clearing preferences:', error);
      throw new Error(`Failed to clear preferences: ${error}`);
    }
  }

  /**
   * 获取带前缀的键名
   * @param key 原始键名
   * @returns 带前缀的键名
   * @private
   */
  private getPrefKey(key: string): string {
    return `${this.PREFIX}${key}`;
  }
}

/**
 * 创建偏好设置服务
 * @param storageProvider 存储提供器
 * @returns 偏好设置服务实例
 */
export function createPreferenceService(storageProvider: IStorageProvider): IPreferenceService {
  return new PreferenceService(storageProvider);
} 