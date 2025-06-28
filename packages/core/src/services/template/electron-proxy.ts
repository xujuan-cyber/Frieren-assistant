import { ITemplateManager, Template } from './types';

/**
 * Electron环境下的TemplateManager代理
 * 通过IPC调用主进程中的真实TemplateManager实例
 */
export class ElectronTemplateManagerProxy implements ITemplateManager {
  private electronAPI: NonNullable<Window['electronAPI']>;

  constructor() {
    // 验证Electron环境
    if (typeof window === 'undefined' || !window.electronAPI) {
      throw new Error('ElectronTemplateManagerProxy can only be used in Electron renderer process');
    }
    this.electronAPI = window.electronAPI;
  }

  async ensureInitialized(): Promise<void> {
    // 在代理模式下，初始化由主进程负责，这里只是一个空实现
    return Promise.resolve();
  }

  isInitialized(): boolean {
    // 在代理模式下，我们假设主进程中的服务总是已初始化的
    return true;
  }

  getTemplate(templateId: string): Template {
    // 注意：ITemplateManager接口要求这是同步方法，但IPC是异步的
    // 这里需要抛出错误，因为代理模式下无法提供同步访问
    throw new Error(`getTemplate(${templateId}) is not supported in Electron proxy mode. Use async IPC calls instead.`);
  }

  async saveTemplate(template: Template): Promise<void> {
    if (template.isBuiltin) {
      throw new Error('Cannot save builtin template');
    }
    await this.electronAPI.template.createTemplate(template);
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.electronAPI.template.deleteTemplate(templateId);
  }

  listTemplates(): Template[] {
    // 同步方法在代理模式下不支持
    throw new Error('listTemplates is not supported in Electron proxy mode. Use async IPC calls instead.');
  }

  exportTemplate(templateId: string): string {
    // 同步方法在代理模式下不支持
    throw new Error(`exportTemplate(${templateId}) is not supported in Electron proxy mode. Use async IPC calls instead.`);
  }

  async importTemplate(templateJson: string): Promise<void> {
    const template = JSON.parse(templateJson);
    await this.saveTemplate(template);
  }

  clearCache(_templateId?: string): void {
    // 在代理模式下，缓存由主进程管理，这里是空实现
  }

  listTemplatesByType(type: 'optimize' | 'userOptimize' | 'iterate'): Template[] {
    // 同步方法在代理模式下不支持
    throw new Error(`listTemplatesByType(${type}) is not supported in Electron proxy mode. Use async IPC calls instead.`);
  }

  getTemplatesByType(type: 'optimize' | 'userOptimize' | 'iterate'): Template[] {
    // 同步方法在代理模式下不支持
    throw new Error(`getTemplatesByType(${type}) is not supported in Electron proxy mode. Use async IPC calls instead.`);
  }

  // 添加异步版本的方法供UI使用
  async getTemplateAsync(templateId: string): Promise<Template | undefined> {
    return this.electronAPI.template.getTemplate(templateId);
  }

  async listTemplatesAsync(): Promise<Template[]> {
    return this.electronAPI.template.getTemplates();
  }
} 