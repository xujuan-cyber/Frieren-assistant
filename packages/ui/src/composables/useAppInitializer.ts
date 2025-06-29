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
  waitForElectronApi,
  DataManager,
  ElectronPreferenceServiceProxy,
  createPreferenceService,
} from '../'; // 从UI包的index导入所有核心模块
import type { AppServices } from '../types/services';
import type { IStorageProvider, IModelManager, ITemplateManager, IHistoryManager, ILLMService, IPromptService } from '@prompt-optimizer/core';
import type { IPreferenceService } from '../types/services';

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
      let preferenceService: IPreferenceService;

      if (isRunningInElectron()) {
        console.log('[AppInitializer] 检测到Electron环境，等待API就绪...');
        
        // 等待 Electron API 完全就绪
        const apiReady = await waitForElectronApi();
        if (!apiReady) {
          throw new Error('Electron API 初始化超时，请检查preload脚本是否正确加载');
        }
        
        console.log('[AppInitializer] Electron API 就绪，初始化代理服务...');
        // 在Electron渲染进程中，我们需要创建一个代理存储提供器
        // 这个代理会将所有存储操作转发到主进程
        storageProvider = {
          async getItem(key: string): Promise<string | null> {
            console.warn('[ElectronStorageProxy] getItem called, but storage should be handled by main process');
            return null;
          },
          async setItem(key: string, value: string): Promise<void> {
            console.warn('[ElectronStorageProxy] setItem called, but storage should be handled by main process');
          },
          async removeItem(key: string): Promise<void> {
            console.warn('[ElectronStorageProxy] removeItem called, but storage should be handled by main process');
          },
          async clearAll(): Promise<void> {
            console.warn('[ElectronStorageProxy] clear called, but storage should be handled by main process');
          },
          async updateData<T>(key: string, modifier: (currentValue: T | null) => T): Promise<void> {
            console.warn('[ElectronStorageProxy] updateData called, but storage should be handled by main process');
          },
          async batchUpdate(operations: Array<{ key: string; operation: 'set' | 'remove'; value?: string }>): Promise<void> {
            console.warn('[ElectronStorageProxy] batchUpdate called, but storage should be handled by main process');
          }
        };

        // 在Electron环境中，我们实例化所有轻量级的代理类
        modelManager = new ElectronModelManagerProxy();
        templateManager = new ElectronTemplateManagerProxy();
        historyManager = new ElectronHistoryManagerProxy();
        llmService = new ElectronLLMProxy();
        promptService = new ElectronPromptServiceProxy();
        preferenceService = new ElectronPreferenceServiceProxy();

        // DataManager在Electron环境下也使用代理模式，不需要本地存储
        // 创建一个空的DataManager，因为所有操作都通过代理进行
        dataManager = {
          exportData: async () => { throw new Error('Export not implemented in Electron proxy mode'); },
          importData: async () => { throw new Error('Import not implemented in Electron proxy mode'); },
          clearAllData: async () => { throw new Error('Clear not implemented in Electron proxy mode'); }
        } as any;

        // 在Electron环境中，模板语言服务由主进程管理，渲染进程不需要初始化

        services.value = {
          storageProvider, // 使用代理存储提供器
          modelManager,
          templateManager,
          historyManager,
          dataManager,
          llmService,
          promptService,
          templateLanguageService: null as any, // 由主进程管理
          preferenceService, // 使用从core包导入的ElectronPreferenceServiceProxy
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
        templateManager = templateManagerInstance;
        console.log('[AppInitializer] TemplateManager instance in Web:', templateManager);
        
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
        
        // 创建基于存储提供器的偏好设置服务，使用core包中的createPreferenceService
        preferenceService = createPreferenceService(storageProvider);

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
        preferenceService, // 使用从core包导入的PreferenceService
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