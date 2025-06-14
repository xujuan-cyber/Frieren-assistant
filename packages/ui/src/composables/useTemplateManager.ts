import { ref, onMounted } from 'vue'
import type { Ref } from 'vue'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'
import { useStorage } from './useStorage'
import type { Template, TemplateManager } from '@prompt-optimizer/core'

interface TemplateSelector extends Element {
  __vueParentComponent?: {
    ctx?: {
      refresh?: () => void
    }
  }
}

export interface TemplateManagerHooks {
  showTemplates: Ref<boolean>
  currentType: Ref<string>
  handleTemplateSelect: (template: Template | null, type: string, showToast?: boolean) => void
  openTemplateManager: (type: string) => void
  handleTemplateManagerClose: () => void
}

export interface TemplateManagerOptions {
  selectedOptimizeTemplate: Ref<Template | null>
  selectedIterateTemplate: Ref<Template | null>
  saveTemplateSelection: (template: Template, type: 'optimize' | 'iterate') => void
  templateManager: TemplateManager
}

export function useTemplateManager(options: TemplateManagerOptions): TemplateManagerHooks {
  const toast = useToast()
  const { t } = useI18n()
  const storage = useStorage()
  const showTemplates = ref(false)
  const currentType = ref('')
  const { selectedOptimizeTemplate, selectedIterateTemplate, saveTemplateSelection, templateManager } = options

  // Initialize template selection
  const initTemplateSelection = async () => {
    try {
      // 确保模板管理器已初始化
      await templateManager.ensureInitialized()

      // Load optimization template
      const optimizeTemplateId = await storage.getItem('app:selected-optimize-template')
      if (optimizeTemplateId) {
        try {
          const optimizeTemplate = templateManager.getTemplate(optimizeTemplateId)
          if (optimizeTemplate) {
            selectedOptimizeTemplate.value = optimizeTemplate
          }
        } catch (error) {
          console.warn('加载已保存的优化提示词失败', error)
        }
      }
      
      // If no saved template or loading failed, use the first template of this type
      if (!selectedOptimizeTemplate.value) {
        const optimizeTemplates = templateManager.listTemplatesByType('optimize')
        if (optimizeTemplates.length > 0) {
          selectedOptimizeTemplate.value = optimizeTemplates[0]
        }
      }
      
      // Load iteration template
      const iterateTemplateId = await storage.getItem('app:selected-iterate-template')
      if (iterateTemplateId) {
        try {
          const iterateTemplate = templateManager.getTemplate(iterateTemplateId)
          if (iterateTemplate) {
            selectedIterateTemplate.value = iterateTemplate
          }
        } catch (error) {
          console.warn('加载已保存的迭代提示词失败', error)
        }
      }
      
      // If no saved template or loading failed, use the first template of this type
      if (!selectedIterateTemplate.value) {
        const iterateTemplates = templateManager.listTemplatesByType('iterate')
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

  const handleTemplateSelect = (template: Template | null, type: string, showToast: boolean = true) => {
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
        saveTemplateSelection(template, type as 'optimize' | 'iterate')

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
  }

  const openTemplateManager = (type: string) => {
    currentType.value = type
    showTemplates.value = true
  }

  const handleTemplateManagerClose = () => {
    // Ensure all template selectors refresh their state
    const templateSelectors = document.querySelectorAll('template-select') as NodeListOf<TemplateSelector>
    templateSelectors.forEach(selector => {
      if (selector.__vueParentComponent?.ctx?.refresh) {
        selector.__vueParentComponent.ctx.refresh()
      }
    })
    showTemplates.value = false
  }

  // Auto initialize on mounted
  onMounted(async () => {
    await initTemplateSelection()
  })

  return {
    showTemplates,
    currentType,
    handleTemplateSelect,
    openTemplateManager,
    handleTemplateManagerClose
  }
} 