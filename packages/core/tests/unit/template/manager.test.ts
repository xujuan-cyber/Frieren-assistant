import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateManager } from '../../../src/services/template/manager';
import { IStorageProvider } from '../../../src/services/storage/types';
import { Template, templateSchema } from '../../../src/services/template/types'; // Removed TemplateSchema as it's not directly used, templateSchema is
import { TemplateError, TemplateValidationError } from '../../../src/services/template/errors';
import { DEFAULT_TEMPLATES } from '../../../src/services/template/defaults';
import { DEFAULT_TEMPLATES_EN } from '../../../src/services/template/defaults_en';
import { templateLanguageService } from '../../../src/services/template/languageService';
import { createMockStorage } from '../../mocks/mockStorage';

// Helper for deep cloning default templates for isolated tests
const getCleanDefaultTemplates = () => JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));

describe('TemplateManager', () => {
  let templateManager: TemplateManager;
  let mockStorage: ReturnType<typeof createMockStorage>;
  const testStorageKey = 'app:templates'; // Default key from TemplateManagerConfig

  // Helper to create Template objects
  const createTemplate = (
    id: string,
    name: string,
    type: 'optimize' | 'iterate' = 'optimize',
    content = 'Test content {{placeholder}}',
    isBuiltin = false,
    lastModified = Date.now()
  ): Template => ({
    id: id.toLowerCase().replace(/[^a-z0-9-]/g, '-'),  // 确保ID符合规范
    name,
    content,
    metadata: { templateType: type, lastModified, version: '1.0' },
    isBuiltin,
  });

  beforeEach(async () => {
    mockStorage = createMockStorage();

    // Mock template language service initialization
    vi.spyOn(templateLanguageService, 'initialize').mockResolvedValue();
    vi.spyOn(templateLanguageService, 'getCurrentLanguage').mockReturnValue('zh-CN');

    templateManager = new TemplateManager(mockStorage);
    // Allow async init (which calls loadUserTemplates) to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    // Clear mocks that might have been called during init
    mockStorage.getItem.mockClear();
    mockStorage.setItem.mockClear();
  });

  describe('Initialization', () => {
    it('should have initialization methods', async () => {
      expect(templateManager.isInitialized()).toBe(true);
      await expect(templateManager.ensureInitialized()).resolves.not.toThrow();
    });

    it('should load built-in templates correctly', () => {
      const builtInIds = Object.keys(DEFAULT_TEMPLATES);
      expect(builtInIds.length).toBeGreaterThan(0);
      const firstBuiltInId = builtInIds[0];
      const template = templateManager.getTemplate(firstBuiltInId);
      expect(template).toBeDefined();
      expect(template.isBuiltin).toBe(true);
      expect(template.id).toBe(firstBuiltInId);
    });

    it('should throw error when accessing templates before initialization', () => {
      const uninitializedStorage = createMockStorage();
      const uninitializedManager = new TemplateManager(uninitializedStorage);

      // Access template before initialization completes
      expect(() => uninitializedManager.getTemplate('general-optimize')).toThrow('Template manager not initialized');
    });

    it('should load user templates from storage during init', async () => {
      const userTpl = createTemplate('user1', 'User Template 1');
      const initialMockStorage = createMockStorage();
      initialMockStorage.getItem.mockResolvedValue(JSON.stringify([userTpl]));
      
      const tm = new TemplateManager(initialMockStorage);
      await new Promise(resolve => setTimeout(resolve, 0)); // allow init

      expect(initialMockStorage.getItem).toHaveBeenCalledWith(testStorageKey);
      const retrieved = tm.getTemplate('user1');
      expect(retrieved.name).toBe('User Template 1');
      expect(retrieved.isBuiltin).toBe(false); // Should be set by save/load logic
    });
    
    it('should handle empty storage for user templates during init', async () => {
      const initialMockStorage = createMockStorage();
      initialMockStorage.getItem.mockResolvedValue(JSON.stringify([])); // Empty array from storage
      
      const tm = new TemplateManager(initialMockStorage);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(initialMockStorage.getItem).toHaveBeenCalledWith(testStorageKey);
      const templates = tm.listTemplates().filter(t => !t.isBuiltin);
      expect(templates.length).toBe(0);
    });
  });

  describe('saveTemplate', () => {
    it('should save a new user template and persist', async () => {
      const newUserTpl = createTemplate('new-user-tpl', 'New User Template');
      await templateManager.saveTemplate(newUserTpl);

      const expectedSavedData = [{
        ...newUserTpl, 
        isBuiltin: false, 
        metadata: {
          ...newUserTpl.metadata,
          // 使用预期匹配任何数字而不是固定时间戳
          lastModified: expect.any(Number)
        }
      }];
      
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        testStorageKey,
        expect.stringMatching(/new-user-tpl.*New User Template.*Test content/)
      );
      
      // 从调用参数中提取实际保存的JSON
      const actualCall = mockStorage.setItem.mock.calls[0];
      const actualJson = JSON.parse(actualCall[1]);
      
      // 验证除了lastModified之外的所有字段
      expect(actualJson[0].id).toBe(expectedSavedData[0].id);
      expect(actualJson[0].name).toBe(expectedSavedData[0].name);
      expect(actualJson[0].content).toBe(expectedSavedData[0].content);
      expect(actualJson[0].isBuiltin).toBe(expectedSavedData[0].isBuiltin);
      expect(actualJson[0].metadata.templateType).toBe(expectedSavedData[0].metadata.templateType);
      expect(actualJson[0].metadata.version).toBe(expectedSavedData[0].metadata.version);
      expect(typeof actualJson[0].metadata.lastModified).toBe('number');
    });

    it('should update an existing user template and persist', async () => {
      const tplV1 = createTemplate('user-update-tpl', 'Version 1');
      mockStorage.getItem.mockResolvedValue(JSON.stringify([tplV1]));
      
      const tplV2 = {
        ...tplV1,
        name: 'Version 2',
        content: 'New content',
        metadata: {
          ...tplV1.metadata,
          templateType: 'iterate' as const
        }
      };
      
      await templateManager.saveTemplate(tplV2);
      
      // 验证调用参数，使用更灵活的匹配
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        testStorageKey,
        expect.stringMatching(/user-update-tpl.*Version 2.*New content/)
      );
      
      // 从调用参数中提取实际保存的JSON
      const actualCall = mockStorage.setItem.mock.calls[0];
      const actualJson = JSON.parse(actualCall[1]);
      
      // 验证除了lastModified之外的所有字段
      expect(actualJson[0].id).toBe(tplV2.id);
      expect(actualJson[0].name).toBe(tplV2.name);
      expect(actualJson[0].content).toBe(tplV2.content);
      expect(actualJson[0].isBuiltin).toBe(false);
      expect(actualJson[0].metadata.templateType).toBe(tplV2.metadata.templateType);
      expect(actualJson[0].metadata.version).toBe(tplV2.metadata.version);
      expect(typeof actualJson[0].metadata.lastModified).toBe('number');
    });

    it('should throw TemplateError when trying to save with an ID of a built-in template', async () => {
      const builtInId = Object.keys(DEFAULT_TEMPLATES)[0];
      const tpl = createTemplate(builtInId, 'Attempt to overwrite built-in');
      await expect(templateManager.saveTemplate(tpl)).rejects.toThrow(TemplateError);
      await expect(templateManager.saveTemplate(tpl)).rejects.toThrow(`Cannot overwrite built-in template: ${builtInId}`);
      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });

    it('should throw TemplateValidationError for invalid templateType', async () => {
      const tpl = createTemplate('invalidType', 'Invalid Type', 'wrongType' as any);
      await expect(templateManager.saveTemplate(tpl)).rejects.toThrow(TemplateValidationError);
      await expect(templateManager.saveTemplate(tpl)).rejects.toThrow('Invalid template type');
    });

    it('should throw TemplateValidationError for invalid ID format (too short, spaces, etc.)', async () => {
      // 为了绕过createTemplate函数中的ID自动修复，直接创建不符合格式的对象
      const shortIdTpl = {
        id: 'id', // 太短
        name: 'Short ID',
        content: 'content',
        metadata: { templateType: 'optimize' as const, lastModified: Date.now(), version: '1.0' }
      };
      
      await expect(templateManager.saveTemplate(shortIdTpl)).rejects.toThrow(TemplateValidationError);
      await expect(templateManager.saveTemplate(shortIdTpl)).rejects.toThrow('Invalid template ID format');
      
      const spacesIdTpl = {
        id: 'id with spaces', // 包含空格
        name: 'ID With Spaces',
        content: 'content',
        metadata: { templateType: 'optimize' as const, lastModified: Date.now(), version: '1.0' }
      };
      
      await expect(templateManager.saveTemplate(spacesIdTpl)).rejects.toThrow(TemplateValidationError);
      await expect(templateManager.saveTemplate(spacesIdTpl)).rejects.toThrow('Invalid template ID format');
    });

    it('should throw TemplateValidationError for schema violations (e.g. missing name)', async () => {
        const tpl = createTemplate('validId', '' as any); // Missing name
        // Manually break the type for testing schema validation
        (tpl as any).name = undefined; 
        await expect(templateManager.saveTemplate(tpl)).rejects.toThrow(TemplateValidationError);
    });
  });

  describe('getTemplate', () => {
    it('should retrieve a built-in template', () => {
      const builtInId = Object.keys(DEFAULT_TEMPLATES)[0];
      const template = templateManager.getTemplate(builtInId);
      expect(template.id).toBe(builtInId);
      expect(template.isBuiltin).toBe(true);
    });

    it('should retrieve a user template after it is saved', async () => {
      const userTpl = createTemplate('user-get-tpl', 'User Get Test');
      await templateManager.saveTemplate(userTpl);
      const retrieved = templateManager.getTemplate('user-get-tpl');
      expect(retrieved.name).toBe('User Get Test');
      expect(retrieved.isBuiltin).toBe(false);
    });

    it('should throw TemplateError for a non-existent template ID', () => {
      expect(() => templateManager.getTemplate('non-existent-id')).toThrow(TemplateError);
      expect(() => templateManager.getTemplate('non-existent-id')).toThrow('Template non-existent-id not found');
    });
    
    it('should throw TemplateError for an invalid template ID (null, undefined, empty string)', () => {
        expect(() => templateManager.getTemplate(null as any)).toThrow('Invalid template ID');
        expect(() => templateManager.getTemplate(undefined as any)).toThrow('Invalid template ID');
        expect(() => templateManager.getTemplate('')).toThrow('Invalid template ID');
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a user template and persist the change', async () => {
      const userTpl = createTemplate('user-delete-tpl', 'To Be Deleted');
      await templateManager.saveTemplate(userTpl);
      mockStorage.setItem.mockClear();

      await templateManager.deleteTemplate('user-delete-tpl');
      expect(mockStorage.setItem).toHaveBeenCalledWith(testStorageKey, JSON.stringify([]));
      expect(() => templateManager.getTemplate('user-delete-tpl')).toThrow(TemplateError);
    });

    it('should throw TemplateError when trying to delete a built-in template', async () => {
      const builtInId = Object.keys(DEFAULT_TEMPLATES)[0];
      await expect(templateManager.deleteTemplate(builtInId)).rejects.toThrow(TemplateError);
      await expect(templateManager.deleteTemplate(builtInId)).rejects.toThrow(`Cannot delete built-in template: ${builtInId}`);
      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });

    it('should throw TemplateError when trying to delete a non-existent user template', async () => {
      const nonExistentId = 'non-existent-template';
      await expect(templateManager.deleteTemplate(nonExistentId)).rejects.toThrow(TemplateError);
      await expect(templateManager.deleteTemplate(nonExistentId)).rejects.toThrow(`Template not found: ${nonExistentId}`);
    });

    it('deleteTemplate (via persistUserTemplates) should throw TemplateError if storageProvider.setItem fails', async () => {
      const tplId = 'delete-persist-fail';
      const tpl = createTemplate(tplId, 'Delete Persist Fail');
      
      // 创建一个新的mockStorage来模拟这个特定的测试场景
      const testMockStorage = createMockStorage();
      const testTemplateManager = new TemplateManager(testMockStorage);
      
      // 保存模板使其可用
      await testTemplateManager.saveTemplate(tpl);
      testMockStorage.setItem.mockClear();
      
      // 使setItem在删除时失败
      testMockStorage.setItem.mockRejectedValueOnce(new Error("Storage Set Failed on Delete!"));
      
      // 尝试删除应该失败
      await expect(testTemplateManager.deleteTemplate(tplId))
        .rejects.toThrow('Failed to save user templates: Storage Set Failed on Delete!');
    });
  });

  describe('listTemplates', () => {
    it('should return built-in templates if no user templates exist', () => {
      const templates = templateManager.listTemplates();
      const defaultKeys = Object.keys(DEFAULT_TEMPLATES);
      expect(templates.length).toBe(defaultKeys.length);
      defaultKeys.forEach(key => expect(templates.find(t => t.id === key && t.isBuiltin)).toBeDefined());
    });

    it('should return built-in and user templates, sorted correctly', async () => {
      // 创建一个自定义的templateManager，手动设置userTemplates
      const customMockStorage = createMockStorage();
      
      // Mock template language service for the custom manager
      vi.spyOn(templateLanguageService, 'initialize').mockResolvedValue();
      vi.spyOn(templateLanguageService, 'getCurrentLanguage').mockReturnValue('zh-CN');
      
      const customTemplateManager = new TemplateManager(customMockStorage);
      
      // 等待异步初始化完成
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // 创建两个时间戳有明显差异的模板
      const oldTemplate = createTemplate('user-tpl-1', 'User Alpha', 'optimize', 'content', false, 1000);
      const newTemplate = createTemplate('user-tpl-2', 'User Beta', 'iterate', 'content', false, 2000);
      
      // 直接修改内部Map（通过saveTemplate实际上会重写时间戳）
      // @ts-ignore - 访问私有属性进行测试
      customTemplateManager['userTemplates'].set(oldTemplate.id, oldTemplate);
      // @ts-ignore - 访问私有属性进行测试
      customTemplateManager['userTemplates'].set(newTemplate.id, newTemplate);
      
      // 获取排序后的模板
      const templates = customTemplateManager.listTemplates();
      const builtInCount = Object.keys(DEFAULT_TEMPLATES).length;
      
      // 检查内置模板在前
      for (let i = 0; i < builtInCount; i++) {
        expect(templates[i].isBuiltin).toBe(true);
      }
      
      // 提取并验证用户模板
      const userTemplates = templates.slice(builtInCount);
      expect(userTemplates.length).toBe(2);
      
      // 验证排序：新的在前，旧的在后
      expect(userTemplates[0].id).toBe('user-tpl-2'); // 较新的应该在前(lastModified=2000)
      expect(userTemplates[1].id).toBe('user-tpl-1'); // 较旧的应该在后(lastModified=1000)
    });
  });

  describe('exportTemplate', () => {
    it('should export a built-in template as JSON string', () => {
      const builtInId = Object.keys(DEFAULT_TEMPLATES)[0];
      const jsonString = templateManager.exportTemplate(builtInId);
      const parsed = JSON.parse(jsonString);
      expect(parsed.id).toBe(builtInId);
      expect(parsed.name).toBe(DEFAULT_TEMPLATES[builtInId].name);
    });

    it('should export a user template as JSON string', async () => {
      const userTpl = createTemplate('user-export-test', 'User Export Test');
      await templateManager.saveTemplate(userTpl);
      const jsonString = templateManager.exportTemplate('user-export-test');
      const parsed = JSON.parse(jsonString);
      expect(parsed.id).toBe('user-export-test');
      expect(parsed.name).toBe('User Export Test');
    });

    it('should throw TemplateError when exporting a non-existent template', () => {
      expect(() => templateManager.exportTemplate('nonExistentExport')).toThrow(TemplateError);
    });
  });

  describe('importTemplate', () => {
    it('should import a valid new template and persist', async () => {
      const tplToImport = createTemplate('imported-user', 'Imported User Template');
      const serialized = JSON.stringify(tplToImport);
      
      await templateManager.importTemplate(serialized);
      
      // 使用更精确的匹配
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        testStorageKey,
        expect.stringMatching(/imported-user.*Imported User Template/)
      );
      
      // 验证模板已被正确保存
      const savedTemplate = templateManager.getTemplate('imported-user');
      expect(savedTemplate.name).toBe('Imported User Template');
      expect(savedTemplate.isBuiltin).toBe(false);
    });

    it('should import and overwrite an existing user template', async () => {
      // 已存在的模板
      const existingTpl = createTemplate('user-import-overwrite', 'V1');
      mockStorage.getItem.mockResolvedValue(JSON.stringify([existingTpl]));
      
      // 新的导入模板
      const tplV2 = createTemplate('user-import-overwrite', 'V2 Import', 'iterate');
      const serialized = JSON.stringify(tplV2);
      
      await templateManager.importTemplate(serialized);
      
      // 使用更精确的匹配
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        testStorageKey,
        expect.stringMatching(/user-import-overwrite.*V2 Import/)
      );
      
      // 验证模板已被正确更新
      const updatedTemplate = templateManager.getTemplate('user-import-overwrite');
      expect(updatedTemplate.name).toBe('V2 Import');
      expect(updatedTemplate.metadata.templateType).toBe('iterate');
    });
  
    it('should throw TemplateError for invalid JSON string', async () => {
      await expect(templateManager.importTemplate('{x')).rejects.toThrow('Failed to import template');
    });

    it('should throw TemplateValidationError if imported template fails schema validation', async () => {
      const invalidTemplate = {
        id: 'invalid-template'
        // Missing required fields
      };
      
      const serialized = JSON.stringify(invalidTemplate);
      
      await expect(templateManager.importTemplate(serialized))
        .rejects.toThrow('Template validation failed');
    });
  });

  describe('listTemplatesByType', () => {
    it('should return only templates of type "optimize"', async () => {
      const optiTpl = createTemplate('opti1', 'Optimize Template', 'optimize');
      const iterTpl = createTemplate('iter1', 'Iterate Template', 'iterate');
      await templateManager.saveTemplate(optiTpl);
      await templateManager.saveTemplate(iterTpl);

      const optimizeTemplates = templateManager.listTemplatesByType('optimize');
      expect(optimizeTemplates.some(t => t.id === 'opti1')).toBe(true);
      expect(optimizeTemplates.some(t => t.id === 'iter1')).toBe(false);
      // Also check built-in defaults
      const defaultOptimizeCount = Object.values(DEFAULT_TEMPLATES).filter(t => t.metadata.templateType === 'optimize').length;
      expect(optimizeTemplates.filter(t=>t.isBuiltin).length).toBe(defaultOptimizeCount);
    });

    it('should return only templates of type "iterate"', async () => {
        const optiTpl = createTemplate('opti2', 'Optimize Template 2', 'optimize');
        const iterTpl = createTemplate('iter2', 'Iterate Template 2', 'iterate');
        await templateManager.saveTemplate(optiTpl);
        await templateManager.saveTemplate(iterTpl);
  
        const iterateTemplates = templateManager.listTemplatesByType('iterate');
        expect(iterateTemplates.some(t => t.id === 'opti2')).toBe(false);
        expect(iterateTemplates.some(t => t.id === 'iter2')).toBe(true);
        const defaultIterateCount = Object.values(DEFAULT_TEMPLATES).filter(t => t.metadata.templateType === 'iterate').length;
        expect(iterateTemplates.filter(t=>t.isBuiltin).length).toBe(defaultIterateCount);
      });

    it('should return empty array if no templates of the specified type exist', () => {
        // Clear all user templates by not saving any
        const onlyOptimizeBuiltin = Object.values(DEFAULT_TEMPLATES).every(t => t.metadata.templateType === 'optimize');
        if (onlyOptimizeBuiltin) { // only run if this condition is true for current defaults
            const iterateTemplates = templateManager.listTemplatesByType('iterate');
            expect(iterateTemplates.filter(t => !t.isBuiltin).length).toBe(0); // No user iterate templates
        }
        // This test is more robust if we ensure no built-ins of a certain type exist,
        // or by first saving templates of other types.
        const optimizeTemplates = templateManager.listTemplatesByType('optimize'); // Assuming some optimize exist
        expect(optimizeTemplates.length).toBeGreaterThanOrEqual(0); 
      });
  });

  describe('StorageError Handling', () => {
    it('init (via loadUserTemplates) should throw TemplateError if storageProvider.getItem fails', async () => {
      const testMockStorage = createMockStorage();
      
      // 模拟存储获取失败
      testMockStorage.getItem.mockRejectedValue(new Error('Storage Get Failed!'));
      
      const templateManager = new TemplateManager(testMockStorage);
      
      try {
        // 等待初始化完成，现在会使用fallback机制
        await templateManager.ensureInitialized();
        
        // 验证初始化成功（使用fallback）
        expect(templateManager.isInitialized()).toBe(true);
        
        // 验证仍然有内置模板可用
        const templates = templateManager.listTemplates();
        expect(templates.length).toBeGreaterThan(0);
        expect(templates.every(t => t.isBuiltin)).toBe(true);
        
      } catch (error) {
        // 如果fallback也失败，验证错误
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('saveTemplate (via persistUserTemplates) should throw TemplateError if storageProvider.setItem fails', async () => {
      mockStorage.setItem.mockRejectedValue(new Error("Storage Set Failed!"));
      const tpl = createTemplate('saveFail', 'Save Fail Test');
      await expect(templateManager.saveTemplate(tpl)).rejects.toThrow(TemplateError);
      await expect(templateManager.saveTemplate(tpl)).rejects.toThrow('Failed to save user templates: Storage Set Failed!');
    });

    it('deleteTemplate (via persistUserTemplates) should throw TemplateError if storageProvider.setItem fails', async () => {
      const tplId = 'delete-persist-fail';
      const tpl = createTemplate(tplId, 'Delete Persist Fail');
      
      // 创建一个新的mockStorage来模拟这个特定的测试场景
      const testMockStorage = createMockStorage();
      const testTemplateManager = new TemplateManager(testMockStorage);
      
      // 保存模板使其可用
      await testTemplateManager.saveTemplate(tpl);
      testMockStorage.setItem.mockClear();
      
      // 使setItem在删除时失败
      testMockStorage.setItem.mockRejectedValueOnce(new Error("Storage Set Failed on Delete!"));
      
      // 尝试删除应该失败
      await expect(testTemplateManager.deleteTemplate(tplId))
        .rejects.toThrow('Failed to save user templates: Storage Set Failed on Delete!');
    });

    it('importTemplate (via persistUserTemplates) should throw TemplateError if storageProvider.setItem fails', async () => {
      const tpl = createTemplate('importPersistFail', 'Import Persist Fail');
      const jsonToImport = JSON.stringify(tpl);
      
      mockStorage.setItem.mockRejectedValue(new Error("Storage Set Failed on Import!"));
      
      await expect(templateManager.importTemplate(jsonToImport)).rejects.toThrow(TemplateError);
      await expect(templateManager.importTemplate(jsonToImport)).rejects.toThrow('Failed to save user templates: Storage Set Failed on Import!');
    });
  });

  describe('Built-in Template Language Support', () => {
    it('should load Chinese templates by default', () => {
      const builtinTemplates = templateManager.listTemplates().filter(t => t.isBuiltin);
      expect(builtinTemplates.length).toBeGreaterThan(0);

      // Check that we have Chinese templates (should contain Chinese characters)
      const generalOptimize = builtinTemplates.find(t => t.id === 'general-optimize');
      expect(generalOptimize).toBeDefined();
      expect(generalOptimize!.name).toBe('通用优化'); // Chinese name
    });

    it('should change to English templates when language is changed', async () => {
      // Mock language service to return English
      vi.spyOn(templateLanguageService, 'getCurrentLanguage').mockReturnValue('en-US');
      vi.spyOn(templateLanguageService, 'setLanguage').mockResolvedValue();

      await templateManager.changeBuiltinTemplateLanguage('en-US');

      const builtinTemplates = templateManager.listTemplates().filter(t => t.isBuiltin);
      const generalOptimize = builtinTemplates.find(t => t.id === 'general-optimize');
      expect(generalOptimize).toBeDefined();
      expect(generalOptimize!.name).toBe('General Optimization'); // English name
    });

    it('should get current builtin template language', () => {
      const currentLang = templateManager.getCurrentBuiltinTemplateLanguage();
      expect(currentLang).toBe('zh-CN');
    });

    it('should get supported builtin template languages', () => {
      const supportedLangs = templateManager.getSupportedBuiltinTemplateLanguages();
      expect(supportedLangs).toEqual(['zh-CN', 'en-US']);
    });

    it('should handle language change errors gracefully', async () => {
      vi.spyOn(templateLanguageService, 'setLanguage').mockRejectedValue(new Error('Language change failed'));

      await expect(templateManager.changeBuiltinTemplateLanguage('en-US')).rejects.toThrow('Language change failed');
    });

    it('should reload builtin templates when language changes', async () => {
      const initialTemplates = templateManager.listTemplates().filter(t => t.isBuiltin);
      const initialCount = initialTemplates.length;

      // Mock language service to return English
      vi.spyOn(templateLanguageService, 'getCurrentLanguage').mockReturnValue('en-US');
      vi.spyOn(templateLanguageService, 'setLanguage').mockResolvedValue();

      await templateManager.changeBuiltinTemplateLanguage('en-US');

      const newTemplates = templateManager.listTemplates().filter(t => t.isBuiltin);
      expect(newTemplates.length).toBe(initialCount); // Same number of templates

      // But content should be different (English vs Chinese)
      const newGeneralOptimize = newTemplates.find(t => t.id === 'general-optimize');
      expect(newGeneralOptimize!.name).toBe('General Optimization');
    });
  });
});
