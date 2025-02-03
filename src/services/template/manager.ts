import { load } from 'js-yaml';
import { ITemplateManager, Template, CachedTemplate } from './types';
import { TemplateError, TemplateLoadError } from './errors';
import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

/**
 * 模板管理器实现
 */
export class TemplateManager implements ITemplateManager {
  private templateDir: string;
  private defaultTemplate: string;
  private templateCache: Map<string, CachedTemplate>;
  private cacheTimeout: number;
  private initialized: boolean;
  private isNode: boolean;

  constructor() {
    this.templateDir = './src/prompts/templates';
    this.defaultTemplate = 'optimize';
    this.templateCache = new Map();
    this.cacheTimeout = 5000; // 5秒缓存
    this.initialized = false;
    // 检测是否为 Node 环境
    this.isNode = typeof process !== 'undefined' && 
      process.versions != null && 
      process.versions.node != null;
  }

  /**
   * 初始化模板管理器
   */
  async init(): Promise<void> {
    try {
      await this.loadTemplateIndex();
      this.initialized = true;
    } catch (error) {
      this.initialized = false;
      throw new TemplateError(`初始化失败: ${error.message}`);
    }
  }

  /**
   * 获取模板
   */
  async getTemplate(templateId: string = this.defaultTemplate): Promise<Template> {
    if (!this.initialized) {
      throw new TemplateError('模板管理器未初始化');
    }

    try {
      return await this.loadTemplate(`${templateId}.yaml`);
    } catch (error) {
      throw new TemplateLoadError(`加载模板失败: ${error.message}`, templateId);
    }
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
      let content: string;
      
      if (this.isNode) {
        // Node 环境：使用 fs 模块读取文件
        const filePath = join(process.cwd(), this.templateDir, fileName);
        content = await fs.readFile(filePath, 'utf-8');
      } else {
        // 浏览器环境：使用 fetch
        const response = await fetch(`${this.templateDir}/${fileName}`);
        if (!response.ok) {
          throw new TemplateLoadError(`加载模板失败: ${response.statusText}`, fileName);
        }
        content = await response.text();
      }
      
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
  private async loadTemplateIndex(): Promise<string[]> {
    try {
      let templateFiles: string[];
      
      if (this.isNode) {
        // Node 环境：使用 fs 模块读取文件
        const indexPath = join(process.cwd(), this.templateDir, '_index.json');
        const content = await fs.readFile(indexPath, 'utf-8');
        templateFiles = JSON.parse(content);
      } else {
        // 浏览器环境：使用 fetch
        const response = await fetch(`${this.templateDir}/_index.json`);
        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
        }
        templateFiles = await response.json();
      }

      if (!Array.isArray(templateFiles) || templateFiles.length === 0) {
        throw new Error('模板索引为空或无效');
      }

      // 验证默认模板是否存在
      if (!templateFiles.includes(`${this.defaultTemplate}.yaml`)) {
        throw new Error(`默认模板 '${this.defaultTemplate}' 不存在`);
      }

      return templateFiles;
    } catch (error) {
      throw new TemplateError(`加载模板索引失败: ${error.message}`);
    }
  }
}

// 导出单例实例
export const templateManager = new TemplateManager(); 