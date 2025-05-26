import { historyManager } from '../history/manager';
import { IHistoryManager, PromptRecord } from '../history/types';
import { modelManager } from '../model/manager';
import { IModelManager, ModelConfig } from '../model/types';
import { templateManager } from '../template/manager';
import { ITemplateManager, Template } from '../template/types';
import { StorageFactory } from '../storage/factory';
import { IStorageProvider } from '../storage/types';

interface AllData {
  history?: PromptRecord[];
  models?: Array<ModelConfig & { key: string }>; // Matching ModelManager.getAllModels() return type
  userTemplates?: Template[];
  userSettings?: Record<string, string>; // UI配置数据
}

// 需要导出的UI配置键
const UI_SETTINGS_KEYS = [
  'theme-id',
  'preferred-language', 
  'app:selected-optimize-model',
  'app:selected-test-model',
  'app:selected-optimize-template',
  'app:selected-iterate-template'
] as const;

/**
 * 验证UI配置键是否安全
 */
const isValidSettingKey = (key: string): boolean => {
  return UI_SETTINGS_KEYS.includes(key as any) && 
         key.length <= 50 && 
         key.length > 0 &&
         !/[<>"\\'&\x00-\x1f\x7f-\x9f]/.test(key); // 排除危险字符和控制字符
};

/**
 * 验证UI配置值是否安全
 */
const isValidSettingValue = (value: any): value is string => {
  return typeof value === 'string' && 
         value.length <= 1000 && // 限制值的长度
         !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/.test(value); // 排除控制字符
};

export class DataManager {
  private storage: IStorageProvider;

  constructor(
    private historyManagerInstance: IHistoryManager,
    private modelManagerInstance: IModelManager,
    private templateManagerInstance: ITemplateManager,
    storage?: IStorageProvider
  ) {
    this.storage = storage || StorageFactory.createDefault();
  }

  async exportAllData(): Promise<string> {
    const historyRecords = await this.historyManagerInstance.getRecords();
    const modelConfigs = await this.modelManagerInstance.getAllModels();
    const allTemplates = await this.templateManagerInstance.listTemplates();
    
    // Only export user templates (isBuiltin = false)
    const userTemplates = allTemplates.filter(template => !template.isBuiltin);
    
    // Export UI settings
    const userSettings: Record<string, string> = {};
    for (const key of UI_SETTINGS_KEYS) {
      try {
        const value = await this.storage.getItem(key);
        if (value !== null) {
          userSettings[key] = value;
        }
      } catch (error) {
        console.warn(`导出UI配置失败 (${key}):`, error);
      }
    }
    
    const data: AllData = {
      history: historyRecords,
      models: modelConfigs,
      userTemplates,
      userSettings
    };
    
    return JSON.stringify(data, null, 2); // 格式化输出，便于调试
  }

  async importAllData(dataString: string): Promise<void> {
    let data: unknown;
    
    try {
      data = JSON.parse(dataString);
    } catch (error) {
      throw new Error('Invalid data format: failed to parse JSON');
    }
    
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Invalid data format: data must be an object');
    }
    
    const typedData = data as AllData;
    
    // Import history records
    if (typedData.history !== undefined) {
      if (!Array.isArray(typedData.history)) {
        throw new Error('Invalid history format: must be an array');
      }
      
      await this.historyManagerInstance.clearHistory();
      
      const failedRecords: { record: PromptRecord; error: Error }[] = [];
      
      // Import each record individually, capturing failures
      for (const record of typedData.history) {
        try {
          await this.historyManagerInstance.addRecord(record);
        } catch (error) {
          console.warn('Failed to import history record:', error);
          failedRecords.push({ record, error: error as Error });
        }
      }
      
      if (failedRecords.length > 0) {
        console.warn(`Failed to import ${failedRecords.length} history records`);
      }
    }
    
    // Import model configs
    if (typedData.models !== undefined) {
      if (!Array.isArray(typedData.models)) {
        throw new Error('Invalid models format: must be an array');
      }
      
      const failedModels: { model: ModelConfig & { key: string }; error: Error }[] = [];
      
      // Import each model individually, capturing failures
      for (const model of typedData.models) {
        try {
          // 检查模型是否已存在
          const existingModel = await this.modelManagerInstance.getModel(model.key);
          
          if (existingModel) {
            // 如果模型已存在，使用合并逻辑而不是直接替换
            const mergedConfig = { 
              ...existingModel, 
              ...model,
              // 保留原有的enabled状态，除非明确指定
              enabled: model.enabled !== undefined ? model.enabled : existingModel.enabled
            };
            await this.modelManagerInstance.updateModel(model.key, mergedConfig);
            console.log(`模型 ${model.key} 已存在，已更新配置`);
          } else {
            // 如果模型不存在，添加新模型
            await this.modelManagerInstance.addModel(model.key, model);
            console.log(`已导入新模型 ${model.key}`);
          }
        } catch (error) {
          // 增强错误处理，区分不同类型的错误
          if (error instanceof Error) {
            if (error.message.includes('模型配置') || error.message.includes('ModelConfig')) {
              console.warn(`跳过无效的模型配置 ${model.key}:`, error.message);
            } else {
              console.warn(`导入模型 ${model.key} 时发生错误:`, error.message);
            }
          } else {
            console.warn('导入模型时发生未知错误:', error);
          }
          failedModels.push({ model, error: error as Error });
        }
      }
      
      if (failedModels.length > 0) {
        console.warn(`Failed to import ${failedModels.length} models`);
      }
    }
    
    // Import user templates
    if (typedData.userTemplates !== undefined) {
      if (!Array.isArray(typedData.userTemplates)) {
        throw new Error('Invalid user templates format: must be an array');
      }
      
      // Get existing user templates to clean up
      const existingTemplates = await this.templateManagerInstance.listTemplates();
      const userTemplateIds = existingTemplates
        .filter(template => !template.isBuiltin)
        .map(template => template.id);
      
      // Delete all existing user templates
      for (const id of userTemplateIds) {
        try {
          await this.templateManagerInstance.deleteTemplate(id);
        } catch (error) {
          console.warn(`Failed to delete template ${id}:`, error);
        }
      }
      
      const failedTemplates: { template: Template; error: Error }[] = [];
      
      // Import each template individually, capturing failures
      for (const template of typedData.userTemplates) {
        try {
          await this.templateManagerInstance.saveTemplate(template);
        } catch (error) {
          console.warn('Failed to import template:', error);
          failedTemplates.push({ template, error: error as Error });
        }
      }
      
      if (failedTemplates.length > 0) {
        console.warn(`Failed to import ${failedTemplates.length} templates`);
      }
    }
    
    // Import UI settings
    if (typedData.userSettings !== undefined) {
      if (typeof typedData.userSettings !== 'object' || Array.isArray(typedData.userSettings)) {
        throw new Error('Invalid user settings format: must be an object');
      }
      
      const failedSettings: { key: string; error: Error }[] = [];
      
      for (const [key, value] of Object.entries(typedData.userSettings)) {
        try {
          // 验证键名是否安全且在白名单中
          if (!isValidSettingKey(key)) {
            console.warn(`跳过无效的UI配置键: ${key}`);
            continue;
          }
          
          // 验证值是否安全
          if (!isValidSettingValue(value)) {
            console.warn(`跳过无效的UI配置值 ${key}: 类型=${typeof value}`);
            continue;
          }
          
          await this.storage.setItem(key, value);
          console.log(`已导入UI配置: ${key} = ${value}`);
        } catch (error) {
          console.warn(`Failed to import UI setting ${key}:`, error);
          failedSettings.push({ key, error: error as Error });
        }
      }
      
      if (failedSettings.length > 0) {
        console.warn(`Failed to import ${failedSettings.length} UI settings`);
      }
    }
  }
}

// Export a singleton instance, injecting the existing singletons
export const dataManager = new DataManager(
  historyManager,
  modelManager,
  templateManager
);
