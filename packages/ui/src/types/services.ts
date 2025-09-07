import type {
  IModelManager,
  ITemplateManager,
  IHistoryManager,
  IDataManager,
  ILLMService,
  IPromptService,
  ITemplateLanguageService,
  ICompareService,
  IPreferenceService,
  ContextRepo
} from '@prompt-optimizer/core'

/**
 * 统一的应用服务接口定义
 */
export interface AppServices {
  modelManager: IModelManager;
  templateManager: ITemplateManager;
  historyManager: IHistoryManager;
  dataManager: IDataManager;
  llmService: ILLMService;
  promptService: IPromptService;
  templateLanguageService: ITemplateLanguageService;
  preferenceService: IPreferenceService;
  compareService: ICompareService;
  contextRepo: ContextRepo;
}