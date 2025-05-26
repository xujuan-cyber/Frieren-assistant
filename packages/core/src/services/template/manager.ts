import { ITemplateManager, Template, TemplateManagerConfig } from './types';
import { IStorageProvider } from '../storage/types';
import { StorageFactory } from '../storage/factory';
import { DEFAULT_TEMPLATES } from './defaults';
import { TemplateError, TemplateValidationError } from './errors';
import { templateSchema } from './types';

/**
 * 提示词管理器实现
 */
export class TemplateManager implements ITemplateManager {
  private readonly builtinTemplates: Map<string, Template>;
  private readonly userTemplates: Map<string, Template>;
  private readonly config: Required<TemplateManagerConfig>;

  constructor(private storageProvider: IStorageProvider, config?: TemplateManagerConfig) {
    // Default configuration
    this.config = {
      storageKey: 'app:templates',
      cacheTimeout: 5 * 60 * 1000, // Default cache timeout: 5 minutes
      ...config
    };

    // Initialize template maps
    this.builtinTemplates = new Map();
    this.userTemplates = new Map();

    // Load built-in templates
    for (const [id, template] of Object.entries(DEFAULT_TEMPLATES)) {
      this.builtinTemplates.set(id, { ...template, isBuiltin: true });
    }

    // Initialize asynchronously - load user templates
    this.init().catch(error => {
      console.error('Template manager initialization failed:', error);
    });
  }

  private async init(): Promise<void> {
    try {
      await this.loadUserTemplates();
    } catch (error) {
      console.error('Template manager initialization failed:', error);
    }
  }

  private validateTemplateSchema(template: Partial<Template>): void {
    const result = templateSchema.safeParse(template);
    if (!result.success) {
      const errors = result.error.format();
      throw new TemplateValidationError(
        'Template validation failed: ' + Object.keys(errors)
          .filter(key => key !== '_errors')
          .map(() => 'Required')
          .join(', ')
      );
    }
  }

  /**
   * Validates template type
   * @param type Template type
   */
  private validateTemplateType(type: string): void {
    const validTypes = ['optimize', 'iterate'];
    if (!validTypes.includes(type)) {
      throw new TemplateValidationError('Invalid template type');
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
   * @returns Template
   */
  getTemplate(id: string | null | undefined): Template {
    this.validateTemplateId(id);
    
    // Check built-in templates first
    if (this.builtinTemplates.has(id!)) {
      return this.builtinTemplates.get(id!)!;
    }
    
    // Check user templates
    if (this.userTemplates.has(id!)) {
      return this.userTemplates.get(id!)!;
    }
    
    // If we get here, the template wasn't found
    const available = [...this.builtinTemplates.keys(), ...this.userTemplates.keys()];
    throw new TemplateError(`Template ${id} not found, available templates: ${JSON.stringify(available, null, 2)}`);
  }

  /**
   * Saves a template
   * @param template Template to save
   * @returns Promise<void>
   */
  async saveTemplate(template: Template): Promise<void> {
    // Validate ID
    this.validateTemplateId(template.id);
    
    // Validate template type
    if (template.metadata?.templateType) {
      this.validateTemplateType(template.metadata.templateType);
    }
    
    // Prevent overwriting built-in templates
    if (this.builtinTemplates.has(template.id)) {
      throw new TemplateError(`Cannot overwrite built-in template: ${template.id}`);
    }
    
    // Validate schema
    this.validateTemplateSchema(template);
    
    // Set isBuiltin to false and add timestamp
    const templateToSave: Template = {
      ...template,
      isBuiltin: false,
      metadata: {
        ...template.metadata,
        lastModified: Date.now()
      }
    };
    
    // Add to user templates
    this.userTemplates.set(template.id, templateToSave);
    
    // Persist
    await this.persistUserTemplates();
  }

  /**
   * Deletes a template
   * @param id Template ID
   */
  async deleteTemplate(id: string): Promise<void> {
    // Validate ID
    this.validateTemplateId(id);
    
    // Check if it's a built-in template
    if (this.builtinTemplates.has(id)) {
      throw new TemplateError(`Cannot delete built-in template: ${id}`);
    }
    
    // Check if the template exists
    if (!this.userTemplates.has(id)) {
      throw new TemplateError(`Template not found: ${id}`);
    }
    
    // Delete from user templates
    this.userTemplates.delete(id);
    
    // Persist
    await this.persistUserTemplates();
  }

  /**
   * List all templates
   */
  listTemplates(): Template[] {
    const templates = [
      ...Array.from(this.builtinTemplates.values()),
      ...Array.from(this.userTemplates.values())
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
  exportTemplate(id: string): string {
    const template = this.getTemplate(id);
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
   * Clear cache
   */
  clearCache(templateId?: string): void {
    if (templateId) {
      this.userTemplates.delete(templateId);
    } else {
      this.userTemplates.clear();
    }
  }

  /**
   * Saves user templates to storage
   */
  private async persistUserTemplates(): Promise<void> {
    try {
      const templates = Array.from(this.userTemplates.values());
      await this.storageProvider.setItem(
        this.config.storageKey,
        JSON.stringify(templates)
      );
    } catch (error) {
      throw new TemplateError(`Failed to save user templates: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Loads user templates from storage
   */
  private async loadUserTemplates(): Promise<void> {
    try {
      const data = await this.storageProvider.getItem(this.config.storageKey);
      if (!data) return;
      
      const templates = JSON.parse(data) as Template[];
      
      // Add each template to the map
      templates.forEach(template => {
        // Ensure isBuiltin is set to false for loaded templates
        this.userTemplates.set(template.id, {
          ...template,
          isBuiltin: false
        });
      });
    } catch (error) {
      throw new TemplateError(`Failed to load user templates: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get templates by type
   * @deprecated Use listTemplatesByType instead
   */
  getTemplatesByType(type: 'optimize' | 'iterate'): Template[] {
    return this.listTemplatesByType(type);
  }

  /**
   * List templates by type
   */
  listTemplatesByType(type: 'optimize' | 'iterate'): Template[] {
    try {
      return this.listTemplates().filter(
        template => template.metadata.templateType === type
      );
    } catch (error) {
      console.error(`Failed to get ${type} template list:`, error);
      return [];
    }
  }
}

// Export singleton instance
export const templateManager = new TemplateManager(StorageFactory.createDefault());