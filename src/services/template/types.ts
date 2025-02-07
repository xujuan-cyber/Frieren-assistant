import { z } from 'zod';

/**
 * 模板元数据
 */
export interface TemplateMetadata {
  version: string;          // 模板版本
  lastModified: number;     // 最后修改时间
  author?: string;          // 作者（可选）
  description?: string;     // 描述（可选）
  templateType: 'optimize' | 'iterate'; // 新增类型标识
}

/**
 * 模板定义
 */
export interface Template {
  id: string;              // 模板唯一标识
  name: string;            // 模板名称
  content: string;         // 模板内容
  metadata: TemplateMetadata;
  isBuiltin?: boolean;     // 是否为内置模板
}

/**
 * 模板来源类型
 */
export type TemplateSourceType = 'builtin' | 'localStorage';

/**
 * 模板管理器配置
 */
export interface TemplateManagerConfig {
  storageKey?: string;     // localStorage存储键名
  cacheTimeout?: number;   // 缓存超时时间
}

/**
 * 模板管理器接口
 */
export interface ITemplateManager {
  init(): Promise<void>;
  getTemplate(templateId: string): Promise<Template>;
  saveTemplate(template: Template): Promise<void>;
  deleteTemplate(templateId: string): Promise<void>;
  listTemplates(): Promise<Template[]>;
  exportTemplate(templateId: string): string;
  importTemplate(templateJson: string): Promise<void>;
  clearCache(templateId?: string): void;
}

/**
 * 模板验证Schema
 */
export const templateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  content: z.string().min(1),
  metadata: z.object({
    version: z.string(),
    lastModified: z.number(),
    author: z.string().optional(),
    description: z.string().optional(),
    templateType: z.enum(['optimize', 'iterate'])
  }),
  isBuiltin: z.boolean().optional()
});

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