import { watch, computed, reactive, type Ref } from 'vue'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'
import { usePreferences } from './usePreferenceManager'
import { TEMPLATE_SELECTION_KEYS, type Template } from '@prompt-optimizer/core'
import { useFunctionMode, type FunctionMode } from './useFunctionMode'
import type { AppServices } from '../types/services'

export interface TemplateManagerHooks {
  showTemplates: boolean
  currentType: string
  handleTemplateSelect: (template: Template | null, type: string, showToast?: boolean) => void
  openTemplateManager: (type: string) => void
  handleTemplateManagerClose: (refreshCallback?: () => void) => void
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
  const { getPreference, setPreference } = usePreferences(services)
  const { selectedOptimizeTemplate, selectedUserOptimizeTemplate, selectedIterateTemplate } = options
  
  // 模型管理器引用
  const templateManager = computed(() => services.value?.templateManager)
  const { functionMode, ensureInitialized: ensureFunctionModeInitialized } = useFunctionMode(services)

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

      // 将选择映射到对应家族（系统/用户/迭代），无论是否为 context* 类型
      const normalized = normalizeTypeToFamily(type)
      if (normalized === 'system') {
        selectedOptimizeTemplate.value = template
      } else if (normalized === 'user') {
        selectedUserOptimizeTemplate.value = template
      } else {
        selectedIterateTemplate.value = template
      }

      if (template) {
        // 使用内部的保存逻辑，异步执行但不等待
        saveTemplateSelection(template, type as any).catch(error => {
          console.error('[useTemplateManager] 保存模板选择失败:', error)
          toast.error('保存模板选择失败')
        })

        // 不再显示toast提示，移除选择成功的冒泡提示
      }
    },
    openTemplateManager: (type: string) => {
      state.currentType = type
      state.showTemplates = true
    },
    handleTemplateManagerClose: (refreshCallback?: () => void) => {
      // Call the refresh callback if provided
      if (refreshCallback) {
        refreshCallback()
        }
      state.showTemplates = false
    }
  })

  // 保存模板选择到存储
  const saveTemplateSelection = async (
    template: Template,
    type: 'optimize' | 'userOptimize' | 'iterate' | 'contextSystemOptimize' | 'contextUserOptimize' | 'contextIterate'
  ) => {
    const storageKey = resolveSelectionKey(type)
    await setPreference(storageKey, template.id)
  }

  // Initialize template selection
  const initTemplateSelection = async () => {
    try {
      await ensureFunctionModeInitialized()
      const mode = functionMode.value as FunctionMode

      const loadTemplate = async (
        type: 'optimize' | 'userOptimize' | 'iterate' | 'contextSystemOptimize' | 'contextUserOptimize' | 'contextIterate',
        storageKey: string,
        targetRef: Ref<Template | null>
      ) => {
        const savedTemplateId = await getPreference(storageKey, null)
        
        if (typeof savedTemplateId === 'string' && savedTemplateId) {
          try {
            const template = await templateManager.value!.getTemplate(savedTemplateId);
            if (template && template.metadata.templateType === type) {
              targetRef.value = template;
              return; // 成功加载，直接返回
            }
            // 如果模板不存在或类型不匹配，则会继续执行下面的回退逻辑
            toast.warning(`模板 (ID: ${savedTemplateId}) 加载失败或类型不匹配，已重置为默认值。`);
          } catch (error) {
            toast.warning(`加载已保存的模板 (ID: ${savedTemplateId}) 失败，已重置为默认值。`);
          }
        }
        
        // 回退逻辑：加载该类型的第一个模板
        const templates = await templateManager.value!.listTemplatesByType(type as any)
        if (templates.length > 0) {
          targetRef.value = templates[0]
          await setPreference(storageKey, templates[0].id) // 保存新的默认值
        } else {
          toast.error(`没有可用的 ${type} 类型模板。`);
        }
      };
      
      // 依据当前功能模式确定三类类型与存储键
      const sysType = (mode === 'pro') ? 'contextSystemOptimize' : 'optimize'
      const userType = (mode === 'pro') ? 'contextUserOptimize' : 'userOptimize'
      const itType = (mode === 'pro') ? 'contextIterate' : 'iterate'

      await Promise.all([
        loadTemplate(sysType as any, resolveSelectionKey(sysType as any), selectedOptimizeTemplate),
        loadTemplate(userType as any, resolveSelectionKey(userType as any), selectedUserOptimizeTemplate),
        loadTemplate(itType as any, resolveSelectionKey(itType as any), selectedIterateTemplate),
      ]);

    } catch (error) {
      console.error('初始化模板选择失败:', error)
      toast.error('初始化模板选择失败')
    }
  }

  // 监听服务实例变化，初始化模板选择
  watch(services, async () => {
    if (services.value?.templateManager) {
      await initTemplateSelection()
    }
  }, { immediate: true })

  // 监听模板变化，自动保存到存储（移除toast提示）
  watch(() => selectedOptimizeTemplate.value, async (newTemplate, oldTemplate) => {
    if (newTemplate && oldTemplate && newTemplate.id !== oldTemplate.id) {
      try {
        const mode = functionMode.value as FunctionMode
        const type = (mode === 'pro') ? 'contextSystemOptimize' : 'optimize'
        await saveTemplateSelection(newTemplate, type as any)
        // 不再显示toast提示，移除选择成功的冒泡提示
      } catch (error) {
        console.error('[useTemplateManager] 保存系统优化模板失败:', error)
        toast.error('保存模板选择失败')
      }
    }
  })

  watch(() => selectedUserOptimizeTemplate.value, async (newTemplate, oldTemplate) => {
    if (newTemplate && oldTemplate && newTemplate.id !== oldTemplate.id) {
      try {
        const mode = functionMode.value as FunctionMode
        const type = (mode === 'pro') ? 'contextUserOptimize' : 'userOptimize'
        await saveTemplateSelection(newTemplate, type as any)
        // 不再显示toast提示，移除选择成功的冒泡提示
      } catch (error) {
        console.error('[useTemplateManager] 保存用户优化模板失败:', error)
        toast.error('保存模板选择失败')
      }
    }
  })

  watch(() => selectedIterateTemplate.value, async (newTemplate, oldTemplate) => {
    if (newTemplate && oldTemplate && newTemplate.id !== oldTemplate.id) {
      try {
        const mode = functionMode.value as FunctionMode
        const type = (mode === 'pro') ? 'contextIterate' : 'iterate'
        await saveTemplateSelection(newTemplate, type as any)
        // 不再显示toast提示，移除选择成功的冒泡提示
      } catch (error) {
        console.error('[useTemplateManager] 保存迭代模板失败:', error)
        toast.error('保存模板选择失败')
      }
    }
  })

  // 当功能模式发生变化时，重新从对应键加载选择
  watch(functionMode, async (mode) => {
    try {
      const sysType = (mode === 'pro') ? 'contextSystemOptimize' : 'optimize'
      const userType = (mode === 'pro') ? 'contextUserOptimize' : 'userOptimize'
      const itType = (mode === 'pro') ? 'contextIterate' : 'iterate'

      const sysId = await getPreference(resolveSelectionKey(sysType as any), null)
      const userId = await getPreference(resolveSelectionKey(userType as any), null)
      const itId = await getPreference(resolveSelectionKey(itType as any), null)

      // 系统
      if (sysId) {
        try { selectedOptimizeTemplate.value = await templateManager.value!.getTemplate(sysId) } catch {}
      } else {
        const list = await templateManager.value!.listTemplatesByType(sysType as any)
        if (list.length > 0) {
          selectedOptimizeTemplate.value = list[0]
          await setPreference(resolveSelectionKey(sysType as any), list[0].id)
        }
      }

      // 用户
      if (userId) {
        try { selectedUserOptimizeTemplate.value = await templateManager.value!.getTemplate(userId) } catch {}
      } else {
        const list = await templateManager.value!.listTemplatesByType(userType as any)
        if (list.length > 0) {
          selectedUserOptimizeTemplate.value = list[0]
          await setPreference(resolveSelectionKey(userType as any), list[0].id)
        }
      }

      // 迭代
      if (itId) {
        try { selectedIterateTemplate.value = await templateManager.value!.getTemplate(itId) } catch {}
      } else {
        const list = await templateManager.value!.listTemplatesByType(itType as any)
        if (list.length > 0) {
          selectedIterateTemplate.value = list[0]
          await setPreference(resolveSelectionKey(itType as any), list[0].id)
        }
      }

    } catch (e) {
      console.warn('[useTemplateManager] 切换功能模式时加载模板失败:', e)
    }
  })

  // 工具函数：将六类类型映射到存储键
  function resolveSelectionKey(
    type: 'optimize' | 'userOptimize' | 'iterate' | 'contextSystemOptimize' | 'contextUserOptimize' | 'contextIterate'
  ): string {
    switch (type) {
      case 'optimize':
        return TEMPLATE_SELECTION_KEYS.SYSTEM_OPTIMIZE_TEMPLATE
      case 'userOptimize':
        return TEMPLATE_SELECTION_KEYS.USER_OPTIMIZE_TEMPLATE
      case 'iterate':
        return TEMPLATE_SELECTION_KEYS.ITERATE_TEMPLATE
      case 'contextSystemOptimize':
        return TEMPLATE_SELECTION_KEYS.CONTEXT_SYSTEM_OPTIMIZE_TEMPLATE
      case 'contextUserOptimize':
        return TEMPLATE_SELECTION_KEYS.CONTEXT_USER_OPTIMIZE_TEMPLATE
      case 'contextIterate':
        return TEMPLATE_SELECTION_KEYS.CONTEXT_ITERATE_TEMPLATE
      default:
        return TEMPLATE_SELECTION_KEYS.SYSTEM_OPTIMIZE_TEMPLATE
    }
  }

  // 工具函数：将类型归一化到家族
  function normalizeTypeToFamily(
    type: string
  ): 'system' | 'user' | 'iterate' {
    if (type === 'optimize' || type === 'contextSystemOptimize') return 'system'
    if (type === 'userOptimize' || type === 'contextUserOptimize') return 'user'
    return 'iterate'
  }

  return state
} 
