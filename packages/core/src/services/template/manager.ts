import { ITemplateManager, Template, TemplateManagerConfig } from './types';
import { IStorageProvider } from '../storage/types';
import { StorageFactory } from '../storage/factory';
import { StaticLoader } from './static-loader';
import { TemplateError, TemplateValidationError } from './errors';
import { templateSchema } from './types';
import { templateLanguageService, BuiltinTemplateLanguage } from './languageService';



/**
 * 提示词管理器实现
 */
export class TemplateManager implements ITemplateManager {
  private readonly builtinTemplates: Map<string, Template>;
  private readonly userTemplates: Map<string, Template>;
  private readonly config: Required<TemplateManagerConfig>;
  private readonly staticLoader: StaticLoader;
  private initPromise: Promise<void> | null = null;
  protected initialized = false;

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
    
    // Initialize static loader
    this.staticLoader = new StaticLoader();

    // Initialize asynchronously with improved error handling
    this.initPromise = this.init().catch(error => {
      console.error('Template manager initialization failed:', error);
      // Don't rethrow - allow fallback initialization
      return this.fallbackInit();
    });
  }

  private async init(): Promise<void> {
    try {
      // Initialize template language service first
      await templateLanguageService.initialize();

      // Load built-in templates based on current language
      await this.loadBuiltinTemplates();

      // Load user templates
      await this.loadUserTemplates();

      this.initialized = true;
    } catch (error) {
      console.error('Template manager initialization failed:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Fallback initialization with default templates
   */
  private async fallbackInit(): Promise<void> {
    try {
      console.log('Attempting fallback initialization with default templates');
      
      // Clear any partially loaded templates
      this.builtinTemplates.clear();
      
      // Load default Chinese templates as fallback
      const defaultTemplates = this.staticLoader.getDefaultTemplates();
      for (const [id, template] of Object.entries(defaultTemplates)) {
        this.builtinTemplates.set(id, { ...template, isBuiltin: true });
      }
      
      // Try to load user templates (non-critical)
      try {
        await this.loadUserTemplates();
      } catch (userTemplateError) {
        console.warn('Failed to load user templates during fallback:', userTemplateError);
      }
      
      this.initialized = true;
      console.log('Fallback initialization completed');
    } catch (fallbackError) {
      console.error('Fallback initialization also failed:', fallbackError);
      this.initialized = false;
      throw fallbackError;
    }
  }

  /**
   * Ensure the template manager is initialized
   * This should be called before any template operations
   */
  async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!this.initPromise) {
      this.initPromise = this.init();
    }

    try {
      await this.initPromise;
    } catch (error) {
      // Reset initPromise to allow retry
      this.initPromise = null;
      // If initialization still fails, at least ensure we have some templates
      if (!this.initialized) {
        console.error('Initialization failed, attempting emergency fallback');
        await this.fallbackInit();
      }
    }
  }

  /**
   * Check if the template manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Private method to check initialization state for sync methods
   */
  private checkInitialized(methodName: string): void {
    if (!this.initialized) {
      throw new TemplateError(`Template manager not initialized. Call ensureInitialized() first before using ${methodName}.`);
    }
  }

  /**
   * Private method to ensure initialization for async methods
   */
  private async ensureInitForAsyncMethod(): Promise<void> {
    await this.ensureInitialized();
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
   * Validates template type
   * @param type Template type
   */
  private validateTemplateType(type: string): void {
    const validTypes = ['optimize', 'userOptimize', 'iterate'];
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
  /**
   * Gets a template by ID
   * @param id Template ID
   * @returns Template
   */
  getTemplate(id: string | null | undefined): Template {
    this.checkInitialized('getTemplate');
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
    await this.ensureInitForAsyncMethod();

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
    await this.ensureInitForAsyncMethod();

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
    this.checkInitialized('listTemplates');

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
   * Load built-in templates based on current language setting
   */
  private async loadBuiltinTemplates(): Promise<void> {
    try {
      // Clear existing built-in templates
      this.builtinTemplates.clear();

      // Get current language from template language service
      const currentLanguage = templateLanguageService.getCurrentLanguage();

      // Load appropriate template set based on language
      const templateSet = await this.getTemplateSet(currentLanguage);

      // Load templates from selected set
      for (const [id, template] of Object.entries(templateSet)) {
        this.builtinTemplates.set(id, { ...template, isBuiltin: true });
      }

      console.log(`Loaded built-in templates in ${currentLanguage} (${this.builtinTemplates.size} templates)`);
    } catch (error) {
      console.error('Failed to load built-in templates:', error);
      // Fallback to Chinese templates
      const defaultTemplates = this.staticLoader.getDefaultTemplates();
      for (const [id, template] of Object.entries(defaultTemplates)) {
        this.builtinTemplates.set(id, { ...template, isBuiltin: true });
      }
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
   * Reload built-in templates with new language
   * This method can be called when user changes built-in template language
   */
  async reloadBuiltinTemplates(): Promise<void> {
    await this.loadBuiltinTemplates();
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
  listTemplatesByType(type: 'optimize' | 'userOptimize' | 'iterate'): Template[] {
    try {
      return this.listTemplates().filter(
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
    try {
      // Update language service
      await templateLanguageService.setLanguage(language);

      // Reload built-in templates with new language
      await this.reloadBuiltinTemplates();

      console.log(`Changed built-in template language to ${language}`);
    } catch (error) {
      console.error('Failed to change built-in template language:', error);
      throw error;
    }
  }

  /**
   * Get current built-in template language
   */
  getCurrentBuiltinTemplateLanguage(): BuiltinTemplateLanguage {
    return templateLanguageService.getCurrentLanguage();
  }

  /**
   * Get supported built-in template languages
   */
  getSupportedBuiltinTemplateLanguages(): BuiltinTemplateLanguage[] {
    return templateLanguageService.getSupportedLanguages();
  }
}

// Export singleton instance
export const templateManager = new TemplateManager(StorageFactory.createDefault());