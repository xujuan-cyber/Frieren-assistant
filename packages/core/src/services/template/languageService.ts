import { IStorageProvider } from '../storage/types';

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

  constructor(storage: IStorageProvider) {
    this.storage = storage;
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
        let detectedLanguage: BuiltinTemplateLanguage = this.DEFAULT_LANGUAGE;
        
        // Auto-detect only in browser-like environments where `navigator` is available.
        if (typeof navigator !== 'undefined' && navigator.language) {
          const isChineseBrowser = navigator.language.startsWith('zh');
          detectedLanguage = isChineseBrowser ? 'zh-CN' : 'en-US';
        }
        
        this.currentLanguage = detectedLanguage;
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
    return ['zh-CN', 'en-US'];
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

/**
 * 创建模板语言服务实例的工厂函数
 * @param storageProvider 存储提供器实例
 * @returns 模板语言服务实例
 */
export function createTemplateLanguageService(storageProvider: IStorageProvider): TemplateLanguageService {
  return new TemplateLanguageService(storageProvider);
}
