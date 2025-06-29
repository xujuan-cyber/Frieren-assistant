import { ITemplateManager, Template, TemplateManagerConfig } from './types';
import { IStorageProvider } from '../storage/types';
import { StaticLoader } from './static-loader';
import { TemplateError, TemplateValidationError } from './errors';
import { templateSchema } from './types';
import { TemplateLanguageService, BuiltinTemplateLanguage } from './languageService';



/**
 * 提示词管理器实现
 */
export class TemplateManager implements ITemplateManager {
  private readonly config: Required<TemplateManagerConfig>;
  private readonly staticLoader: StaticLoader;

  constructor(
    private storageProvider: IStorageProvider,
    private languageService: TemplateLanguageService,
    config?: TemplateManagerConfig
  ) {
    this.config = {
      storageKey: config?.storageKey || 'user-templates',
      cacheTimeout: config?.cacheTimeout || 5 * 60 * 1000,
    };
    this.staticLoader = new StaticLoader();
  }

  private validateTemplateSchema(template: Partial<Template>): void {
    const result = templateSchema.safeParse(template);
    if (!result.success) {
      const errorDetails = result.error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');
      throw new TemplateValidationError(
        'Template validation failed: ' + errorDetails
      );
    }
  }

  /**
   * Validates template ID
   * @param id Template ID
   */
  private validateTemplateId(id: string | null | undefined): void {
    if (!id) {
      throw new TemplateError('Invalid template ID');
    }
    
    // Minimum 3 characters, only letters, numbers, and hyphens
    const idRegex = /^[a-z0-9-]{3,}$/;
    if (!idRegex.test(id)) {
      throw new TemplateValidationError('Invalid template ID format: must be at least 3 characters, using only lowercase letters, numbers, and hyphens');
    }
  }

  /**
   * Gets a template by ID
   * @param id Template ID
   * @returns Template or null if not found
   */
  async getTemplate(id: string | null | undefined): Promise<Template> {
    this.validateTemplateId(id);

    // Check built-in templates first
    const builtinTemplates = await this.getBuiltinTemplates();
    const builtinTemplate = builtinTemplates[id!];
    if (builtinTemplate) {
      return builtinTemplate;
    }

    // Check user templates
    const userTemplates = await this.getUserTemplates();
    const userTemplate = userTemplates.find(t => t.id === id);
    if (userTemplate) {
      return userTemplate;
    }
    
    throw new TemplateError(`Template ${id} not found`);
  }

  /**
   * Saves a template
   * @param template Template to save
   */
  async saveTemplate(template: Template): Promise<void> {
    this.validateTemplateSchema(template);
    this.validateTemplateId(template.id);

    // Don't allow saving built-in templates
    if (template.isBuiltin) {
      throw new TemplateError('Cannot save built-in template');
    }

    // Check if template ID conflicts with built-in templates
    const builtinTemplates = await this.getBuiltinTemplates();
    if (builtinTemplates[template.id]) {
      throw new TemplateError(`Cannot overwrite built-in template: ${template.id}`);
    }

    // Set template as non-built-in
    template.isBuiltin = false;
    
    // Set timestamp
    template.metadata.lastModified = Date.now();

    // Get current user templates
    const userTemplates = await this.getUserTemplates();
    
    // Update or add the template
    const existingIndex = userTemplates.findIndex(t => t.id === template.id);
    if (existingIndex >= 0) {
      userTemplates[existingIndex] = template;
    } else {
      userTemplates.push(template);
    }
    
    // Save to storage
    await this.persistUserTemplates(userTemplates);
  }

  /**
   * Deletes a template
   * @param id Template ID
   */
  async deleteTemplate(id: string): Promise<void> {
    this.validateTemplateId(id);
    
    // Check if template is built-in
    const builtinTemplates = await this.getBuiltinTemplates();
    if (builtinTemplates[id]) {
      throw new TemplateError(`Cannot delete built-in template: ${id}`);
    }
    
    // Get current user templates
    const userTemplates = await this.getUserTemplates();
    
    // Remove the template
    const filteredTemplates = userTemplates.filter(t => t.id !== id);
    
    // Save to storage
    await this.persistUserTemplates(filteredTemplates);
  }

  /**
   * Lists all templates
   * @returns Array of templates
   */
  async listTemplates(): Promise<Template[]> {
    const [builtinTemplates, userTemplates] = await Promise.all([
      this.getBuiltinTemplates(),
      this.getUserTemplates()
    ]);

    const templates = [
      ...Object.values(builtinTemplates),
      ...userTemplates
    ];

    return templates.sort((a, b) => {
      // Built-in templates come first
      if (a.isBuiltin !== b.isBuiltin) {
        return a.isBuiltin ? -1 : 1;
      }

      // Non-built-in templates sorted by timestamp descending
      if (!a.isBuiltin && !b.isBuiltin) {
        const timeA = a.metadata.lastModified || 0;
        const timeB = b.metadata.lastModified || 0;
        return timeB - timeA;
      }

      return 0;
    });
  }

  /**
   * Exports a template as a JSON string
   * @param id Template ID
   * @returns Template as JSON string
   */
  async exportTemplate(id: string): Promise<string> {
    const template = await this.getTemplate(id);
    return JSON.stringify(template, null, 2);
  }

  /**
   * Imports a template from a JSON string
   * @param jsonString Template as JSON string
   * @returns Promise<void>
   */
  async importTemplate(jsonString: string): Promise<void> {
    try {
      const template = JSON.parse(jsonString);
      
      // Validate schema
      this.validateTemplateSchema(template);
      
      // Save template
      await this.saveTemplate(template);
    } catch (error) {
      if (error instanceof TemplateError || error instanceof TemplateValidationError) {
        throw error;
      }
      throw new TemplateError(`Failed to import template: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get built-in templates based on current language setting
   */
  private async getBuiltinTemplates(): Promise<Record<string, Template>> {
    // Get current language from template language service
    const currentLanguage = this.languageService.getCurrentLanguage();
    
    // Get appropriate template set based on language
    const templateSet = await this.getTemplateSet(currentLanguage);
    
    // Mark all templates as built-in
    const builtinTemplates: Record<string, Template> = {};
    for (const [id, template] of Object.entries(templateSet)) {
      builtinTemplates[id] = { ...template, isBuiltin: true };
    }
    
    return builtinTemplates;
  }

  /**
   * Load user templates from storage
   */
  private async getUserTemplates(): Promise<Template[]> {
    try {
      const data = await this.storageProvider.getItem(this.config.storageKey);
      if (!data) return [];
      
      const templates = JSON.parse(data) as Template[];
      
      // Ensure isBuiltin is set to false for loaded templates
      return templates.map(template => ({
        ...template,
        isBuiltin: false
      }));
    } catch (error) {
      throw new TemplateError(`Failed to load user templates: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Saves user templates to storage
   */
  private async persistUserTemplates(templates: Template[]): Promise<void> {
    try {
      await this.storageProvider.setItem(
        this.config.storageKey,
        JSON.stringify(templates)
      );
    } catch (error) {
      throw new TemplateError(`Failed to save user templates: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get template set for the specified language
   * This method provides better extensibility for adding new languages
   */
  private async getTemplateSet(language: BuiltinTemplateLanguage): Promise<Record<string, Template>> {
    switch (language) {
      case 'en-US':
        return this.staticLoader.getDefaultTemplatesEn();
      case 'zh-CN':
        return this.staticLoader.getDefaultTemplates();
      default:
        console.warn(`Unsupported language: ${language}, falling back to Chinese templates`);
        return this.staticLoader.getDefaultTemplates();
    }
  }

  /**
   * Get templates by type
   * @deprecated Use listTemplatesByType instead
   */
  async getTemplatesByType(type: 'optimize' | 'iterate'): Promise<Template[]> {
    return await this.listTemplatesByType(type);
  }

  /**
   * List templates by type
   */
  async listTemplatesByType(type: 'optimize' | 'userOptimize' | 'iterate'): Promise<Template[]> {
    try {
      const templates = await this.listTemplates();
      return templates.filter(
        template => template.metadata.templateType === type
      );
    } catch (error) {
      console.error(`Failed to get ${type} template list:`, error);
      return [];
    }
  }

  /**
   * Change built-in template language
   */
  async changeBuiltinTemplateLanguage(language: BuiltinTemplateLanguage): Promise<void> {
    await this.languageService.setLanguage(language);
  }

  /**
   * Get current built-in template language
   */
  getCurrentBuiltinTemplateLanguage(): BuiltinTemplateLanguage {
    return this.languageService.getCurrentLanguage();
  }

  /**
   * Get supported built-in template languages
   */
  getSupportedBuiltinTemplateLanguages(): BuiltinTemplateLanguage[] {
    return this.languageService.getSupportedLanguages();
  }
}

/**
 * 创建模板管理器的工厂函数
 * @param storageProvider 存储提供器实例
 * @param languageService 模板语言服务实例
 * @returns 模板管理器实例
 */
export function createTemplateManager(
  storageProvider: IStorageProvider,
  languageService: TemplateLanguageService
): TemplateManager {
  return new TemplateManager(storageProvider, languageService);
}