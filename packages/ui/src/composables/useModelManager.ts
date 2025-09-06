import { watch, computed, reactive, nextTick, type Ref } from 'vue'
import { MODEL_SELECTION_KEYS, type ModelConfig } from '@prompt-optimizer/core'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'
import { usePreferences } from './usePreferenceManager'
import type { AppServices } from '../types/services'
import type { ModelSelectRefsHooks } from './useModelSelectRefs'

export interface ModelManagerHooks {
  showConfig: boolean
  selectedOptimizeModel: string
  selectedTestModel: string
  handleModelManagerClose: () => void
  handleModelsUpdated: (modelKey: string) => void
  handleModelSelect: (model: ModelConfig & { key: string }) => void
  initModelSelection: () => void
  loadModels: () => void
}

/**
 * 模型管理器Hook
 * @param services 服务实例引用
 * @param modelSelectRefs 模型选择器引用管理器
 * @returns ModelManagerHooks
 */
export function useModelManager(
  services: Ref<AppServices | null>,
  modelSelectRefs: ModelSelectRefsHooks
): ModelManagerHooks {
  const toast = useToast()
  const { t } = useI18n()
  const { getPreference, setPreference } = usePreferences(services)
  
  // 模型管理器引用
  const modelManager = computed(() => services.value?.modelManager)

  // 创建一个 reactive 状态对象
  const state = reactive<ModelManagerHooks>({
    showConfig: false,
    selectedOptimizeModel: '',
    selectedTestModel: '',
    handleModelManagerClose: () => {
      // Close interface first
      state.showConfig = false
      
      // Perform updates asynchronously without blocking
      nextTick(async () => {
        try {
          // Update data
          await state.loadModels()
          // Refresh model selection components using the new refs manager
          await modelSelectRefs.refreshAll()
        } catch (error) {
          console.error('Failed to refresh models after close:', error)
        }
      })
    },
    handleModelsUpdated: (modelKey: string) => {
      // Handle other logic after model update if needed
      console.log(t('toast.info.modelUpdated'), modelKey)
    },
    handleModelSelect: async (model: ModelConfig & { key: string }) => {
      if (model) {
        state.selectedOptimizeModel = model.key
        state.selectedTestModel = model.key
        
        await saveModelSelection(model.key, 'optimize')
        await saveModelSelection(model.key, 'test')
        
        toast.success(t('toast.success.modelSelected', { name: model.name }))
      }
    },
    initModelSelection: async () => {
      try {
        const allModels = await modelManager.value!.getAllModels()
        const enabledModels = allModels.filter(m => m.enabled)
        const defaultModel = enabledModels[0]?.key
  
        if (enabledModels.length > 0) {
          const savedOptimizeModel = await getPreference(MODEL_SELECTION_KEYS.OPTIMIZE_MODEL, defaultModel)
          state.selectedOptimizeModel = enabledModels.some(m => m.key === savedOptimizeModel)
            ? savedOptimizeModel
            : defaultModel

          const savedTestModel = await getPreference(MODEL_SELECTION_KEYS.TEST_MODEL, defaultModel)
          state.selectedTestModel = enabledModels.some(m => m.key === savedTestModel)
            ? savedTestModel
            : defaultModel
  
          await saveModelSelection(state.selectedOptimizeModel, 'optimize')
          await saveModelSelection(state.selectedTestModel, 'test')
        }
      } catch (error) {
        console.error(t('toast.error.initModelSelectFailed'), error)
        toast.error(t('toast.error.initModelSelectFailed'))
      }
    },
    loadModels: async () => {
      try {
        // Get latest enabled models list
        const allModels = await modelManager.value!.getAllModels()
        const enabledModels = allModels.filter((m: any) => m.enabled)
        const defaultModel = enabledModels[0]?.key
  
        // Verify if current selected models are still available
        if (!enabledModels.find((m: any) => m.key === state.selectedOptimizeModel)) {
          state.selectedOptimizeModel = defaultModel || ''
        }
        if (!enabledModels.find((m: any) => m.key === state.selectedTestModel)) {
          state.selectedTestModel = defaultModel || ''
        }
      } catch (error: any) {
        console.error(t('toast.error.loadModelsFailed'), error)
        toast.error(t('toast.error.loadModelsFailed'))
      }
    }
  })

  // Save model selection
  const saveModelSelection = async (model: string, type: 'optimize' | 'test') => {
    if (model) {
      try {
        await setPreference(
          type === 'optimize' ? MODEL_SELECTION_KEYS.OPTIMIZE_MODEL : MODEL_SELECTION_KEYS.TEST_MODEL,
          model
        )
      } catch (error) {
        console.error(`保存模型选择失败 (${type}):`, error)
        throw error;
      }
    }
  }

  // Watch model selection changes
  watch(() => state.selectedOptimizeModel, async (newVal) => {
    if (newVal) {
      await saveModelSelection(newVal, 'optimize')
    }
  })

  watch(() => state.selectedTestModel, async (newVal) => {
    if (newVal) {
      await saveModelSelection(newVal, 'test')
    }
  })

  // 监听服务实例变化，初始化模型选择
  watch(services, async () => {
    if (services.value?.modelManager) {
      await state.initModelSelection()
    }
  }, { immediate: true })

  return state
} 