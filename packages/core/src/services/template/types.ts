import { z } from 'zod';

/**
 * 提示词元数据
 */
export interface TemplateMetadata {
  version: string;          // 提示词版本
  lastModified: number;     // 最后修改时间
  author?: string;          // 作者（可选）
  description?: string;     // 描述（可选）
  templateType: 'optimize' | 'iterate'; // 新增类型标识
}

/**
 * 提示词定义
 */
export interface Template {
  id: string;              // 提示词唯一标识
  name: string;            // 提示词名称
  content: string;         // 提示词内容
  metadata: TemplateMetadata;
  isBuiltin?: boolean;     // 是否为内置提示词
}

/**
 * 提示词来源类型
 */
export type TemplateSourceType = 'builtin' | 'localStorage';

/**
 * 提示词管理器配置
 */
export interface TemplateManagerConfig {
  storageKey?: string;     // localStorage存储键名
  cacheTimeout?: number;   // 缓存超时时间
}

/**
 * 提示词管理器接口
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
  /** 根据类型获取提示词列表 */
  getTemplatesByType(type: 'optimize' | 'iterate'): Promise<Template[]>;
}

/**
 * 提示词验证Schema
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