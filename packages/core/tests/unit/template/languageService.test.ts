import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateLanguageService } from '../../../src/services/template/languageService';
import { createMockStorage } from '../../mocks/mockStorage';

describe('TemplateLanguageService', () => {
  let service: TemplateLanguageService;
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    // Mock navigator.language to English for consistent test environment
    Object.defineProperty(navigator, 'language', {
      value: 'en-US',
      configurable: true
    });
    
    mockStorage = createMockStorage();
    service = new TemplateLanguageService(mockStorage);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default language when no saved preference', async () => {
      mockStorage.getItem.mockResolvedValue(null);
      
      await service.initialize();
      
      expect(service.getCurrentLanguage()).toBe('en-US');
      expect(service.isInitialized()).toBe(true);
    });

    it('should load saved language preference', async () => {
      mockStorage.getItem.mockResolvedValue('en-US');
      
      await service.initialize();
      
      expect(service.getCurrentLanguage()).toBe('en-US');
      expect(mockStorage.getItem).toHaveBeenCalledWith('builtin-template-language');
    });

    it('should fallback to default language on invalid saved preference', async () => {
      mockStorage.getItem.mockResolvedValue('invalid-lang');
      
      await service.initialize();
      
      expect(service.getCurrentLanguage()).toBe('en-US');
    });

    it('should handle storage errors gracefully', async () => {
      mockStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      await service.initialize();
      
      expect(service.getCurrentLanguage()).toBe('en-US');
      expect(service.isInitialized()).toBe(true);
    });
  });

  describe('language management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should set language successfully', async () => {
      await service.setLanguage('en-US');
      
      expect(service.getCurrentLanguage()).toBe('en-US');
      expect(mockStorage.setItem).toHaveBeenCalledWith('builtin-template-language', 'en-US');
    });

    it('should reject invalid language', async () => {
      await expect(service.setLanguage('invalid-lang' as any)).rejects.toThrow(
        'Unsupported language: invalid-lang'
      );
    });

    it('should toggle between languages', async () => {
      // Start with detected language (en-US in test environment)
      expect(service.getCurrentLanguage()).toBe('en-US');
      
      // Toggle to Chinese
      const newLang1 = await service.toggleLanguage();
      expect(newLang1).toBe('zh-CN');
      expect(service.getCurrentLanguage()).toBe('zh-CN');
      
      // Toggle back to English
      const newLang2 = await service.toggleLanguage();
      expect(newLang2).toBe('en-US');
      expect(service.getCurrentLanguage()).toBe('en-US');
    });
  });

  describe('utility methods', () => {
    it('should validate languages correctly', () => {
      expect(service.isValidLanguage('zh-CN')).toBe(true);
      expect(service.isValidLanguage('en-US')).toBe(true);
      expect(service.isValidLanguage('fr-FR')).toBe(false);
      expect(service.isValidLanguage('')).toBe(false);
    });
  });

  describe('browser language detection', () => {
    it('should detect Chinese browser language', async () => {
      // Mock navigator.language
      Object.defineProperty(navigator, 'language', {
        value: 'zh-CN',
        configurable: true
      });
      
      mockStorage.getItem.mockResolvedValue(null);
      const newService = new TemplateLanguageService(mockStorage);
      await newService.initialize();
      
      expect(newService.getCurrentLanguage()).toBe('zh-CN');
    });

    it('should detect English browser language', async () => {
      // Mock navigator.language
      Object.defineProperty(navigator, 'language', {
        value: 'en-US',
        configurable: true
      });
      
      mockStorage.getItem.mockResolvedValue(null);
      const newService = new TemplateLanguageService(mockStorage);
      await newService.initialize();
      
      expect(newService.getCurrentLanguage()).toBe('en-US');
    });

    it('should default to English for unsupported browser languages', async () => {
      // Mock navigator.language
      Object.defineProperty(navigator, 'language', {
        value: 'fr-FR',
        configurable: true
      });

      mockStorage.getItem.mockResolvedValue(null);
      const newService = new TemplateLanguageService(mockStorage);
      await newService.initialize();

      expect(newService.getCurrentLanguage()).toBe('en-US');
    });
  });

  describe('instance behavior', () => {
    it('should create independent instances', () => {
      const instance1 = new TemplateLanguageService();
      const instance2 = new TemplateLanguageService();

      expect(instance1).not.toBe(instance2);
      expect(instance1).toBeInstanceOf(TemplateLanguageService);
      expect(instance2).toBeInstanceOf(TemplateLanguageService);
    });
  });
});
