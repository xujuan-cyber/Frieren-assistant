import { ref, watch, computed, reactive } from 'vue'
import type { Ref } from 'vue'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'
import { useStorage } from './useStorage'
import type { Template, ITemplateManager } from '@prompt-optimizer/core'
import type { AppServices } from '../types/services'
import { TEMPLATE_SELECTION_KEYS } from '../constants/storage-keys'

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
  selectedUserOptimizeTemplate: Ref<Template | null>
  selectedIterateTemplate: Ref<Template | null>
  // saveTemplateSelection现在完全由useTemplateManager内部实现
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
  const { selectedOptimizeTemplate, selectedUserOptimizeTemplate, selectedIterateTemplate } = options
  
  // 模型管理器引用
  const templateManager = computed(() => services.value?.templateManager)

  // 创建一个 reactive 状态对象
  const state = reactive<TemplateManagerHooks>({
    showTemplates: false,
    currentType: '', // 不设置默认值，必须明确指定
    handleTemplateSelect: (template: Template | null, type: string, showToast: boolean = true) => {
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
      } else if (type === 'userOptimize') {
        selectedUserOptimizeTemplate.value = template
      } else {
        selectedIterateTemplate.value = template
      }

      if (template) {
        // 使用内部的保存逻辑，异步执行但不等待
        saveTemplateSelection(template, type as 'optimize' | 'userOptimize' | 'iterate').catch(error => {
          console.error('[useTemplateManager] 保存模板选择失败:', error)
          toast.error('保存模板选择失败')
        })

        // 只在明确要求时显示toast
        if (showToast) {
          let typeText = ''
          if (type === 'optimize') {
            typeText = t('common.optimize')
          } else if (type === 'userOptimize') {
            typeText = '用户提示词优化'
          } else {
            typeText = t('common.iterate')
          }
          toast.success(t('toast.success.templateSelected', {
            type: typeText,
            name: template.name
          }))
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

  // 使用统一的存储键定义

  // 保存模板选择到存储
  const saveTemplateSelection = async (template: Template, type: 'optimize' | 'userOptimize' | 'iterate') => {
    try {
      let storageKey: string;
      switch (type) {
        case 'optimize':
          storageKey = TEMPLATE_SELECTION_KEYS.SYSTEM_OPTIMIZE_TEMPLATE;
          break;
        case 'userOptimize':
          storageKey = TEMPLATE_SELECTION_KEYS.USER_OPTIMIZE_TEMPLATE;
          break;
        case 'iterate':
          storageKey = TEMPLATE_SELECTION_KEYS.ITERATE_TEMPLATE;
          break;
        default:
          console.warn('[useTemplateManager] 未知的模板类型，无法保存:', type)
          return
      }

      console.log('[useTemplateManager] 正在保存模板选择:', {
        templateName: template.name,
        templateId: template.id,
        storageKey: storageKey
      })

      await storage.setItem(storageKey, template.id)
    } catch (error) {
      console.error('[useTemplateManager] 保存模板选择失败:', error)
      throw error // 立即抛出错误，不要静默处理
    }
  }

  // Initialize template selection
  const initTemplateSelection = async () => {
    try {
      // 确保模板管理器已初始化
      await templateManager.value!.ensureInitialized()

      // 加载系统提示词优化模板
      const loadSystemOptimizeTemplate = async () => {
        const savedTemplateId = await storage.getItem(TEMPLATE_SELECTION_KEYS.SYSTEM_OPTIMIZE_TEMPLATE)
        console.log('[loadSystemOptimizeTemplate] 开始加载，保存的模板ID:', savedTemplateId || '无')

        let needsClearAndSave = false

        if (savedTemplateId) {
          try {
            const template = templateManager.value!.getTemplate(savedTemplateId)
            if (template && template.metadata.templateType === 'optimize') {
              selectedOptimizeTemplate.value = template
              console.log('[loadSystemOptimizeTemplate] 成功加载已保存的模板:', template.name)
              return
            } else {
              console.warn('[loadSystemOptimizeTemplate] 找到模板但类型不匹配:', {
                templateId: savedTemplateId,
                found: !!template,
                expectedType: 'optimize',
                actualType: template?.metadata.templateType || 'unknown'
              })
              needsClearAndSave = true
            }
          } catch (error) {
            console.warn('[loadSystemOptimizeTemplate] 加载已保存模板失败:', error)
            needsClearAndSave = true
          }
        } else {
          console.log('[loadSystemOptimizeTemplate] 没有保存的模板ID，将使用默认模板')
        }

        // 回退到第一个可用的系统优化模板
        const templates = templateManager.value!.listTemplatesByType('optimize')
        console.log('[loadSystemOptimizeTemplate] 可用的系统优化模板数量:', templates.length)

        if (templates.length > 0) {
          selectedOptimizeTemplate.value = templates[0]
          const reason = savedTemplateId ? '保存的模板加载失败' : '首次使用，没有保存的模板'
          console.log(`[loadSystemOptimizeTemplate] 回退到默认模板: ${templates[0].name} (原因: ${reason})`)

          // 如果需要清除无效数据或首次使用，保存新的选择
          if (needsClearAndSave || !savedTemplateId) {
            try {
              await storage.setItem(TEMPLATE_SELECTION_KEYS.SYSTEM_OPTIMIZE_TEMPLATE, templates[0].id)
              console.log('[loadSystemOptimizeTemplate] 已持久化新的模板选择:', templates[0].id)
            } catch (error) {
              console.error('[loadSystemOptimizeTemplate] 保存新模板选择失败:', error)
            }
          }

          if (savedTemplateId && needsClearAndSave) {
            // 只有在之前有保存过模板但加载失败时才显示警告
            toast.warning(`系统优化模板加载失败，已切换到默认模板: ${templates[0].name}`)
          }
        } else {
          console.error('[loadSystemOptimizeTemplate] 没有可用的系统优化模板')
          toast.error('没有可用的系统优化模板')
        }
      }

      // 加载用户提示词优化模板
      const loadUserOptimizeTemplate = async () => {
        const savedTemplateId = await storage.getItem(TEMPLATE_SELECTION_KEYS.USER_OPTIMIZE_TEMPLATE)
        console.log('[loadUserOptimizeTemplate] 开始加载，保存的模板ID:', savedTemplateId || '无')

        let needsClearAndSave = false

        if (savedTemplateId) {
          try {
            const template = templateManager.value!.getTemplate(savedTemplateId)
            if (template && template.metadata.templateType === 'userOptimize') {
              selectedUserOptimizeTemplate.value = template
              console.log('[loadUserOptimizeTemplate] 成功加载已保存的模板:', template.name)
              return
            } else {
              console.warn('[loadUserOptimizeTemplate] 找到模板但类型不匹配:', {
                templateId: savedTemplateId,
                found: !!template,
                expectedType: 'userOptimize',
                actualType: template?.metadata.templateType || 'unknown'
              })
              needsClearAndSave = true
            }
          } catch (error) {
            console.warn('[loadUserOptimizeTemplate] 加载已保存模板失败:', error)
            needsClearAndSave = true
          }
        } else {
          console.log('[loadUserOptimizeTemplate] 没有保存的模板ID，将使用默认模板')
        }

        // 回退到第一个可用的用户优化模板
        const templates = templateManager.value!.listTemplatesByType('userOptimize')
        console.log('[loadUserOptimizeTemplate] 可用的用户优化模板数量:', templates.length)

        if (templates.length > 0) {
          selectedUserOptimizeTemplate.value = templates[0]
          const reason = savedTemplateId ? '保存的模板加载失败' : '首次使用，没有保存的模板'
          console.log(`[loadUserOptimizeTemplate] 回退到默认模板: ${templates[0].name} (原因: ${reason})`)

          // 如果需要清除无效数据或首次使用，保存新的选择
          if (needsClearAndSave || !savedTemplateId) {
            try {
              await storage.setItem(TEMPLATE_SELECTION_KEYS.USER_OPTIMIZE_TEMPLATE, templates[0].id)
              console.log('[loadUserOptimizeTemplate] 已持久化新的模板选择:', templates[0].id)
            } catch (error) {
              console.error('[loadUserOptimizeTemplate] 保存新模板选择失败:', error)
            }
          }

          if (savedTemplateId && needsClearAndSave) {
            // 只有在之前有保存过模板但加载失败时才显示警告
            toast.warning(`用户优化模板加载失败，已切换到默认模板: ${templates[0].name}`)
          }
        } else {
          console.error('[loadUserOptimizeTemplate] 没有可用的用户优化模板')
          toast.error('没有可用的用户优化模板')
        }
      }

      // 加载迭代模板
      const loadIterateTemplate = async () => {
        const savedTemplateId = await storage.getItem(TEMPLATE_SELECTION_KEYS.ITERATE_TEMPLATE)
        console.log('[loadIterateTemplate] 开始加载，保存的模板ID:', savedTemplateId || '无')

        let needsClearAndSave = false

        if (savedTemplateId) {
          try {
            const template = templateManager.value!.getTemplate(savedTemplateId)
            if (template && template.metadata.templateType === 'iterate') {
              selectedIterateTemplate.value = template
              console.log('[loadIterateTemplate] 成功加载已保存的模板:', template.name)
              return
            } else {
              console.warn('[loadIterateTemplate] 找到模板但类型不匹配:', {
                templateId: savedTemplateId,
                found: !!template,
                expectedType: 'iterate',
                actualType: template?.metadata.templateType || 'unknown'
              })
              needsClearAndSave = true
            }
          } catch (error) {
            console.warn('[loadIterateTemplate] 加载已保存模板失败:', error)
            needsClearAndSave = true
          }
        } else {
          console.log('[loadIterateTemplate] 没有保存的模板ID，将使用默认模板')
        }

        // 回退到第一个可用的迭代模板
        const templates = templateManager.value!.listTemplatesByType('iterate')
        console.log('[loadIterateTemplate] 可用的迭代模板数量:', templates.length)

        if (templates.length > 0) {
          selectedIterateTemplate.value = templates[0]
          const reason = savedTemplateId ? '保存的模板加载失败' : '首次使用，没有保存的模板'
          console.log(`[loadIterateTemplate] 回退到默认模板: ${templates[0].name} (原因: ${reason})`)

          // 如果需要清除无效数据或首次使用，保存新的选择
          if (needsClearAndSave || !savedTemplateId) {
            try {
              await storage.setItem(TEMPLATE_SELECTION_KEYS.ITERATE_TEMPLATE, templates[0].id)
              console.log('[loadIterateTemplate] 已持久化新的模板选择:', templates[0].id)
            } catch (error) {
              console.error('[loadIterateTemplate] 保存新模板选择失败:', error)
            }
          }

          if (savedTemplateId && needsClearAndSave) {
            // 只有在之前有保存过模板但加载失败时才显示警告
            toast.warning(`迭代模板加载失败，已切换到默认模板: ${templates[0].name}`)
          }
        } else {
          console.error('[loadIterateTemplate] 没有可用的迭代模板')
          toast.error('没有可用的迭代模板')
        }
      }

      // 并行加载所有三种模板
      await Promise.all([
        loadSystemOptimizeTemplate(),
        loadUserOptimizeTemplate(),
        loadIterateTemplate()
      ])

      // 检查是否所有模板都成功加载
      if (!selectedOptimizeTemplate.value || !selectedUserOptimizeTemplate.value || !selectedIterateTemplate.value) {
        console.warn('Some templates failed to load:', {
          systemOptimize: !!selectedOptimizeTemplate.value,
          userOptimize: !!selectedUserOptimizeTemplate.value,
          iterate: !!selectedIterateTemplate.value
        })
      }
    } catch (error) {
      console.error('加载模板失败', error)
      toast.error('加载模板失败')
    }
  }

  // 监听服务实例变化，初始化模板选择
  watch(services, async () => {
    if (services.value?.templateManager) {
      await initTemplateSelection()
    }
  }, { immediate: true })

  // 监听模板变化，自动保存到存储
  watch(() => selectedOptimizeTemplate.value, async (newTemplate, oldTemplate) => {
    if (newTemplate && oldTemplate && newTemplate.id !== oldTemplate.id) {
      try {
        await saveTemplateSelection(newTemplate, 'optimize')
        toast.success(t('toast.success.templateSelected', {
          type: t('common.optimize'),
          name: newTemplate.name
        }))
      } catch (error) {
        console.error('[useTemplateManager] 保存系统优化模板失败:', error)
        toast.error('保存模板选择失败')
      }
    }
  })

  watch(() => selectedUserOptimizeTemplate.value, async (newTemplate, oldTemplate) => {
    if (newTemplate && oldTemplate && newTemplate.id !== oldTemplate.id) {
      try {
        await saveTemplateSelection(newTemplate, 'userOptimize')
        toast.success(t('toast.success.templateSelected', {
          type: '用户提示词优化',
          name: newTemplate.name
        }))
      } catch (error) {
        console.error('[useTemplateManager] 保存用户优化模板失败:', error)
        toast.error('保存模板选择失败')
      }
    }
  })

  watch(() => selectedIterateTemplate.value, async (newTemplate, oldTemplate) => {
    if (newTemplate && oldTemplate && newTemplate.id !== oldTemplate.id) {
      try {
        await saveTemplateSelection(newTemplate, 'iterate')
        toast.success(t('toast.success.templateSelected', {
          type: t('common.iterate'),
          name: newTemplate.name
        }))
      } catch (error) {
        console.error('[useTemplateManager] 保存迭代模板失败:', error)
        toast.error('保存模板选择失败')
      }
    }
  })

  return state
} 