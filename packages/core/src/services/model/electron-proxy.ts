import { IModelManager, ModelConfig } from './types';

/**
 * Electron环境下的ModelManager代理
 * 通过IPC调用主进程中的真实ModelManager实例
 */
export class ElectronModelManagerProxy implements IModelManager {
  private electronAPI: any;

  constructor() {
    // 验证Electron环境
    if (typeof window === 'undefined' || !(window as any).electronAPI) {
      throw new Error('ElectronModelManagerProxy can only be used in Electron renderer process');
    }
    this.electronAPI = (window as any).electronAPI;
  }

  async getAllModels(): Promise<Array<ModelConfig & { key: string }>> {
    return this.electronAPI.model.getModels();
  }

  async getModel(key: string): Promise<ModelConfig | undefined> {
    const models = await this.getAllModels();
    return models.find(m => m.key === key);
  }

  async addModel(key: string, config: ModelConfig): Promise<void> {
    await this.electronAPI.model.addModel({ ...config, key });
  }

  async updateModel(key: string, config: Partial<ModelConfig>): Promise<void> {
    await this.electronAPI.model.updateModel(key, config);
  }

  async deleteModel(key: string): Promise<void> {
    await this.electronAPI.model.deleteModel(key);
  }

  async enableModel(key: string): Promise<void> {
    await this.updateModel(key, { enabled: true });
  }

  async disableModel(key: string): Promise<void> {
    await this.updateModel(key, { enabled: false });
  }

  async getEnabledModels(): Promise<Array<ModelConfig & { key: string }>> {
    const allModels = await this.getAllModels();
    return allModels.filter(m => m.enabled);
  }
} 