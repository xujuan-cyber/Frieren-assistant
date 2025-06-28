import type {
  IStorageProvider,
  IModelManager,
  ITemplateManager,
  IHistoryManager,
  DataManager,
  ILLMService,
  IPromptService,
  TemplateLanguageService
} from '@prompt-optimizer/core'

/**
 * 统一的应用服务接口定义
 */
export interface AppServices {
  storageProvider: IStorageProvider;
  modelManager: IModelManager;
  templateManager: ITemplateManager;
  historyManager: IHistoryManager;
  dataManager: DataManager;
  llmService: ILLMService;
  promptService: IPromptService;
  templateLanguageService: TemplateLanguageService;
} 