import { ref, watch, onMounted } from 'vue'
import type { Ref } from 'vue'
import type { ModelConfig, ModelManager } from '@prompt-optimizer/core'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'

export interface ModelManagerHooks {
  showConfig: Ref<boolean>
  selectedOptimizeModel: Ref<string>
  selectedTestModel: Ref<string>
  handleModelManagerClose: () => void
  handleModelsUpdated: (modelKey: string) => void
  handleModelSelect: (model: ModelConfig & { key: string }) => void
  initModelSelection: () => void
  loadModels: () => void
}

export interface ModelManagerOptions {
  modelManager: ModelManager
  optimizeModelSelect: Ref<any>
  testModelSelect: Ref<any>
}

// Local storage keys
const STORAGE_KEYS = {
  OPTIMIZE_MODEL: 'app:selected-optimize-model',
  TEST_MODEL: 'app:selected-test-model'
} as const

export function useModelManager(options: ModelManagerOptions): ModelManagerHooks {
  const toast = useToast()
  const { t } = useI18n()
  const showConfig = ref(false)
  const selectedOptimizeModel = ref('')
  const selectedTestModel = ref('')
  
  const { modelManager, optimizeModelSelect, testModelSelect } = options

  // Save model selection
  const saveModelSelection = (model: string, type: 'optimize' | 'test') => {
    if (model) {
      localStorage.setItem(
        type === 'optimize' ? STORAGE_KEYS.OPTIMIZE_MODEL : STORAGE_KEYS.TEST_MODEL,
        model
      )
    }
  }

  // Initialize model selection
  const initModelSelection = () => {
    try {
      const enabledModels = modelManager.getAllModels().filter(m => m.enabled)
      const defaultModel = enabledModels[0]?.key

      if (defaultModel) {
        // Load optimization model selection
        const savedOptimizeModel = localStorage.getItem(STORAGE_KEYS.OPTIMIZE_MODEL)
        selectedOptimizeModel.value = (savedOptimizeModel && enabledModels.find(m => m.key === savedOptimizeModel))
          ? savedOptimizeModel
          : defaultModel

        // Load test model selection
        const savedTestModel = localStorage.getItem(STORAGE_KEYS.TEST_MODEL)
        selectedTestModel.value = (savedTestModel && enabledModels.find(m => m.key === savedTestModel))
          ? savedTestModel
          : defaultModel

        // Save initial selection
        saveModelSelection(selectedOptimizeModel.value, 'optimize')
        saveModelSelection(selectedTestModel.value, 'test')
      }
    } catch (error) {
      console.error(t('toast.error.initModelSelectFailed'), error)
      toast.error(t('toast.error.initModelSelectFailed'))
    }
  }

  // Handle model selection
  const handleModelSelect = (model: ModelConfig & { key: string }) => {
    if (model) {
      selectedOptimizeModel.value = model.key
      selectedTestModel.value = model.key
      
      saveModelSelection(model.key, 'optimize')
      saveModelSelection(model.key, 'test')
      
      toast.success(t('toast.success.modelSelected', { name: model.name }))
    }
  }

  // Load model data
  const loadModels = () => {
    try {
      // Get latest enabled models list
      const enabledModels = modelManager.getAllModels().filter(m => m.enabled)
      const defaultModel = enabledModels[0]?.key

      // Verify if current selected models are still available
      if (!enabledModels.find(m => m.key === selectedOptimizeModel.value)) {
        selectedOptimizeModel.value = defaultModel || ''
      }
      if (!enabledModels.find(m => m.key === selectedTestModel.value)) {
        selectedTestModel.value = defaultModel || ''
      }
    } catch (error: any) {
      console.error(t('toast.error.loadModelsFailed'), error)
      toast.error(t('toast.error.loadModelsFailed'))
    }
  }

  const handleModelManagerClose = () => {
    // Update data first
    loadModels()
    // Refresh model selection components
    optimizeModelSelect.value?.refresh()
    testModelSelect.value?.refresh()
    // Close interface
    showConfig.value = false
  }

  const handleModelsUpdated = (modelKey: string) => {
    // Handle other logic after model update if needed
    console.log(t('toast.info.modelUpdated'), modelKey)
  }

  // Watch model selection changes
  watch(selectedOptimizeModel, (newVal) => {
    if (newVal) {
      saveModelSelection(newVal, 'optimize')
    }
  })

  watch(selectedTestModel, (newVal) => {
    if (newVal) {
      saveModelSelection(newVal, 'test')
    }
  })

  // Auto initialize on mounted
  onMounted(() => {
    initModelSelection()
  })

  return {
    showConfig,
    selectedOptimizeModel,
    selectedTestModel,
    handleModelManagerClose,
    handleModelsUpdated,
    handleModelSelect,
    initModelSelection,
    loadModels
  }
} 