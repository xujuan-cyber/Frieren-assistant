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

// FIXME: Temporary workaround for build issue. Should be imported from @prompt-optimizer/core
export interface IPreferenceService {
  get<T>(key: string, defaultValue: T): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

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
  preferenceService: IPreferenceService;
} 