import { load } from 'js-yaml';
import { ITemplateManager, Template, CachedTemplate } from './types';
import { TemplateError, TemplateLoadError } from './errors';

/**
 * 模板管理器实现
 */
export class TemplateManager implements ITemplateManager {
  private templateCache: Map<string, CachedTemplate>;
  private templateDir: string;
  private cacheTimeout: number;

  constructor(templateDir = '/templates', cacheTimeout = 5 * 60 * 1000) {
    this.templateCache = new Map();
    this.templateDir = templateDir;
    this.cacheTimeout = cacheTimeout;
  }

  /**
   * 初始化模板管理器
   */
  async init(): Promise<void> {
    try {
      await this.loadTemplateIndex();
    } catch (error) {
      throw new TemplateError(`初始化失败: ${error.message}`);
    }
  }

  /**
   * 获取模板
   */
  async getTemplate(templateId: string = 'optimize'): Promise<Template> {
    const fileName = `${templateId}.yaml`;
    return this.loadTemplate(fileName);
  }

  /**
   * 加载模板
   */
  async loadTemplate(fileName: string, force = false): Promise<Template> {
    const templateId = fileName.replace('.yaml', '');
    const cached = this.templateCache.get(templateId);

    // 使用缓存
    if (!force && cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.template;
    }

    try {
      // 统一使用fetch加载模板
      const response = await fetch(`${this.templateDir}/${fileName}`);
      if (!response.ok) {
        throw new TemplateLoadError(`加载模板失败: ${response.statusText}`, fileName);
      }
      const content = await response.text();
      
      // 使用js-yaml解析YAML
      const template = load(content) as Template;

      // 更新缓存
      this.templateCache.set(templateId, {
        template,
        timestamp: Date.now()
      });

      return template;
    } catch (error) {
      throw new TemplateLoadError(`加载模板失败: ${error.message}`, fileName);
    }
  }

  /**
   * 清除缓存
   */
  clearCache(templateId?: string): void {
    if (templateId) {
      this.templateCache.delete(templateId);
    } else {
      this.templateCache.clear();
    }
  }

  /**
   * 设置缓存超时时间
   */
  setCacheTimeout(timeout: number): void {
    this.cacheTimeout = timeout;
  }

  /**
   * 加载模板索引
   */
  private async loadTemplateIndex(): Promise<void> {
    try {
      const response = await fetch(`${this.templateDir}/_index.json`);
      if (!response.ok) {
        throw new Error(`加载模板索引失败: ${response.statusText}`);
      }
      const templateFiles = await response.json() as string[];

      // 验证默认模板是否存在
      if (!templateFiles.includes('optimize.yaml')) {
        throw new Error('默认模板 \'optimize\' 不存在');
      }
    } catch (error) {
      throw new Error(`加载模板索引失败: ${error.message}`);
    }
  }
}

// 导出单例实例
export const templateManager = new TemplateManager(); 