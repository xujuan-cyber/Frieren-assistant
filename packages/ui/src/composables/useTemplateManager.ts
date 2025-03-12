import { ref, onMounted } from 'vue'
import type { Ref } from 'vue'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'
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
  handleTemplateSelect: (template: Template | null, type: string) => void
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
  const showTemplates = ref(false)
  const currentType = ref('')
  const { selectedOptimizeTemplate, selectedIterateTemplate, saveTemplateSelection, templateManager } = options

  // Initialize template selection
  const initTemplateSelection = () => {
    try {
      // Load optimization template
      const optimizeTemplateId = localStorage.getItem('app:selected-optimize-template')
      if (optimizeTemplateId) {
        try {
          const optimizeTemplate = templateManager.getTemplate(optimizeTemplateId)
          if (optimizeTemplate) {
            selectedOptimizeTemplate.value = optimizeTemplate
          }
        } catch (error) {
          console.warn(t('toast.warn.loadOptimizeTemplateFailed'), error)
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
      const iterateTemplateId = localStorage.getItem('app:selected-iterate-template')
      if (iterateTemplateId) {
        try {
          const iterateTemplate = templateManager.getTemplate(iterateTemplateId)
          if (iterateTemplate) {
            selectedIterateTemplate.value = iterateTemplate
          }
        } catch (error) {
          console.warn(t('toast.warn.loadIterateTemplateFailed'), error)
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
        throw new Error(t('toast.error.noDefaultTemplate'))
      }
    } catch (error) {
      console.error(t('toast.error.initTemplateFailed'), error)
      toast.error(t('toast.error.initTemplateFailed'))
    }
  }

  const handleTemplateSelect = (template: Template | null, type: string) => {
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
        toast.success(t('toast.success.templateSelected', {
          type: type === 'optimize' ? t('common.optimize') : t('common.iterate'),
          name: template.name
        }))
      }
    } catch (error) {
      console.error(t('toast.error.selectTemplateFailed'), error)
      toast.error(t('toast.error.selectTemplateFailed', { error: error instanceof Error ? error.message : String(error) }))
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
  onMounted(() => {
    initTemplateSelection()
  })

  return {
    showTemplates,
    currentType,
    handleTemplateSelect,
    openTemplateManager,
    handleTemplateManagerClose
  }
} 