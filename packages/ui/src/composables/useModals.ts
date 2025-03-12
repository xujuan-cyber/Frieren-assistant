import { ref } from 'vue'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'

export function useModals(
  templateManager: any,
  optimizeModelSelect: any,
  testModelSelect: any,
  loadModels: () => Promise<void>,
  initTemplateSelection: () => Promise<void>
) {
  const toast = useToast()
  const { t } = useI18n()
  
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
    } catch (error) {
      console.error(t('toast.error.loadTemplatesFailed'), error)
      toast.error(t('toast.error.loadTemplatesFailed'))
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