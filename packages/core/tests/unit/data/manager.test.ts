import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataManager } from '../../../src/services/data/manager';
import { IHistoryManager } from '../../../src/services/history/types';
import { IModelManager } from '../../../src/services/model/types';
import { ITemplateManager, Template } from '../../../src/services/template/types';
import { IStorageProvider } from '../../../src/services/storage/types';
import { MemoryStorageProvider } from '../../../src/services/storage/memoryStorageProvider';

describe('DataManager', () => {
  let dataManager: DataManager;
  let mockModelManager: IModelManager;
  let mockTemplateManager: ITemplateManager;
  let mockHistoryManager: IHistoryManager;
  let mockStorageProvider: IStorageProvider;

  beforeEach(() => {
    // 1. 为每个测试创建一个全新的存储提供程序
    mockStorageProvider = new MemoryStorageProvider();
    vi.spyOn(mockStorageProvider, 'setItem'); // 监视 setItem 以进行设置测试

    // 2. 为每个管理器创建全面的模拟对象
    mockModelManager = {
      getAllModels: vi.fn().mockResolvedValue([]),
      addModel: vi.fn().mockResolvedValue(undefined),
      updateModel: vi.fn().mockResolvedValue(undefined),
      deleteModel: vi.fn().mockResolvedValue(undefined),
      enableModel: vi.fn().mockResolvedValue(undefined),
      disableModel: vi.fn().mockResolvedValue(undefined),
      getModel: vi.fn().mockResolvedValue(null),
      getEnabledModels: vi.fn().mockResolvedValue([]),
    };

    mockTemplateManager = {
      listTemplates: vi.fn().mockReturnValue([]),
      saveTemplate: vi.fn().mockResolvedValue(undefined),
      getTemplate: vi.fn(),
      deleteTemplate: vi.fn().mockResolvedValue(undefined),
      exportTemplate: vi.fn(),
      importTemplate: vi.fn().mockResolvedValue(undefined),
      changeBuiltinTemplateLanguage: vi.fn().mockResolvedValue(undefined),
      getCurrentBuiltinTemplateLanguage: vi.fn().mockReturnValue('en-US'),
      getSupportedBuiltinTemplateLanguages: vi.fn().mockReturnValue(['en-US', 'zh-CN']),
      reloadBuiltinTemplates: vi.fn().mockResolvedValue(undefined),
      listTemplatesByType: vi.fn().mockReturnValue([]),
    };

    mockHistoryManager = {
      getRecords: vi.fn().mockResolvedValue([]),
      addRecord: vi.fn().mockResolvedValue(undefined),
      clearHistory: vi.fn().mockResolvedValue(undefined),
      getRecord: vi.fn().mockResolvedValue(null),
      updateRecord: vi.fn().mockResolvedValue(undefined),
      deleteRecord: vi.fn().mockResolvedValue(undefined),
      getChain: vi.fn().mockResolvedValue(null),
      getAllChains: vi.fn().mockResolvedValue([]),
      deleteChain: vi.fn().mockResolvedValue(undefined),
    };

    // 3. 使用正确的参数顺序实例化 DataManager
    dataManager = new DataManager(
      mockModelManager,
      mockTemplateManager,
      mockHistoryManager,
      mockStorageProvider
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('exportAllData', () => {
    it('should fetch data from all managers and return a JSON string', async () => {
      const models = [{ id: 'model1', name: 'Test Model' }];
      const templates: Template[] = [{ id: 'tpl1', name: 'Test Template', content: 'c', isBuiltin: false, metadata: { templateType: 'optimize', version: '1.0', lastModified: 0 } }];
      const history = [{ id: 'hist1', prompt: 'Test Prompt' }];
      
      (mockModelManager.getAllModels as vi.Mock).mockResolvedValue(models);
      (mockTemplateManager.listTemplates as vi.Mock).mockReturnValue(templates);
      (mockHistoryManager.getRecords as vi.Mock).mockResolvedValue(history as any);

      const jsonString = await dataManager.exportAllData();
      const data = JSON.parse(jsonString);

      expect(data.version).toBe(1);
      expect(data.data.models).toEqual(models);
      expect(data.data.userTemplates).toEqual(templates.filter(t => !t.isBuiltin));
      expect(data.data.history).toEqual(history);
    });
  });

  describe('importAllData', () => {
    const importData = {
      version: 1,
      data: {
        models: [{ key: 'imp-model1', id: 'imp-model1', name: 'Imported Model' }],
        userTemplates: [{ id: 'imp-tpl1', name: 'Imported Template', content: 'test content', isBuiltin: false, metadata: { templateType: 'optimize', version: '1.0', lastModified: 0 } }],
        history: [{ id: 'imp-hist1', prompt: 'Imported Prompt' }],
        userSettings: { 'app:settings:ui:theme-id': 'dark' },
      },
    };

    it('should clear existing data and import new data', async () => {
      await dataManager.importAllData(JSON.stringify(importData));

      expect(mockHistoryManager.clearHistory).toHaveBeenCalled();
      expect(mockModelManager.addModel).toHaveBeenCalledWith('imp-model1', expect.objectContaining({
        name: 'Imported Model'
      }));
      expect(mockTemplateManager.saveTemplate).toHaveBeenCalledWith(expect.objectContaining({
        id: 'imp-tpl1',
        name: 'Imported Template'
      }));
      expect(mockHistoryManager.addRecord).toHaveBeenCalledWith(importData.data.history[0]);
      expect(mockStorageProvider.setItem).toHaveBeenCalledWith('app:settings:ui:theme-id', 'dark');
    });

    it('should throw an error for invalid JSON string', async () => {
      await expect(dataManager.importAllData('invalid-json')).rejects.toThrow('Invalid data format: failed to parse JSON');
    });

    it('should throw an error for data without a "data" property in new format', async () => {
      await expect(dataManager.importAllData(JSON.stringify({ version: 1 }))).rejects.toThrow('Invalid data format: "data" property is missing or not an object');
    });

    it('should support old format for backward compatibility', async () => {
      const oldFormatData = {
        history: [{ id: 'old-hist1', prompt: 'Old Format Prompt' }],
        models: [{ key: 'old-model1', name: 'Old Format Model' }],
        userTemplates: [{ id: 'old-tpl1', name: 'Old Format Template', content: 'old content', isBuiltin: false, metadata: { templateType: 'optimize', version: '1.0', lastModified: 0 } }],
        userSettings: { 'app:settings:ui:theme-id': 'light' },
      };
      
      await expect(dataManager.importAllData(JSON.stringify(oldFormatData))).resolves.not.toThrow();
      expect(mockModelManager.addModel).toHaveBeenCalled();
      expect(mockTemplateManager.saveTemplate).toHaveBeenCalled();
      expect(mockHistoryManager.addRecord).toHaveBeenCalled();
      expect(mockStorageProvider.setItem).toHaveBeenCalledWith('app:settings:ui:theme-id', 'light');
    });
    
    it('should not throw error if parts of data are missing', async () => {
        const partialData = { version: 1, data: { models: [{ key: 'm1', name: 'Model 1' }] } };
        await expect(dataManager.importAllData(JSON.stringify(partialData))).resolves.not.toThrow();
        expect(mockModelManager.addModel).toHaveBeenCalled();
        expect(mockTemplateManager.saveTemplate).not.toHaveBeenCalled();
    });

    it('should only import whitelisted UI settings', async () => {
      const securityTestPayload = {
        version: 1,
        data: {
          userSettings: {
            'app:settings:ui:theme-id': 'dark',
            'app:settings:ui:malicious-key': 'value', // This should be ignored
          },
        },
      };
      await dataManager.importAllData(JSON.stringify(securityTestPayload));
      expect(mockStorageProvider.setItem).toHaveBeenCalledWith('app:settings:ui:theme-id', 'dark');
      expect(mockStorageProvider.setItem).not.toHaveBeenCalledWith('app:settings:ui:malicious-key', expect.anything());
    });

    it('should handle legacy UI setting keys with backward compatibility', async () => {
      const legacyTestPayload = {
        version: 1,
        data: {
          userSettings: {
            // 旧版本的简短键名
            'theme-id': 'dark',
            'preferred-language': 'en',
            'builtin-template-language': 'zh',
            // 新版本的完整键名
            'app:selected-optimize-model': 'gemini',
            // 无效的键名
            'invalid-key': 'should-be-ignored'
          },
        },
      };

      await dataManager.importAllData(JSON.stringify(legacyTestPayload));

      // 验证旧版本键名被正确转换并导入
      expect(mockStorageProvider.setItem).toHaveBeenCalledWith('app:settings:ui:theme-id', 'dark');
      expect(mockStorageProvider.setItem).toHaveBeenCalledWith('app:settings:ui:preferred-language', 'en');
      expect(mockStorageProvider.setItem).toHaveBeenCalledWith('app:settings:ui:builtin-template-language', 'zh');

      // 验证新版本键名正常导入
      expect(mockStorageProvider.setItem).toHaveBeenCalledWith('app:selected-optimize-model', 'gemini');

      // 验证无效键名被忽略
      expect(mockStorageProvider.setItem).not.toHaveBeenCalledWith('invalid-key', expect.anything());
    });
  });
});