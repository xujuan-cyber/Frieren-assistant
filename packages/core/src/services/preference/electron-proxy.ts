import type { IPreferenceService } from './types';
import { safeSerializeForIPC } from '../../utils/ipc-serialization';

declare const window: {
  electronAPI: {
    preference: IPreferenceService;
  }
};

export class ElectronPreferenceServiceProxy implements IPreferenceService {
  private ensureApiAvailable() {
    const windowAny = window as any;
    if (!windowAny?.electronAPI?.preference) {
      throw new Error('Electron API not available. Please ensure preload script is loaded and window.electronAPI.preference is accessible.');
    }
  }

  async get<T>(key: string, defaultValue: T): Promise<T> {
    this.ensureApiAvailable();
    return window.electronAPI.preference.get(key, defaultValue);
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.ensureApiAvailable();
    // 自动序列化，防止Vue响应式对象IPC传递错误
    const safeValue = safeSerializeForIPC(value);
    return window.electronAPI.preference.set(key, safeValue);
  }

  async delete(key: string): Promise<void> {
    this.ensureApiAvailable();
    return window.electronAPI.preference.delete(key);
  }

  async keys(): Promise<string[]> {
    this.ensureApiAvailable();
    return window.electronAPI.preference.keys();
  }

  async clear(): Promise<void> {
    this.ensureApiAvailable();
    return window.electronAPI.preference.clear();
  }
} 