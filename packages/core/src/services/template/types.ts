import { z } from 'zod';

/**
 * 提示词元数据
 */
export interface TemplateMetadata {
  version: string;          // 提示词版本
  lastModified: number;     // 最后修改时间
  author?: string;          // 作者（可选）
  description?: string;     // 描述（可选）
  templateType: 'optimize' | 'userOptimize' | 'iterate'; // 模板类型标识
  language?: 'zh' | 'en';   // 模板语言（可选，主要用于内置模板语言切换）
  [key: string]: any;       // 允许任意额外字段
}

/**
 * 消息模板定义
 */
export interface MessageTemplate {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 提示词定义
 */
export interface Template {
  id: string;              // 提示词唯一标识
  name: string;            // 提示词名称
  content: string | MessageTemplate[];         // 提示词内容 - 支持字符串或消息数组
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
  /** 确保管理器已初始化 */
  ensureInitialized(): Promise<void>;

  /** 获取指定ID的模板 */
  getTemplate(templateId: string): Template; // Stays synchronous

  /** 保存模板 */
  saveTemplate(template: Template): Promise<void>; // Async

  /** 删除模板 */
  deleteTemplate(templateId: string): Promise<void>; // Async

  /** 列出所有模板 */
  listTemplates(): Template[]; // Stays synchronous

  /** 导出模板 */
  exportTemplate(templateId: string): string; // Stays synchronous

  /** 导入模板 */
  importTemplate(templateJson: string): Promise<void>; // Async

  /** 清除缓存 */
  clearCache(templateId?: string): void; // Synchronous
  
  /** 按类型列出模板 */
  listTemplatesByType(type: 'optimize' | 'userOptimize' | 'iterate'): Template[];

  /**
   * 根据类型获取模板列表（已废弃）
   * @deprecated 使用 listTemplatesByType 替代
   */
  getTemplatesByType(type: 'optimize' | 'userOptimize' | 'iterate'): Template[];
}

/**
 * 消息模板验证Schema
 */
export const messageTemplateSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1)
});

/**
 * 提示词验证Schema
 */
export const templateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  content: z.union([
    z.string().min(1),
    z.array(messageTemplateSchema).min(1)
  ]),
  metadata: z.object({
    version: z.string(),
    lastModified: z.number(),
    author: z.string().optional(),
    description: z.string().optional(),
    templateType: z.enum(['optimize', 'userOptimize', 'iterate']),
    language: z.enum(['zh', 'en']).optional()
  }).passthrough(), // 允许额外字段通过验证
  isBuiltin: z.boolean().optional()
});