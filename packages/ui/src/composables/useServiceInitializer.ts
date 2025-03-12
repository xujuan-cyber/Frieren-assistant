import { ref, onMounted } from 'vue'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'
import type { ModelManager, TemplateManager, HistoryManager, PromptService } from '@prompt-optimizer/core'
import { createLLMService, createPromptService } from '@prompt-optimizer/core'

export function useServiceInitializer(
  modelManager: ModelManager,
  templateManager: TemplateManager,
  historyManager: HistoryManager
) {
  const toast = useToast()
  const { t } = useI18n()
  const promptServiceRef = ref<PromptService | null>(null)
  const llmService = createLLMService(modelManager)

  // Initialize base services
  const initBaseServices = () => {
    try {
      console.log(t('log.info.initBaseServicesStart'))

      // Get and verify template list
      const templates = templateManager.listTemplates()
      console.log(t('log.info.templateList'), templates)

      // Create prompt service
      console.log(t('log.info.createPromptService'))
      promptServiceRef.value = createPromptService(modelManager, llmService, templateManager, historyManager)
      
      console.log(t('log.info.initComplete'))
    } catch (error) {
      console.error(t('log.error.initBaseServicesFailed'), error)
      toast.error(t('toast.error.initFailed', { error: error instanceof Error ? error.message : String(error) }))
      throw error
    }
  }

  // Auto initialize on mounted
  onMounted(() => {
    initBaseServices()
  })

  return {
    promptServiceRef,
    initBaseServices
  }
} 