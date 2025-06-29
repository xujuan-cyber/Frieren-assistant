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

  async getTemplate(templateId: string): Promise<Template> {
    return this.electronAPI.template.getTemplate(templateId);
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

  async listTemplates(): Promise<Template[]> {
    return this.electronAPI.template.getTemplates();
  }

  async exportTemplate(templateId: string): Promise<string> {
    const template = await this.getTemplate(templateId);
    return JSON.stringify(template, null, 2);
  }

  async importTemplate(templateJson: string): Promise<void> {
    const template = JSON.parse(templateJson);
    await this.saveTemplate(template);
  }

  clearCache(_templateId?: string): void {
    // 在代理模式下，缓存由主进程管理，这里是空实现
  }

  async listTemplatesByType(type: 'optimize' | 'userOptimize' | 'iterate'): Promise<Template[]> {
    return this.electronAPI.template.listTemplatesByType(type);
  }

  async getTemplatesByType(type: 'optimize' | 'userOptimize' | 'iterate'): Promise<Template[]> {
    return this.listTemplatesByType(type);
  }



}