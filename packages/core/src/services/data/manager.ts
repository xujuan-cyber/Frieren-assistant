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
          // 验证模型配置的基本字段，对于旧版本数据要宽松一些
          if (!model.key || !model.name) {
            console.warn(`跳过无效的模型配置: 缺少关键字段 (key: ${model.key}, name: ${model.name})`);
            continue;
          }
          
          // 检查模型是否已存在（包括内置模型）
          const existingModel = await this.modelManagerInstance.getModel(model.key);
          
          if (existingModel) {
            // 内置模型和自定义模型都允许更新配置，使用导入文件中的启用状态
            const mergedConfig: ModelConfig = { 
              name: model.name,
              baseURL: model.baseURL || existingModel.baseURL,
              models: model.models || existingModel.models,
              defaultModel: model.defaultModel || existingModel.defaultModel,
              provider: model.provider || existingModel.provider,
              enabled: model.enabled !== undefined ? model.enabled : existingModel.enabled, // 优先使用导入的启用状态
              ...(model.apiKey !== undefined && { apiKey: model.apiKey }),
              ...(model.useVercelProxy !== undefined && { useVercelProxy: model.useVercelProxy }),
              ...(model.llmParams !== undefined && { llmParams: model.llmParams })
            };
            await this.modelManagerInstance.updateModel(model.key, mergedConfig);
            console.log(`模型 ${model.key} 已存在，已更新配置（使用导入的启用状态: ${mergedConfig.enabled}）`);
          } else {
            // 如果模型不存在，添加新的自定义模型，使用导入文件中的启用状态
            const newModelConfig: ModelConfig = {
              name: model.name,
              baseURL: model.baseURL || 'https://api.example.com/v1', // 提供默认值
              models: model.models || [],
              defaultModel: model.defaultModel || (model.models && model.models[0]) || 'default-model',
              provider: model.provider || 'custom',
              enabled: model.enabled !== undefined ? model.enabled : false, // 使用导入的启用状态，默认为false
              ...(model.apiKey !== undefined && { apiKey: model.apiKey }),
              ...(model.useVercelProxy !== undefined && { useVercelProxy: model.useVercelProxy }),
              ...(model.llmParams !== undefined && { llmParams: model.llmParams })
            };
            await this.modelManagerInstance.addModel(model.key, newModelConfig);
            console.log(`已导入新模型 ${model.key}（启用状态: ${newModelConfig.enabled}）`);
          }
        } catch (error) {
          console.warn(`导入模型 ${model.key} 时发生错误:`, error);
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
          // 验证模板的基本字段，对于旧版本数据要宽松一些
          if (!template.id || !template.name || !template.content) {
            console.warn(`跳过无效的模板配置: 缺少关键字段 (id: ${template.id}, name: ${template.name})`);
            continue;
          }
          
          // 检查是否与内置模板ID冲突
          const builtinTemplate = existingTemplates.find(t => t.id === template.id && t.isBuiltin);
          let finalTemplateId = template.id;
          let finalTemplateName = template.name;
          
          if (builtinTemplate) {
            // 为冲突的模板生成新的ID和名称
            const timestamp = Date.now();
            const random = Math.random().toString(36).substr(2, 6);
            finalTemplateId = `user-${template.id}-${timestamp}-${random}`;
            finalTemplateName = `${template.name} (导入副本)`;
            console.warn(`检测到与内置模板ID冲突: ${template.id}，已重命名为: ${finalTemplateId}`);
          }
          
          // 确保导入的模板标记为用户模板，并为缺失字段提供默认值
          const userTemplate: Template = {
            ...template,
            id: finalTemplateId,
            name: finalTemplateName,
            isBuiltin: false,
            metadata: {
              version: template.metadata?.version || '1.0.0',
              lastModified: Date.now(), // 更新为当前时间
              templateType: template.metadata?.templateType || 'optimize', // 为旧版本数据提供默认类型
              author: template.metadata?.author || 'User', // 导入的模板标记为用户创建
              ...(template.metadata?.description && { description: template.metadata.description })
            }
          };
          
          await this.templateManagerInstance.saveTemplate(userTemplate);
          console.log(`已导入模板: ${finalTemplateId} (${finalTemplateName})`);
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
