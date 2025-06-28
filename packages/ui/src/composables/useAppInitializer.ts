import { ref, onMounted } from 'vue';
import {
  StorageFactory,
  createModelManager,
  createTemplateManager,
  createHistoryManager,
  createDataManager,
  createLLMService,
  createPromptService,
  createTemplateLanguageService,
  ElectronModelManagerProxy,
  ElectronTemplateManagerProxy,
  ElectronHistoryManagerProxy,
  ElectronLLMProxy,
  ElectronPromptServiceProxy,
  isRunningInElectron,
  DataManager,
} from '../'; // 从UI包的index导入所有核心模块
import type { AppServices } from '../types/services';
import type { IStorageProvider, IModelManager, ITemplateManager, IHistoryManager, ILLMService, IPromptService } from '@prompt-optimizer/core';

/**
 * 应用服务统一初始化器。
 * 负责根据运行环境（Web 或 Electron）创建和初始化所有核心服务。
 * @returns { services, isInitializing, error }
 */
export function useAppInitializer() {
  const services = ref<AppServices | null>(null);
  const isInitializing = ref(true);
  const error = ref<Error | null>(null);

  onMounted(async () => {
    try {
      console.log('[AppInitializer] 开始应用初始化...');
      let storageProvider: IStorageProvider;
      let modelManager: IModelManager;
      let templateManager: ITemplateManager;
      let historyManager: IHistoryManager;
      let dataManager: DataManager;
      let llmService: ILLMService;
      let promptService: IPromptService;

      if (isRunningInElectron()) {
        console.log('[AppInitializer] 检测到Electron环境，初始化代理服务...');
        // 在Electron渲染进程中，我们应该使用基于内存的存储而非Dexie，以确保状态与主进程同步
        storageProvider = StorageFactory.create('memory');

        // 在Electron环境中，我们实例化所有轻量级的代理类
        modelManager = new ElectronModelManagerProxy();
        templateManager = new ElectronTemplateManagerProxy();
        historyManager = new ElectronHistoryManagerProxy();
        llmService = new ElectronLLMProxy();
        promptService = new ElectronPromptServiceProxy();
        
        // DataManager in electron requires special handling, as it depends on other managers.
        // We create it using the proxy instances.
        dataManager = createDataManager(modelManager, templateManager, historyManager, storageProvider);
        
        // 在 Electron 环境中也提供 templateLanguageService
        const languageService = createTemplateLanguageService(storageProvider);
        await languageService.initialize();

        services.value = {
          storageProvider,
          modelManager,
          templateManager,
          historyManager,
          dataManager,
          llmService,
          promptService,
          templateLanguageService: languageService,
        };
        console.log('[AppInitializer] Electron代理服务初始化完成');

      } else {
        console.log('[AppInitializer] 检测到Web环境，初始化完整服务...');
        // 在Web环境中，我们创建一套完整的、真实的服务
        storageProvider = StorageFactory.create('dexie');
        const languageService = createTemplateLanguageService(storageProvider);
        
        // Services with no dependencies or only storage
        const modelManagerInstance = createModelManager(storageProvider);
        
        // Initialize language service first, as template manager depends on it
        console.log('[AppInitializer] 初始化语言服务...');
        await languageService.initialize();
        
        const templateManagerInstance = createTemplateManager(storageProvider, languageService);
        
        // Initialize managers that depend on other managers
        const historyManagerInstance = createHistoryManager(storageProvider, modelManagerInstance);
        
        // Now ensure all managers with async init are ready
        console.log('[AppInitializer] 确保所有管理器初始化完成...');
        await Promise.all([
          modelManagerInstance.ensureInitialized(),
          templateManagerInstance.ensureInitialized(),
        ]);

        // Assign instances after they are fully initialized
        modelManager = modelManagerInstance;
        templateManager = templateManagerInstance;
        historyManager = historyManagerInstance;

        // Services that depend on initialized managers
        console.log('[AppInitializer] 创建依赖其他管理器的服务...');
        llmService = createLLMService(modelManagerInstance);
        promptService = createPromptService(modelManager, llmService, templateManager, historyManager);
        dataManager = createDataManager(modelManagerInstance, templateManagerInstance, historyManagerInstance, storageProvider);

        // 将所有服务实例赋值给 services.value
      services.value = {
        storageProvider,
        modelManager,
        templateManager,
        historyManager,
        dataManager,
        llmService,
        promptService,
          templateLanguageService: languageService,
      };
      }

      console.log('[AppInitializer] 所有服务初始化完成');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[AppInitializer] 关键服务初始化失败:", errorMessage);
      console.error("[AppInitializer] 错误详情:", err);
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      isInitializing.value = false;
      console.log('[AppInitializer] 应用初始化完成');
    }
  });

  return { services, isInitializing, error };
} 