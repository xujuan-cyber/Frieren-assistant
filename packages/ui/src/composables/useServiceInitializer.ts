import { ref, onMounted } from 'vue'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'
import type { ModelManager, TemplateManager, HistoryManager, PromptService, ILLMService } from '@prompt-optimizer/core'
import { 
  createLLMService, 
  createPromptService, 
  ElectronConfigManager,
  isElectronRenderer,
  ElectronLLMProxy,
  ElectronModelManagerProxy,
  ElectronTemplateManagerProxy,
  ElectronHistoryManagerProxy
} from '@prompt-optimizer/core'


export function useServiceInitializer(
  modelManager: ModelManager,
  templateManager: TemplateManager,
  historyManager: HistoryManager
) {
  const toast = useToast()
  const { t } = useI18n()
  const promptServiceRef = ref<PromptService | null>(null)

  const initBaseServices = async () => {
    try {
      console.log(t('log.info.initBaseServicesStart'))

      // Environment detection and service creation
      let llmService: ILLMService
      let effectiveModelManager: ModelManager
      let effectiveTemplateManager: TemplateManager
      let effectiveHistoryManager: HistoryManager

      if (isElectronRenderer()) {
        console.log('[Service Initializer] Electron environment detected, using proxy services')
        
        // 在Electron环境下，先同步配置确保状态一致
        console.log('[Service Initializer] Syncing config from main process...')
        const configManager = ElectronConfigManager.getInstance()
        await configManager.syncFromMainProcess()
        console.log('[Service Initializer] Config synced successfully')
        
        // Use proxy services for Electron environment
        llmService = new ElectronLLMProxy()
        effectiveModelManager = new ElectronModelManagerProxy() as any
        effectiveTemplateManager = new ElectronTemplateManagerProxy() as any
        effectiveHistoryManager = new ElectronHistoryManagerProxy() as any
        
        console.log('[Service Initializer] Electron proxy services created')
      } else {
        console.log('[Service Initializer] Web environment detected, using direct services')
        
        // Use provided services for Web environment
        llmService = createLLMService(modelManager)
        effectiveModelManager = modelManager
        effectiveTemplateManager = templateManager
        effectiveHistoryManager = historyManager
        
        // Ensure the template manager is initialized in web environment
        await effectiveTemplateManager.ensureInitialized()
        
        console.log('[Service Initializer] Web services initialized')
      }

      // Create prompt service with the effective services
      console.log(t('log.info.createPromptService'))
      promptServiceRef.value = createPromptService(llmService, effectiveModelManager)

      console.log(t('log.info.initComplete'))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(t('log.error.initBaseServicesFailed'), error)
      toast.error(t('toast.error.initFailed', { error: errorMessage }))
    }
  }

  onMounted(initBaseServices)

  return {
    promptServiceRef,
    initBaseServices
  }
} 