import { ref, computed, reactive, type Ref } from 'vue'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'
import type { AppServices } from '../types/services'

/**
 * 模态框管理Hook
 * @param services 服务实例引用
 * @param optimizeModelSelect 优化模型选择器引用
 * @param testModelSelect 测试模型选择器引用
 * @param loadModels 加载模型的函数
 * @param initTemplateSelection 初始化模板选择的函数
 * @returns 模态框管理相关方法和状态
 */
export function useModals(
  services: Ref<AppServices | null>,
  optimizeModelSelect: Ref<any>,
  testModelSelect: Ref<any>,
  loadModels: () => Promise<void>,
  initTemplateSelection: () => Promise<void>
) {
  const toast = useToast()
  const { t } = useI18n()
  
  // 获取模板管理器引用
  const templateManager = computed(() => services.value?.templateManager)
  
  // 创建一个 reactive 状态对象
  const state = reactive({
    // 弹窗状态
    showConfig: false,
    showHistory: false,
    showTemplates: false,
    currentType: 'optimize',

    // 打开提示词管理器
    openTemplateManager: (type = 'optimize') => {
      state.currentType = type
      state.showTemplates = true
    },

    // 加载提示词模板
    loadTemplates: async () => {
      try {
        if (!templateManager.value) {
          throw new Error('模板管理器未初始化')
        }
        await templateManager.value.ensureInitialized()
        await initTemplateSelection()
      } catch (error) {
        console.error(t('toast.error.loadTemplatesFailed'), error)
        toast.error(t('toast.error.loadTemplatesFailed'))
      }
    },

    // 关闭提示词管理器
    handleTemplateManagerClose: async () => {
      await state.loadTemplates()
      state.showTemplates = false
    },

    // 关闭模型管理器
    handleModelManagerClose: async () => {
      await loadModels()
      optimizeModelSelect.value?.refresh()
      testModelSelect.value?.refresh()
      state.showConfig = false
    }
  })

  return state
} 