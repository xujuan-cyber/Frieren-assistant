import { ref } from 'vue'
import { useToast } from './useToast'

export function useModals(
  templateManager: any,
  optimizeModelSelect: any,
  testModelSelect: any,
  loadModels: () => Promise<void>,
  initTemplateSelection: () => Promise<void>
) {
  const toast = useToast()
  
  // 弹窗状态
  const showConfig = ref(false)
  const showHistory = ref(false)
  const showTemplates = ref(false)
  const currentType = ref('optimize')

  // 打开提示词管理器
  const openTemplateManager = (type = 'optimize') => {
    currentType.value = type
    showTemplates.value = true
  }

  // 加载提示词模板
  const loadTemplates = async () => {
    try {
      await templateManager.init()
      await initTemplateSelection()
      toast.success('提示词列表已更新')
    } catch (error) {
      console.error('加载提示词失败:', error)
      toast.error('加载提示词失败')
    }
  }

  // 关闭提示词管理器
  const handleTemplateManagerClose = async () => {
    await loadTemplates()
    showTemplates.value = false
  }

  // 关闭模型管理器
  const handleModelManagerClose = async () => {
    await loadModels()
    optimizeModelSelect.value?.refresh()
    testModelSelect.value?.refresh()
    showConfig.value = false
  }

  return {
    showConfig,
    showHistory,
    showTemplates,
    currentType,
    openTemplateManager,
    handleTemplateManagerClose,
    handleModelManagerClose
  }
} 