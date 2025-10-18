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
  ContextRepo,
  IImageModelManager,
  IImageService,
  IImageAdapterRegistry,
  ITextAdapterRegistry,
  IFavoriteManager
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
  favoriteManager: IFavoriteManager;
  // 文本模型适配器注册表（本地实例）
  textAdapterRegistry?: ITextAdapterRegistry;
  // 图像相关（Web 优先，可选）
  imageModelManager?: IImageModelManager;
  imageService?: IImageService;
  imageAdapterRegistry?: IImageAdapterRegistry;
}
