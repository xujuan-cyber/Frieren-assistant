/**
 * 模板接口
 */
export interface Template {
  /** 模板ID */
  id?: string;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 模板内容 */
  template: string;
  /** 模板版本 */
  version?: string;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 缓存的模板接口
 */
export interface CachedTemplate {
  /** 模板内容 */
  template: Template;
  /** 缓存时间戳 */
  timestamp: number;
}

/**
 * 模板管理器接口
 */
export interface ITemplateManager {
  /** 获取模板 */
  getTemplate(templateId: string): Promise<Template>;
  /** 加载模板 */
  loadTemplate(fileName: string, force?: boolean): Promise<Template>;
  /** 清除缓存 */
  clearCache(templateId?: string): void;
  /** 设置缓存超时时间 */
  setCacheTimeout(timeout: number): void;
}

export class TemplateValidationError extends Error {
  constructor(message: string, public templateId: string, public errors: string[] = []) {
    super(message);
    this.name = 'TemplateValidationError';
  }
}

export class TemplateLoadError extends Error {
  constructor(message: string, public templateId: string) {
    super(message);
    this.name = 'TemplateLoadError';
  }
} 