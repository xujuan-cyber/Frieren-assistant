import { IStorageProvider } from '../storage/types';
import { StorageFactory } from '../storage/factory';

/**
 * Supported built-in template languages
 */
export type BuiltinTemplateLanguage = 'zh-CN' | 'en-US';

/**
 * Simplified built-in template language service
 */
export class TemplateLanguageService {
  private readonly STORAGE_KEY = 'builtin-template-language';
  private readonly SUPPORTED_LANGUAGES: BuiltinTemplateLanguage[] = ['zh-CN', 'en-US'];
  private readonly DEFAULT_LANGUAGE: BuiltinTemplateLanguage = 'en-US';

  private currentLanguage: BuiltinTemplateLanguage = this.DEFAULT_LANGUAGE;
  private storage: IStorageProvider;
  private initialized = false;

  constructor(storage?: IStorageProvider) {
    this.storage = storage || StorageFactory.createDefault();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const savedLanguage = await this.storage.getItem(this.STORAGE_KEY);
      
      if (savedLanguage && this.isValidLanguage(savedLanguage)) {
        this.currentLanguage = savedLanguage as BuiltinTemplateLanguage;
      } else {
        // Auto-detect: Chinese browsers use Chinese, others use English
        const isChineseBrowser = navigator.language?.startsWith('zh') ?? false;
        this.currentLanguage = isChineseBrowser ? 'zh-CN' : 'en-US';
        await this.storage.setItem(this.STORAGE_KEY, this.currentLanguage);
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize template language service:', error);
      this.currentLanguage = this.DEFAULT_LANGUAGE;
      this.initialized = true;
    }
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): BuiltinTemplateLanguage {
    return this.currentLanguage;
  }

  /**
   * Set language
   */
  async setLanguage(language: BuiltinTemplateLanguage): Promise<void> {
    if (!this.isValidLanguage(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }

    this.currentLanguage = language;
    await this.storage.setItem(this.STORAGE_KEY, language);
  }

  /**
   * Toggle between Chinese and English
   */
  async toggleLanguage(): Promise<BuiltinTemplateLanguage> {
    const newLanguage = this.currentLanguage === 'zh-CN' ? 'en-US' : 'zh-CN';
    await this.setLanguage(newLanguage);
    return newLanguage;
  }

  /**
   * Check if language is valid
   */
  isValidLanguage(language: string): boolean {
    return this.SUPPORTED_LANGUAGES.includes(language as BuiltinTemplateLanguage);
  }

  /**
   * Get supported languages list
   */
  getSupportedLanguages(): BuiltinTemplateLanguage[] {
    return [...this.SUPPORTED_LANGUAGES];
  }

  /**
   * Get display name for a language
   */
  getLanguageDisplayName(language: BuiltinTemplateLanguage): string {
    switch (language) {
      case 'zh-CN':
        return '中文';
      case 'en-US':
        return 'English';
      default:
        return language;
    }
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const templateLanguageService = new TemplateLanguageService();
