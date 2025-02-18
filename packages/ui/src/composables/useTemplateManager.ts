import { ref, onMounted } from 'vue'
import type { Ref } from 'vue'
import { useToast } from './useToast'
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
  const showTemplates = ref(false)
  const currentType = ref('')
  const { selectedOptimizeTemplate, selectedIterateTemplate, saveTemplateSelection, templateManager } = options

  // 初始化模板选择
  const initTemplateSelection = () => {
    try {
      // 加载优化提示词
      const optimizeTemplateId = localStorage.getItem('app:selected-optimize-template')
      if (optimizeTemplateId) {
        try {
          const optimizeTemplate = templateManager.getTemplate(optimizeTemplateId)
          if (optimizeTemplate) {
            selectedOptimizeTemplate.value = optimizeTemplate
          }
        } catch (error) {
          console.warn('加载已保存的优化提示词失败:', error)
        }
      }
      
      // 如果没有已保存的提示词或加载失败，使用该类型的第一个提示词
      if (!selectedOptimizeTemplate.value) {
        const optimizeTemplates = templateManager.listTemplatesByType('optimize')
        if (optimizeTemplates.length > 0) {
          selectedOptimizeTemplate.value = optimizeTemplates[0]
        }
      }
      
      // 加载迭代提示词
      const iterateTemplateId = localStorage.getItem('app:selected-iterate-template')
      if (iterateTemplateId) {
        try {
          const iterateTemplate = templateManager.getTemplate(iterateTemplateId)
          if (iterateTemplate) {
            selectedIterateTemplate.value = iterateTemplate
          }
        } catch (error) {
          console.warn('加载已保存的迭代提示词失败:', error)
        }
      }
      
      // 如果没有已保存的提示词或加载失败，使用该类型的第一个提示词
      if (!selectedIterateTemplate.value) {
        const iterateTemplates = templateManager.listTemplatesByType('iterate')
        if (iterateTemplates.length > 0) {
          selectedIterateTemplate.value = iterateTemplates[0]
        }
      }

      // 如果仍然无法加载任何提示词，显示错误
      if (!selectedOptimizeTemplate.value || !selectedIterateTemplate.value) {
        throw new Error('无法加载默认提示词')
      }
    } catch (error) {
      console.error('初始化模板选择失败:', error)
      toast.error('初始化模板选择失败')
    }
  }

  const handleTemplateSelect = (template: Template | null, type: string) => {
    try {
      console.log('选择模板:', { 
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
        toast.success(`已选择${type === 'optimize' ? '优化' : '迭代'}提示词: ${template.name}`)
      }
    } catch (error) {
      console.error('选择提示词失败:', error)
      toast.error('选择提示词失败：' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const openTemplateManager = (type: string) => {
    currentType.value = type
    showTemplates.value = true
  }

  const handleTemplateManagerClose = () => {
    // 确保所有模板选择器都刷新状态
    const templateSelectors = document.querySelectorAll('template-select') as NodeListOf<TemplateSelector>
    templateSelectors.forEach(selector => {
      if (selector.__vueParentComponent?.ctx?.refresh) {
        selector.__vueParentComponent.ctx.refresh()
      }
    })
    showTemplates.value = false
  }

  // 在 mounted 时自动初始化
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