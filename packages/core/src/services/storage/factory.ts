import { IStorageProvider } from './types';
import { LocalStorageProvider } from './localStorageProvider';
import { DexieStorageProvider } from './dexieStorageProvider';

export type StorageType = 'localStorage' | 'dexie';

/**
 * 存储工厂类
 */
export class StorageFactory {
  // 单例实例缓存
  private static defaultInstance: IStorageProvider | null = null;
  private static instances: Map<StorageType, IStorageProvider> = new Map();

  /**
   * 创建存储提供器
   * @param type 存储类型
   * @returns 存储提供器实例
   */
  static create(type: StorageType): IStorageProvider {
    // 检查是否已有缓存实例
    if (StorageFactory.instances.has(type)) {
      return StorageFactory.instances.get(type)!;
    }

    let instance: IStorageProvider;
    switch (type) {
      case 'localStorage':
        instance = new LocalStorageProvider();
        break;
      case 'dexie':
        instance = new DexieStorageProvider();
        break;
      default:
        throw new Error(`Unsupported storage type: ${type}`);
    }

    // 缓存实例
    StorageFactory.instances.set(type, instance);
    return instance;
  }

  /**
   * 创建默认存储提供器（单例）
   * 优先使用 Dexie，降级到 localStorage
   */
  static createDefault(): IStorageProvider {
    // 返回缓存的默认实例
    if (StorageFactory.defaultInstance) {
      return StorageFactory.defaultInstance;
    }

    try {
      // 检查是否支持 IndexedDB (Dexie 的基础)
      if (typeof window !== 'undefined' && window.indexedDB) {
        console.log('使用 Dexie 作为默认存储提供器');
        StorageFactory.defaultInstance = StorageFactory.create('dexie');
      } else {
        console.log('IndexedDB 不可用，使用 localStorage 作为默认存储提供器');
        StorageFactory.defaultInstance = StorageFactory.create('localStorage');
      }
    } catch (error) {
      console.warn('Dexie 存储不可用，降级到 localStorage:', error);
      StorageFactory.defaultInstance = StorageFactory.create('localStorage');
    }

    return StorageFactory.defaultInstance;
  }

  /**
   * 重置所有实例（主要用于测试）
   */
  static reset(): void {
    StorageFactory.defaultInstance = null;
    StorageFactory.instances.clear();
    
    // 重置DexieStorageProvider的迁移状态
    DexieStorageProvider.resetMigrationState();
  }

  /**
   * 获取当前默认实例（用于调试）
   */
  static getCurrentDefault(): IStorageProvider | null {
    return StorageFactory.defaultInstance;
  }

  /**
   * 获取所有支持的存储类型
   */
  static getSupportedTypes(): StorageType[] {
    const types: StorageType[] = [];

    // 检查 localStorage 支持
    if (typeof window !== 'undefined' && window.localStorage) {
      types.push('localStorage');
    }

    // 检查 IndexedDB 支持
    if (typeof window !== 'undefined' && window.indexedDB) {
      types.push('dexie');
    }

    return types;
  }

  /**
   * 检查特定存储类型是否支持
   */
  static isSupported(type: StorageType): boolean {
    return StorageFactory.getSupportedTypes().includes(type);
  }
} 