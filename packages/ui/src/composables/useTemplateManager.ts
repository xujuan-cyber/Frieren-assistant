import { ref, watch, computed, reactive } from 'vue'
import type { Ref } from 'vue'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'
import { useStorage } from './useStorage'
import type { Template, ITemplateManager } from '@prompt-optimizer/core'
import type { AppServices } from '../types/services'

interface TemplateSelector extends Element {
  __vueParentComponent?: {
    ctx?: {
      refresh?: () => void
    }
  }
}

export interface TemplateManagerHooks {
  showTemplates: boolean
  currentType: string
  handleTemplateSelect: (template: Template | null, type: string, showToast?: boolean) => void
  openTemplateManager: (type: string) => void
  handleTemplateManagerClose: () => void
}

export interface TemplateManagerOptions {
  selectedOptimizeTemplate: Ref<Template | null>
  selectedIterateTemplate: Ref<Template | null>
  saveTemplateSelection: (template: Template, type: 'system-optimize' | 'user-optimize' | 'iterate') => void
}

/**
 * 模板管理器Hook
 * @param services 服务实例引用
 * @param options 选项配置
 * @returns TemplateManagerHooks
 */
export function useTemplateManager(
  services: Ref<AppServices | null>,
  options: TemplateManagerOptions
): TemplateManagerHooks {
  const toast = useToast()
  const { t } = useI18n()
  const storage = useStorage(services)
  const { selectedOptimizeTemplate, selectedIterateTemplate, saveTemplateSelection } = options
  
  // 模型管理器引用
  const templateManager = computed(() => services.value?.templateManager)

  // 创建一个 reactive 状态对象
  const state = reactive<TemplateManagerHooks>({
    showTemplates: false,
    currentType: 'optimize',
    handleTemplateSelect: (template: Template | null, type: string, showToast: boolean = true) => {
      try {
        console.log(t('log.info.templateSelected'), {
          template: template ? {
            id: template.id,
            name: template.name,
            type: template.metadata?.templateType
          } : null,
          type
        })
  
        if (type === 'optimize') {
          selectedOptimizeTemplate.value = template
        } else {
          selectedIterateTemplate.value = template
        }
  
        if (template) {
          saveTemplateSelection(template, type as any)
  
          // 只在明确要求时显示toast
          if (showToast) {
            toast.success(t('toast.success.templateSelected', {
              type: type === 'optimize' ? t('common.optimize') : t('common.iterate'),
              name: template.name
            }))
          }
        }
      } catch (error) {
        console.error(t('toast.error.selectTemplateFailed'), error)
        if (showToast) {
          toast.error(t('toast.error.selectTemplateFailed', { error: error instanceof Error ? error.message : String(error) }))
        }
      }
    },
    openTemplateManager: (type: string) => {
      state.currentType = type
      state.showTemplates = true
    },
    handleTemplateManagerClose: () => {
      // Ensure all template selectors refresh their state
      const templateSelectors = document.querySelectorAll('template-select') as NodeListOf<TemplateSelector>
      templateSelectors.forEach(selector => {
        if (selector.__vueParentComponent?.ctx?.refresh) {
          selector.__vueParentComponent.ctx.refresh()
        }
      })
      state.showTemplates = false
    }
  })

  // Initialize template selection
  const initTemplateSelection = async () => {
    try {
      // 确保模板管理器已初始化
      await templateManager.value!.ensureInitialized()

      // Load optimization template
      const optimizeTemplateId = await storage.getItem('app:selected-optimize-template')
      if (optimizeTemplateId) {
        try {
          const optimizeTemplate = templateManager.value!.getTemplate(optimizeTemplateId)
          if (optimizeTemplate) {
            selectedOptimizeTemplate.value = optimizeTemplate
          }
        } catch (error) {
          console.warn('加载已保存的优化提示词失败', error)
        }
      }
      
      // If no saved template or loading failed, use the first template of this type
      if (!selectedOptimizeTemplate.value) {
        const optimizeTemplates = templateManager.value!.listTemplatesByType('optimize')
        if (optimizeTemplates.length > 0) {
          selectedOptimizeTemplate.value = optimizeTemplates[0]
        }
      }
      
      // Load iteration template
      const iterateTemplateId = await storage.getItem('app:selected-iterate-template')
      if (iterateTemplateId) {
        try {
          const iterateTemplate = templateManager.value!.getTemplate(iterateTemplateId)
          if (iterateTemplate) {
            selectedIterateTemplate.value = iterateTemplate
          }
        } catch (error) {
          console.warn('加载已保存的迭代提示词失败', error)
        }
      }
      
      // If no saved template or loading failed, use the first template of this type
      if (!selectedIterateTemplate.value) {
        const iterateTemplates = templateManager.value!.listTemplatesByType('iterate')
        if (iterateTemplates.length > 0) {
          selectedIterateTemplate.value = iterateTemplates[0]
        }
      }

      // If still unable to load any templates, show error
      if (!selectedOptimizeTemplate.value || !selectedIterateTemplate.value) {
        throw new Error('无法加载默认提示词')
      }
    } catch (error) {
      console.error('初始化模板选择失败', error)
      toast.error('初始化模板选择失败')
    }
  }

  // 监听服务实例变化，初始化模板选择
  watch(services, async () => {
    if (services.value?.templateManager) {
      await initTemplateSelection()
    }
  }, { immediate: true })

  return state
} 