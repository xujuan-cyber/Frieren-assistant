import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StaticLoader } from '../../../src/services/template/static-loader';
import { MemoryStorageProvider } from '../../../src/services/storage/memoryStorageProvider';
import { IStorageProvider } from '../../../src/services/storage/types';
import { createTemplateManager, TemplateManager } from '../../../src/services/template/manager';
import { TemplateError, TemplateValidationError } from '../../../src/services/template/errors';
import { createTemplateLanguageService, TemplateLanguageService } from '../../../src/services/template/languageService';
import { Template } from '../../../src/services/template/types';

describe('TemplateManager', () => {
  let storageProvider: IStorageProvider;
  let languageService: TemplateLanguageService;
  let templateManager: TemplateManager;

  beforeEach(() => {
    storageProvider = new MemoryStorageProvider();
    languageService = createTemplateLanguageService(storageProvider);
    templateManager = createTemplateManager(storageProvider, languageService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create a basic template for tests
  const createTestTemplate = (id: string, name: string, type: 'optimize' | 'iterate' = 'optimize', isBuiltin = false): Template => ({
    id,
    name,
    content: `Content for ${name}`,
    metadata: {
      templateType: type,
      lastModified: Date.now(),
      version: '1.0.0',
      author: 'test',
      tags: [],
      description: '',
      language: 'zh',
    },
    isBuiltin,
  });

  describe('Initialization', () => {
    beforeEach(async () => {
      await templateManager.ensureInitialized();
    });

    it('should be initialized and handle re-initialization', async () => {
      expect(templateManager.isInitialized()).toBe(true);
      await templateManager.ensureInitialized();
      expect(templateManager.isInitialized()).toBe(true);
    });

    it('should load built-in templates correctly', async () => {
      const templates = templateManager.listTemplates();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => t.isBuiltin)).toBe(true);
    });

    it('should throw error when accessing templates before initialization is forced', () => {
      const uninitializedManager = createTemplateManager(storageProvider, languageService);
      expect(() => uninitializedManager.listTemplates()).toThrow(TemplateError);
    });

    it('should load user templates from storage during init', async () => {
      const userTemplate = createTestTemplate('user-template-1', 'My User Template');
      await storageProvider.setItem('app:templates', JSON.stringify([userTemplate]));

      const newManager = createTemplateManager(storageProvider, languageService);
      await newManager.ensureInitialized();

      const templates = newManager.listTemplates();
      const builtInTemplates = (new StaticLoader().loadTemplatesByLanguage('zh-CN'));
      const builtInCount = Object.keys(builtInTemplates).length;
      expect(templates).toHaveLength(builtInCount + 1);
      expect(templates.find(t => t.id === 'user-template-1')).toBeDefined();
    });

    it('should handle empty storage for user templates during init', async () => {
      await storageProvider.setItem('app:templates', '[]');
      
      const newManager = createTemplateManager(storageProvider, languageService);
      await newManager.ensureInitialized();
      
      const userTemplates = newManager.listTemplates().filter(t => !t.isBuiltin);
      expect(userTemplates).toHaveLength(0);
    });

    it('should load Chinese templates by default', () => {
      expect(templateManager.getCurrentBuiltinTemplateLanguage()).toBe('zh-CN');
      const template = templateManager.getTemplate('general-optimize');
      expect(template.name).toBe('通用优化');
    });

    it('should change to English templates when language is changed', async () => {
      await templateManager.changeBuiltinTemplateLanguage('en-US');
      expect(templateManager.getCurrentBuiltinTemplateLanguage()).toBe('en-US');
      const template = templateManager.getTemplate('general-optimize');
      expect(template.name).toBe('General Optimization');
    });

    it('should get current builtin template language', () => {
      expect(templateManager.getCurrentBuiltinTemplateLanguage()).toBe('zh-CN');
    });

    it('should get supported builtin template languages', () => {
      const initialLanguages = templateManager.getSupportedBuiltinTemplateLanguages();
      expect(initialLanguages).toEqual(['zh-CN', 'en-US']);
    });

    it('should handle language change errors gracefully', async () => {
      vi.spyOn(languageService, 'setLanguage').mockRejectedValue(new Error('Failed to set language'));
      await expect(templateManager.changeBuiltinTemplateLanguage('en-US')).rejects.toThrow('Failed to set language');
    });

    it('should reload builtin templates when language changes', async () => {
      const initialTemplates = templateManager.listTemplates();
      const initialTemplateNames = new Set(initialTemplates.map(t => t.name));

      await templateManager.changeBuiltinTemplateLanguage('en-US');

      const newTemplates = templateManager.listTemplates();
      const newTemplateNames = new Set(newTemplates.map(t => t.name));

      expect(newTemplateNames).not.toEqual(initialTemplateNames);
    });
  });

  describe('saveTemplate', () => {
    beforeEach(async () => {
      await templateManager.ensureInitialized();
    });

    it('should save a new user template and persist', async () => {
      const newTemplate = createTestTemplate('new-user-1', 'New User Template');
      await templateManager.saveTemplate(newTemplate);

      const retrieved = templateManager.getTemplate('new-user-1');
      
      // 核心字段验证，忽略时间戳等动态字段
      expect(retrieved.id).toBe(newTemplate.id);
      expect(retrieved.name).toBe(newTemplate.name);
      expect(retrieved.content).toBe(newTemplate.content);
      expect(retrieved.isBuiltin).toBe(false);

      const allTemplates = JSON.parse(await storageProvider.getItem('app:templates') ?? '[]');
      expect(allTemplates).toHaveLength(1);
    });

    it('should update an existing user template and persist', async () => {
      const templateV1 = createTestTemplate('user-update-1', 'Version 1');
      await templateManager.saveTemplate(templateV1);

      const templateV2 = { ...templateV1, name: 'Version 2' };
      await templateManager.saveTemplate(templateV2);

      const retrieved = templateManager.getTemplate('user-update-1');
      expect(retrieved.name).toBe('Version 2');

      const allTemplates = JSON.parse(await storageProvider.getItem('app:templates') ?? '[]');
      expect(allTemplates).toHaveLength(1);
      expect(allTemplates[0].name).toBe('Version 2');
    });

    it('should throw TemplateError when trying to save with an ID of a built-in template', async () => {
      const builtInId = 'general-optimize';
      const newTemplate = createTestTemplate(builtInId, 'Attempt to Overwrite');
      await expect(templateManager.saveTemplate(newTemplate)).rejects.toThrow(TemplateError);
      await expect(templateManager.saveTemplate(newTemplate)).rejects.toThrow(`Cannot overwrite built-in template: ${builtInId}`);
    });

    it('should throw TemplateValidationError for invalid templateType', async () => {
      const invalidTemplate = createTestTemplate('invalid-type', 'Invalid Type');
      // @ts-expect-error
      invalidTemplate.metadata.templateType = 'invalid';
      await expect(templateManager.saveTemplate(invalidTemplate)).rejects.toThrow(TemplateValidationError);
    });

    it('should throw TemplateValidationError for invalid ID format (too short, spaces, etc.)', async () => {
      const invalidTemplate = createTestTemplate(' ', 'Invalid ID');
      await expect(templateManager.saveTemplate(invalidTemplate)).rejects.toThrow(TemplateValidationError);
    });

    it('should throw TemplateValidationError for schema violations (e.g. missing name)', async () => {
      const invalidTemplate = createTestTemplate('valid-id', 'Valid Name');
      // @ts-expect-error
      delete invalidTemplate.name;
      await expect(templateManager.saveTemplate(invalidTemplate)).rejects.toThrow(TemplateValidationError);
    });
  });

  describe('getTemplate', () => {
    beforeEach(async () => {
      await templateManager.ensureInitialized();
    });

    it('should retrieve a built-in template', () => {
      const builtInId = 'general-optimize';
      const template = templateManager.getTemplate(builtInId);
      expect(template).toBeDefined();
      expect(template.isBuiltin).toBe(true);
    });

    it('should retrieve a user template after it is saved', async () => {
      const userTemplate = createTestTemplate('user-get-1', 'Gettable User Template');
      await templateManager.saveTemplate(userTemplate);
      const retrieved = templateManager.getTemplate('user-get-1');
      
      // 不直接比较整个对象，因为 lastModified 时间戳会被更新
      // expect(retrieved).toEqual(expect.objectContaining(userTemplate));
      expect(retrieved.id).toBe(userTemplate.id);
      expect(retrieved.name).toBe(userTemplate.name);
      expect(retrieved.content).toBe(userTemplate.content);
      expect(retrieved.isBuiltin).toBe(userTemplate.isBuiltin);
      expect(retrieved.metadata.templateType).toBe(userTemplate.metadata.templateType);
    });

    it('should throw TemplateError for a non-existent template ID', () => {
      expect(() => templateManager.getTemplate('non-existent-id')).toThrow(TemplateError);
    });

    it('should throw TemplateError for an invalid template ID (null, undefined, empty string)', () => {
      expect(() => templateManager.getTemplate(null as any)).toThrow(TemplateError);
      expect(() => templateManager.getTemplate('')).toThrow(TemplateError);
    });
  });

  describe('deleteTemplate', () => {
    beforeEach(async () => {
      await templateManager.ensureInitialized();
    });

    it('should delete a user template and persist the change', async () => {
      const userTemplate = createTestTemplate('user-delete-1', 'Deletable Template');
      await templateManager.saveTemplate(userTemplate);

      await templateManager.deleteTemplate('user-delete-1');

      expect(() => templateManager.getTemplate('user-delete-1')).toThrow(TemplateError);
      const allTemplates = JSON.parse(await storageProvider.getItem('app:templates') ?? '[]');
      expect(allTemplates).toHaveLength(0);
    });

    it('should throw TemplateError when trying to delete a built-in template', async () => {
      const builtInId = 'general-optimize';
      await expect(templateManager.deleteTemplate(builtInId)).rejects.toThrow(TemplateError);
      await expect(templateManager.deleteTemplate(builtInId)).rejects.toThrow(`Cannot delete built-in template: ${builtInId}`);
    });

    it('should throw TemplateError when trying to delete a non-existent user template', async () => {
      await expect(templateManager.deleteTemplate('non-existent-user-template')).rejects.toThrow(TemplateError);
    });
  });

  describe('listTemplates', () => {
    beforeEach(async () => {
      await templateManager.ensureInitialized();
    });

    it('should return built-in templates if no user templates exist', () => {
      const templates = templateManager.listTemplates();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => t.isBuiltin)).toBe(true);
    });

    it('should return built-in and user templates, sorted correctly', async () => {
      const userTemplate = createTestTemplate('user-list-1', 'Listable User Template');
      await templateManager.saveTemplate(userTemplate);

      const templates = templateManager.listTemplates();
      const builtInCount = templates.filter(t => t.isBuiltin).length;

      expect(templates.length).toBe(builtInCount + 1);
      expect(templates.find(t => t.id === 'user-list-1')).toBeDefined();
    });
  });

  describe('exportTemplate', () => {
    beforeEach(async () => {
      await templateManager.ensureInitialized();
    });

    it('should export a built-in template as JSON string', () => {
      const jsonString = templateManager.exportTemplate('general-optimize');
      const data = JSON.parse(jsonString);
      expect(data.id).toBe('general-optimize');
      expect(data.isBuiltin).toBe(true);
    });

    it('should export a user template as JSON string', async () => {
      const userTemplate = createTestTemplate('user-export-1', 'Exportable Template');
      await templateManager.saveTemplate(userTemplate);
      const jsonString = templateManager.exportTemplate('user-export-1');
      const data = JSON.parse(jsonString);
      expect(data.id).toBe('user-export-1');
      expect(data.isBuiltin).toBe(false);
    });

    it('should throw TemplateError when exporting a non-existent template', () => {
      expect(() => templateManager.exportTemplate('non-existent')).toThrow(TemplateError);
    });
  });

  describe('importTemplate', () => {
    let tplToImport: any;

    beforeEach(async () => {
      await templateManager.ensureInitialized();
      tplToImport = createTestTemplate('imported-1', 'Imported Template');
    });

    it('should import a valid new template and persist', async () => {
      const jsonToImport = JSON.stringify(tplToImport);
      await templateManager.importTemplate(jsonToImport);
      const retrieved = templateManager.getTemplate('imported-1');
      expect(retrieved.name).toBe('Imported Template');
    });

    it('should import and overwrite an existing user template', async () => {
      const v1 = createTestTemplate('imported-overwrite', 'Version 1');
      await templateManager.saveTemplate(v1);

      const v2 = { ...v1, name: 'Version 2' };
      const jsonToImport = JSON.stringify(v2);
      await templateManager.importTemplate(jsonToImport);

      const retrieved = templateManager.getTemplate('imported-overwrite');
      expect(retrieved.name).toBe('Version 2');
    });

    it('should throw TemplateError for invalid JSON string', async () => {
      const invalidJson = '{"id": "invalid"';
      await expect(templateManager.importTemplate(invalidJson)).rejects.toThrow(TemplateError);
    });

    it('should throw TemplateValidationError if imported template fails schema validation', async () => {
      delete tplToImport.name;
      const jsonToImport = JSON.stringify(tplToImport);
      await expect(templateManager.importTemplate(jsonToImport)).rejects.toThrow(TemplateValidationError);
    });
  });

  describe('listTemplatesByType', () => {
    beforeEach(async () => {
      await templateManager.ensureInitialized();
    });

    it('should return only templates of type "optimize"', () => {
      const optimizeTemplates = templateManager.listTemplatesByType('optimize');
      expect(optimizeTemplates.every(t => t.metadata.templateType === 'optimize')).toBe(true);
      expect(optimizeTemplates.length).toBeGreaterThan(0);
    });

    it('should return only templates of type "iterate"', () => {
      const iterateTemplates = templateManager.listTemplatesByType('iterate');
      expect(iterateTemplates.every(t => t.metadata.templateType === 'iterate')).toBe(true);
      expect(iterateTemplates.length).toBeGreaterThan(0);
    });

    it('should return empty array if no templates of the specified type exist', () => {
      const noTemplates = templateManager.listTemplatesByType('non-existent-type' as any);
      expect(noTemplates).toHaveLength(0);
    });
  });

  describe('StorageError Handling', () => {
    let localManager: TemplateManager;
    let localLanguageService: TemplateLanguageService;
    let localstorageProvider: IStorageProvider;

    beforeEach(() => {
      // 在这个测试组内使用独立的实例，避免污染其他测试
      localstorageProvider = new MemoryStorageProvider();
      localLanguageService = createTemplateLanguageService(localstorageProvider);
      localManager = createTemplateManager(localstorageProvider, localLanguageService);
    });

    it('init (via loadUserTemplates) should throw an error if storageProvider.getItem fails', async () => {
      vi.spyOn(localstorageProvider, 'getItem').mockRejectedValue(new Error('Internal Storage Error'));
      await expect(localManager.ensureInitialized()).rejects.toThrow('Failed to load user templates: Internal Storage Error');
    });

    it('saveTemplate (via persistUserTemplates) should throw TemplateError if storageProvider.setItem fails', async () => {
      await localManager.ensureInitialized();
      vi.spyOn(localstorageProvider, 'setItem').mockRejectedValue(new Error('Storage Set Failed!'));
      const tpl = createTestTemplate('save-fail', 'Save Fail Test');
      await expect(localManager.saveTemplate(tpl)).rejects.toThrow(TemplateError);
      await expect(localManager.saveTemplate(tpl)).rejects.toThrow('Failed to save user templates: Storage Set Failed!');
    });

    it('deleteTemplate (via persistUserTemplates) should throw TemplateError if storageProvider.setItem fails', async () => {
      await localManager.ensureInitialized();
      const tpl = createTestTemplate('delete-fail', 'Delete Fail Test');
      await localManager.saveTemplate(tpl);
      vi.spyOn(localstorageProvider, 'setItem').mockRejectedValue(new Error('Storage Set Failed!'));
      await expect(localManager.deleteTemplate('delete-fail')).rejects.toThrow('Failed to save user templates: Storage Set Failed!');
    });

    it('importTemplate (via persistUserTemplates) should throw TemplateError if storageProvider.setItem fails', async () => {
      await localManager.ensureInitialized();
      const tpl = createTestTemplate('import-fail', 'Import Fail Test');
      const jsonToImport = JSON.stringify(tpl);
      vi.spyOn(localstorageProvider, 'setItem').mockRejectedValue(new Error('Storage Set Failed on Import!'));
      await expect(localManager.importTemplate(jsonToImport)).rejects.toThrow(TemplateError);
    });
  });
});
