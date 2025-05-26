import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DataManager } from '../../../src/services/data/manager';
import { IHistoryManager, PromptRecord } from '../../../src/services/history/types';
import { IModelManager, ModelConfig } from '../../../src/services/model/types';
import { ITemplateManager, Template } from '../../../src/services/template/types';
import { IStorageProvider } from '../../../src/services/storage/types';

// Define full mocks for the managers
const mockHistoryManager: any = {
  getRecords: vi.fn(),
  clearHistory: vi.fn(),
  addRecord: vi.fn(),
  getRecord: vi.fn(),
  deleteRecord: vi.fn(),
  getIterationChain: vi.fn(),
  getAllChains: vi.fn(),
  createNewChain: vi.fn(),
  addIteration: vi.fn(),
};

const mockModelManager: any = {
  getAllModels: vi.fn(),
  deleteModel: vi.fn(),
  addModel: vi.fn(),
  getModel: vi.fn(),
  updateModel: vi.fn(),
  enableModel: vi.fn(),
  disableModel: vi.fn(),
  getEnabledModels: vi.fn(),
};

const mockTemplateManager: any = {
  listTemplates: vi.fn(),
  deleteTemplate: vi.fn(),
  saveTemplate: vi.fn(),
  getTemplate: vi.fn(),
  exportTemplate: vi.fn(),
  importTemplate: vi.fn(), // DataManager uses saveTemplate for its import logic
  clearCache: vi.fn(),
  listTemplatesByType: vi.fn(),
};

const mockStorage: Partial<IStorageProvider> = {
  getItem: vi.fn(),
  setItem: vi.fn(),
};

describe('DataManager', () => {
  let dataManager: DataManager;

  beforeEach(() => {
    vi.clearAllMocks();
    dataManager = new DataManager(
      mockHistoryManager as IHistoryManager, 
      mockModelManager as IModelManager, 
      mockTemplateManager as ITemplateManager,
      mockStorage as IStorageProvider
    );

    // Default mock implementations
    mockHistoryManager.getRecords.mockResolvedValue([]);
    mockModelManager.getAllModels.mockResolvedValue([]);
    mockTemplateManager.listTemplates.mockResolvedValue([]);
    mockStorage.getItem = vi.fn().mockResolvedValue(null);
  });

  describe('exportAllData', () => {
    it('should fetch data from all managers and serialize to JSON, filtering built-in templates', async () => {
      const sampleHistoryRecords: PromptRecord[] = [
        { 
          id: 'history1', 
          originalPrompt: 'Test prompt 1', 
          optimizedPrompt: 'Optimized response 1', 
          timestamp: new Date().getTime(),
          type: 'optimize',
          chainId: 'chain1',
          version: 1,
          modelKey: 'model1',
          templateId: 'template1'
        },
        { 
          id: 'history2', 
          originalPrompt: 'Test prompt 2', 
          optimizedPrompt: 'Optimized response 2', 
          timestamp: new Date().getTime(),
          type: 'iterate',
          chainId: 'chain2',
          version: 1,
          modelKey: 'model2',
          templateId: 'template2'
        }
      ];

      const sampleModels = [
        { key: 'model1', name: 'Model 1', provider: 'openai', enabled: true },
        { key: 'model2', name: 'Model 2', provider: 'custom', enabled: false }
      ];

      const sampleTemplates = [
        { id: 'template1', name: 'Template 1', content: 'Content 1', isBuiltin: false, type: 'optimize' },
        { id: 'template2', name: 'Template 2', content: 'Content 2', isBuiltin: true, type: 'iterate' },
        { id: 'template3', name: 'Template 3', content: 'Content 3', isBuiltin: false, type: 'iterate' }
      ];

      const sampleUISettings = {
        'theme-id': 'dark',
        'preferred-language': 'zh-CN',
        'app:selected-optimize-model': 'model1'
      };

      mockHistoryManager.getRecords.mockResolvedValue(sampleHistoryRecords);
      mockModelManager.getAllModels.mockResolvedValue(sampleModels);
      mockTemplateManager.listTemplates.mockResolvedValue(sampleTemplates);
      
      // Mock storage returns
      mockStorage.getItem = vi.fn().mockImplementation((key: string) => {
        return Promise.resolve(sampleUISettings[key as keyof typeof sampleUISettings] || null);
      });

      const result = await dataManager.exportAllData();
      const data = JSON.parse(result);

      expect(data).toHaveProperty('history');
      expect(data).toHaveProperty('models');
      expect(data).toHaveProperty('userTemplates');
      expect(data).toHaveProperty('userSettings');

      expect(data.history).toEqual(sampleHistoryRecords);
      expect(data.models).toEqual(sampleModels);
      
      // Should only include user templates (isBuiltin = false)
      expect(data.userTemplates.length).toBe(2);
      expect(data.userTemplates.some((t: any) => t.id === 'template1')).toBe(true);
      expect(data.userTemplates.some((t: any) => t.id === 'template3')).toBe(true);
      expect(data.userTemplates.some((t: any) => t.id === 'template2')).toBe(false);
      
      // Should include UI settings
      expect(data.userSettings).toEqual({
        'theme-id': 'dark',
        'preferred-language': 'zh-CN',
        'app:selected-optimize-model': 'model1'
      });
    });

    it('should return empty data and settings in JSON if all managers return empty data', async () => {
      const result = await dataManager.exportAllData();
      const data = JSON.parse(result);

      expect(data.history).toEqual([]);
      expect(data.models).toEqual([]);
      expect(data.userTemplates).toEqual([]);
      expect(data.userSettings).toEqual({});
    });
  });

  describe('importAllData', () => {
    const sampleData = {
      history: [
        { 
          id: 'history1', 
          originalPrompt: 'Test prompt 1', 
          optimizedPrompt: 'Optimized response 1', 
          timestamp: new Date().getTime(),
          type: 'optimize' as const,
          chainId: 'chain1',
          version: 1,
          modelKey: 'model1',
          templateId: 'template1'
        }
      ],
      models: [
        { key: 'model1', name: 'Model 1', provider: 'openai', enabled: true }
      ],
      userTemplates: [
        { id: 'template1', name: 'Template 1', content: 'Content 1', isBuiltin: false, type: 'optimize' }
      ]
    };

    it('should clear existing data and import new data correctly', async () => {
      await dataManager.importAllData(JSON.stringify(sampleData));

      // Should clear existing data first
      expect(mockHistoryManager.clearHistory).toHaveBeenCalled();
      expect(mockTemplateManager.deleteTemplate).not.toHaveBeenCalled(); // Templates are deleted individually

      // Should import new data
      expect(mockHistoryManager.addRecord).toHaveBeenCalledTimes(sampleData.history.length);
      expect(mockModelManager.addModel).toHaveBeenCalledTimes(sampleData.models.length);
      expect(mockTemplateManager.saveTemplate).toHaveBeenCalledTimes(sampleData.userTemplates.length);
    });

    it('should throw an error for invalid JSON string', async () => {
      await expect(dataManager.importAllData('invalid-json')).rejects.toThrow('Invalid data format');
    });

    it('should throw an error for null or non-object data', async () => {
      await expect(dataManager.importAllData("null")).rejects.toThrow('Invalid data format');
      await expect(dataManager.importAllData("[]")).rejects.toThrow('Invalid data format');
    });

    it('should throw an error if history is not an array', async () => {
      const invalidData = { ...sampleData, history: 'not-an-array' };
      await expect(dataManager.importAllData(JSON.stringify(invalidData))).rejects.toThrow('Invalid history format');
    });

    it('should throw an error if models is not an array', async () => {
      const invalidData = { ...sampleData, models: 'not-an-array' };
      await expect(dataManager.importAllData(JSON.stringify(invalidData))).rejects.toThrow('Invalid models format');
    });

    it('should throw an error if userTemplates is not an array', async () => {
      const invalidData = { ...sampleData, userTemplates: 'not-an-array' };
      await expect(dataManager.importAllData(JSON.stringify(invalidData))).rejects.toThrow('Invalid user templates format');
    });

    it('should successfully import partial data (only history)', async () => {
      const partialData = { history: sampleData.history };
      await dataManager.importAllData(JSON.stringify(partialData));

      expect(mockHistoryManager.clearHistory).toHaveBeenCalled();
      expect(mockHistoryManager.addRecord).toHaveBeenCalled();
      expect(mockModelManager.addModel).not.toHaveBeenCalled();
      expect(mockTemplateManager.saveTemplate).not.toHaveBeenCalled();
    });

    it('should continue importing other items if one item fails and logs a warning', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const problematicHistory = [
        { 
          id: 'history1', 
          originalPrompt: 'Valid prompt', 
          optimizedPrompt: 'Valid response', 
          timestamp: new Date().getTime(),
          type: 'optimize' as const,
          chainId: 'chain1',
          version: 1,
          modelKey: 'model1',
          templateId: 'template1'
        },
        { 
          id: 'history2', 
          originalPrompt: 'Invalid prompt',
          // Missing required fields
          optimizedPrompt: 'Invalid response',
          timestamp: new Date().getTime(),
          type: 'optimize' as const,
          chainId: 'chain2',
          version: 1,
          modelKey: 'model2',
          // Missing templateId
        }
      ];

      const data = {
        history: problematicHistory,
        models: sampleData.models,
        userTemplates: sampleData.userTemplates
      };

      // Make the second history item fail
      mockHistoryManager.addRecord.mockImplementation((record: any) => {
        if (record.id === 'history2') {
          return Promise.reject(new Error('Invalid record'));
        }
        return Promise.resolve();
      });

      await dataManager.importAllData(JSON.stringify(data));

      expect(mockHistoryManager.addRecord).toHaveBeenCalledTimes(problematicHistory.length);
      expect(mockModelManager.addModel).toHaveBeenCalledTimes(sampleData.models.length);
      expect(mockTemplateManager.saveTemplate).toHaveBeenCalledTimes(sampleData.userTemplates.length);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should correctly clear only user templates, not built-in ones', async () => {
      const userTemplateIds = ['user-template-1', 'user-template-2'];
      
      const allTemplates = [
        { id: 'builtin1', name: 'Built-in 1', isBuiltin: true },
        { id: userTemplateIds[0], name: 'User 1', isBuiltin: false },
        { id: userTemplateIds[1], name: 'User 2', isBuiltin: false }
      ];
      
      mockTemplateManager.listTemplates.mockResolvedValue(allTemplates);
      
      await dataManager.importAllData(JSON.stringify(sampleData));
      
      // Should delete only user templates
      expect(mockTemplateManager.deleteTemplate).toHaveBeenCalledTimes(userTemplateIds.length);
      userTemplateIds.forEach(id => {
        expect(mockTemplateManager.deleteTemplate).toHaveBeenCalledWith(id);
      });
    });
  });
});
