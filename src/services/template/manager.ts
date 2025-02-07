import { ITemplateManager, Template, TemplateManagerConfig, templateSchema } from './types';
import { DEFAULT_TEMPLATES } from './defaults';
import { TemplateError, TemplateValidationError, TemplateStorageError } from './errors';

/**
 * 模板管理器实现
 */
export class TemplateManager implements ITemplateManager {
  private readonly builtinTemplates: Map<string, Template>;
  private readonly userTemplates: Map<string, Template>;
  private readonly config: Required<TemplateManagerConfig>;

  constructor(config?: TemplateManagerConfig) {
    this.builtinTemplates = new Map();
    this.userTemplates = new Map();
    this.config = {
      storageKey: 'app:templates',
      cacheTimeout: 5 * 60 * 1000,
      ...config
    };
  }

  /**
   * 初始化模板管理器
   */
  async init(): Promise<void> {
    try {
      // 需要先清空已有模板避免重复加载
      this.builtinTemplates.clear();
      this.userTemplates.clear();

      // 加载内置模板需要深拷贝避免引用问题
      for (const [id, template] of Object.entries(DEFAULT_TEMPLATES)) {
        this.builtinTemplates.set(id, JSON.parse(JSON.stringify({
          ...template,
          isBuiltin: true
        })));
      }

      // 增加加载后的验证
      if (this.builtinTemplates.size === 0) {
        throw new TemplateError('内置模板加载失败');
      }

      await this.loadUserTemplates();
    } catch (error) {
      throw new TemplateError(`初始化失败: ${error.message}`);
    }
  }

  /**
   * 获取模板
   */
  async getTemplate(templateId: string): Promise<Template> {
    // 增加空值校验
    if (!templateId || typeof templateId !== 'string') {
      throw new TemplateError('无效的模板ID');
    }

    // 优先检查用户模板
    const template = this.userTemplates.get(templateId) || 
                    this.builtinTemplates.get(templateId);
    
    if (!template) {
      // 增加调试信息
      console.debug('可用模板:', [...this.builtinTemplates.keys(), ...this.userTemplates.keys()]);
      throw new TemplateError(`模板 ${templateId} 不存在`);
    }
    
    // 返回深拷贝避免外部修改
    return JSON.parse(JSON.stringify(template));
  }

  /**
   * 保存用户模板
   */
  async saveTemplate(template: Template): Promise<void> {
    // 增加类型校验
    if (!['optimize', 'iterate'].includes(template.metadata.templateType)) {
      throw new TemplateValidationError('无效的模板类型');
    }

    // 增加ID格式校验
    if (!/^[a-zA-Z0-9_-]{3,50}$/.test(template.id)) {
      throw new TemplateValidationError('模板ID格式无效（3-50位字母数字）');
    }

    // 保留原始模板的不可变属性
    if (this.userTemplates.has(template.id)) {
      const original = this.userTemplates.get(template.id)!;
      template = {
        ...original,
        ...template,
        metadata: {
          ...original.metadata,
          ...template.metadata,
          lastModified: Date.now()
        }
      };
    }

    // 验证模板
    const result = templateSchema.safeParse(template);
    if (!result.success) {
      throw new TemplateValidationError(`模板验证失败: ${result.error.message}`);
    }
      
    // 不允许覆盖内置模板
    if (this.builtinTemplates.has(template.id)) {
      throw new TemplateError(`不能覆盖内置模板: ${template.id}`);
    }

    // 只在没有时间戳时设置
    if (!template.metadata.lastModified) {
      template.metadata.lastModified = Date.now();
    }
    
    // 保存模板
    this.userTemplates.set(template.id, { ...template, isBuiltin: false });
    await this.persistUserTemplates();
  }

  /**
   * 删除用户模板
   */
  async deleteTemplate(templateId: string): Promise<void> {
    if (this.builtinTemplates.has(templateId)) {
      throw new TemplateError(`不能删除内置模板: ${templateId}`);
    }

    if (!this.userTemplates.has(templateId)) {
      throw new TemplateError(`模板不存在: ${templateId}`);
    }

    this.userTemplates.delete(templateId);
    await this.persistUserTemplates();
  }

  /**
   * 列出所有模板
   */
  async listTemplates(): Promise<Template[]> {
    const templates = [
      ...Array.from(this.builtinTemplates.values()),
      ...Array.from(this.userTemplates.values())
    ];
    
    return templates.sort((a, b) => {
      // 内置模板排在前面
      if (a.isBuiltin !== b.isBuiltin) {
        return a.isBuiltin ? -1 : 1;
      }
      
      // 非内置模板按时间戳倒序
      if (!a.isBuiltin && !b.isBuiltin) {
        const timeA = a.metadata.lastModified || 0;
        const timeB = b.metadata.lastModified || 0;
        return timeB - timeA;
      }
      
      return 0;
    });
  }

  /**
   * 导出模板
   */
  exportTemplate(templateId: string): string {
    const template = this.userTemplates.get(templateId) || 
                    this.builtinTemplates.get(templateId);
    if (!template) {
      throw new TemplateError(`模板不存在: ${templateId}`);
    }
    return JSON.stringify(template, null, 2);
  }

  /**
   * 导入模板
   */
  async importTemplate(templateJson: string): Promise<void> {
    try {
      const template = JSON.parse(templateJson) as Template;
      const result = templateSchema.safeParse(template);
      if (!result.success) {
        throw new TemplateValidationError(`模板验证失败: ${result.error.message}`);
      }
      await this.saveTemplate(template);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new TemplateValidationError('模板格式无效');
      }
      if (error instanceof TemplateValidationError) {
        throw error;
      }
      throw new TemplateError(`导入模板失败: ${error.message}`);
    }
  }

  /**
   * 清除缓存
   */
  clearCache(templateId?: string): void {
    if (templateId) {
      this.userTemplates.delete(templateId);
    } else {
      this.userTemplates.clear();
    }
  }

  /**
   * 验证模板
   */
  private async validateTemplate(template: Template): Promise<void> {
    const result = templateSchema.safeParse(template);
    if (!result.success) {
      throw new TemplateValidationError(`模板验证失败: ${result.error.message}`);
    }
  }

  /**
   * 持久化用户模板
   */
  private async persistUserTemplates(): Promise<void> {
    try {
      const templates = Array.from(this.userTemplates.values());
      localStorage.setItem(this.config.storageKey, JSON.stringify(templates));
    } catch (error) {
      throw new TemplateError(`保存模板失败: ${error.message}`);
    }
  }

  /**
   * 加载用户模板
   */
  private async loadUserTemplates(): Promise<void> {
    try {
      const data = localStorage.getItem(this.config.storageKey);
      if (data) {
        const templates = JSON.parse(data) as Template[];
        templates.forEach(template => {
          this.userTemplates.set(template.id, { ...template, isBuiltin: false });
        });
      }
    } catch (error) {
      throw new TemplateError(`加载用户模板失败: ${error.message}`);
    }
  }

  /**
   * 按类型列出模板
   */
  listTemplatesByType(type: 'optimize' | 'iterate'): Template[] {
    return [...this.builtinTemplates.values(), ...this.userTemplates.values()].filter(
      template => template.metadata.templateType === type
    );
  }
}

// 导出单例实例
export const templateManager = new TemplateManager();

// 初始化模板管理器
templateManager.init().catch(error => {
  console.error('模板管理器初始化失败:', error);
}); 