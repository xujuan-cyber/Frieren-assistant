import { ref, watch, onMounted } from 'vue'
import type { Ref } from 'vue'
import type { ModelConfig, ModelManager } from '@prompt-optimizer/core'
import { useToast } from './useToast'

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

// 本地存储key
const STORAGE_KEYS = {
  OPTIMIZE_MODEL: 'app:selected-optimize-model',
  TEST_MODEL: 'app:selected-test-model'
} as const

export function useModelManager(options: ModelManagerOptions): ModelManagerHooks {
  const toast = useToast()
  const showConfig = ref(false)
  const selectedOptimizeModel = ref('')
  const selectedTestModel = ref('')
  
  const { modelManager, optimizeModelSelect, testModelSelect } = options

  // 保存模型选择
  const saveModelSelection = (model: string, type: 'optimize' | 'test') => {
    if (model) {
      localStorage.setItem(
        type === 'optimize' ? STORAGE_KEYS.OPTIMIZE_MODEL : STORAGE_KEYS.TEST_MODEL,
        model
      )
    }
  }

  // 初始化模型选择
  const initModelSelection = () => {
    try {
      const enabledModels = modelManager.getAllModels().filter(m => m.enabled)
      const defaultModel = enabledModels[0]?.key

      if (defaultModel) {
        // 加载优化模型选择
        const savedOptimizeModel = localStorage.getItem(STORAGE_KEYS.OPTIMIZE_MODEL)
        selectedOptimizeModel.value = (savedOptimizeModel && enabledModels.find(m => m.key === savedOptimizeModel))
          ? savedOptimizeModel
          : defaultModel

        // 加载测试模型选择
        const savedTestModel = localStorage.getItem(STORAGE_KEYS.TEST_MODEL)
        selectedTestModel.value = (savedTestModel && enabledModels.find(m => m.key === savedTestModel))
          ? savedTestModel
          : defaultModel

        // 保存初始选择
        saveModelSelection(selectedOptimizeModel.value, 'optimize')
        saveModelSelection(selectedTestModel.value, 'test')
      }
    } catch (error) {
      console.error('初始化模型选择失败:', error)
      toast.error('初始化模型选择失败')
    }
  }

  // 处理模型选择
  const handleModelSelect = (model: ModelConfig & { key: string }) => {
    if (model) {
      selectedOptimizeModel.value = model.key
      selectedTestModel.value = model.key
      
      saveModelSelection(model.key, 'optimize')
      saveModelSelection(model.key, 'test')
      
      toast.success(`已选择模型: ${model.name}`)
    }
  }

  // 加载模型数据
  const loadModels = () => {
    try {
      // 获取最新的启用模型列表
      const enabledModels = modelManager.getAllModels().filter(m => m.enabled)
      const defaultModel = enabledModels[0]?.key

      // 验证当前选中的模型是否仍然可用
      if (!enabledModels.find(m => m.key === selectedOptimizeModel.value)) {
        selectedOptimizeModel.value = defaultModel || ''
      }
      if (!enabledModels.find(m => m.key === selectedTestModel.value)) {
        selectedTestModel.value = defaultModel || ''
      }

      toast.success('模型列表已更新')
    } catch (error: any) {
      console.error('加载模型列表失败:', error)
      toast.error('加载模型列表失败')
    }
  }

  const handleModelManagerClose = () => {
    // 先更新数据
    loadModels()
    // 刷新模型选择组件
    optimizeModelSelect.value?.refresh()
    testModelSelect.value?.refresh()
    // 关闭界面
    showConfig.value = false
  }

  const handleModelsUpdated = (modelKey: string) => {
    // 如果需要，可以在这里处理模型更新后的其他逻辑
    console.log('模型已更新:', modelKey)
  }

  // 监听模型选择变化
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

  // 在 mounted 时自动初始化
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