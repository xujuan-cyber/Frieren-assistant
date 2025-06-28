import { ref, watch, nextTick, computed, reactive } from 'vue'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'
import { useStorage } from './useStorage'
import { v4 as uuidv4 } from 'uuid'
import type { Ref } from 'vue'
import type {
  ModelConfig,
  IModelManager,
  IHistoryManager,
  Template,
  PromptRecordChain,
  IPromptService,
  ITemplateManager,
  OptimizationMode,
  OptimizationRequest
} from '@prompt-optimizer/core'
import type { AppServices } from '../types/services'


type PromptChain = PromptRecordChain

/**
 * 提示词优化器Hook
 * @param services 服务实例引用
 * @param selectedOptimizationMode 优化模式
 * @param selectedOptimizeModel 优化模型选择
 * @param selectedTestModel 测试模型选择
 * @returns 提示词优化器接口
 */
export function usePromptOptimizer(
  services: Ref<AppServices | null>,
  selectedOptimizationMode?: Ref<OptimizationMode>,    // 优化模式
  selectedOptimizeModel?: Ref<string>,                 // 优化模型选择
  selectedTestModel?: Ref<string>                      // 测试模型选择
) {
  // 如果没有传入参数，使用默认值
  const optimizationMode = selectedOptimizationMode || ref<OptimizationMode>('system')
  const optimizeModel = selectedOptimizeModel || ref('')
  const testModel = selectedTestModel || ref('')
  const toast = useToast()
  const { t } = useI18n()
  const storage = useStorage(services)
  
  // 服务引用
  const modelManager = computed(() => services.value?.modelManager)
  const templateManager = computed(() => services.value?.templateManager)
  const historyManager = computed(() => services.value?.historyManager)
  const promptService = computed(() => services.value?.promptService)
  
  // 使用 reactive 创建一个响应式状态对象，而不是单独的 ref
  const state = reactive({
    // 状态
    prompt: '',
    optimizedPrompt: '',
    optimizedReasoning: '', // 优化推理内容
    isOptimizing: false,
    isIterating: false,
    isInitializing: true, // 初始化状态标志
    selectedOptimizeTemplate: null as Template | null,  // 系统提示词优化模板
    selectedUserOptimizeTemplate: null as Template | null,  // 用户提示词优化模板
    selectedIterateTemplate: null as Template | null,
    currentChainId: '',
    currentVersions: [] as PromptChain['versions'],
    currentVersionId: '',
    
    // 方法 (将在下面定义并绑定到 state)
    handleOptimizePrompt: async () => {},
    handleIteratePrompt: async (payload: { originalPrompt: string, optimizedPrompt: string, iterateInput: string }) => {},
    handleSwitchVersion: async (version: PromptChain['versions'][number]) => {},
    initTemplateSelection: async () => {},
    saveTemplateSelection: async (template: Template, type: 'system-optimize' | 'user-optimize' | 'iterate') => {}
  })
  
  // 本地存储key - 分离系统和用户提示词优化模板
  const STORAGE_KEYS = {
    SYSTEM_OPTIMIZE_TEMPLATE: 'app:selected-system-optimize-template',
    USER_OPTIMIZE_TEMPLATE: 'app:selected-user-optimize-template',
    ITERATE_TEMPLATE: 'app:selected-iterate-template'
  } as const
  
  // 优化提示词
  state.handleOptimizePrompt = async () => {
    if (!state.prompt.trim() || state.isOptimizing) return

    // 根据优化模式选择对应的模板
    const currentTemplate = optimizationMode.value === 'system' 
      ? state.selectedOptimizeTemplate 
      : state.selectedUserOptimizeTemplate

    if (!currentTemplate) {
      toast.error(t('toast.error.noOptimizeTemplate'))
      return
    }

    if (!optimizeModel.value) {
      toast.error(t('toast.error.noOptimizeModel'))
      return
    }

    // 在开始优化前立即清空状态，确保没有竞态条件
    state.isOptimizing = true
    state.optimizedPrompt = ''  // 强制同步清空
    state.optimizedReasoning = '' // 强制同步清空
    
    // 等待一个微任务确保状态更新完成
    await nextTick()

    try {
      // 构建优化请求
      const request: OptimizationRequest = {
        optimizationMode: optimizationMode.value,
        targetPrompt: state.prompt,
        templateId: currentTemplate.id,
        modelKey: optimizeModel.value
      }

      // 使用重构后的优化API
      await promptService.value!.optimizePromptStream(
        request,
        {
          onToken: (token: string) => {
            state.optimizedPrompt += token
          },
          onReasoningToken: (reasoningToken: string) => {
            state.optimizedReasoning += reasoningToken
          },
          onComplete: async () => {
            if (!currentTemplate) return

            try {
              // Create new record chain with enhanced metadata
              const newRecord = await historyManager.value!.createNewChain({
                id: uuidv4(),
                originalPrompt: state.prompt,
                optimizedPrompt: state.optimizedPrompt,
                type: 'optimize',
                modelKey: optimizeModel.value,
                templateId: currentTemplate.id,
                timestamp: Date.now(),
                metadata: {
                  optimizationMode: optimizationMode.value
                }
              });

              state.currentChainId = newRecord.chainId;
              state.currentVersions = newRecord.versions;
              state.currentVersionId = newRecord.currentRecord.id;

              toast.success(t('toast.success.optimizeSuccess'))
            } catch (error) {
              console.error('创建历史记录失败:', error)
              toast.error('创建历史记录失败: ' + (error as Error).message)
            } finally {
              state.isOptimizing = false
            }
          },
          onError: (error: Error) => {
            console.error(t('toast.error.optimizeProcessFailed'), error)
            toast.error(error.message || t('toast.error.optimizeFailed'))
            state.isOptimizing = false
          }
        }
      )
    } catch (error: any) {
      console.error(t('toast.error.optimizeFailed'), error)
      toast.error(error.message || t('toast.error.optimizeFailed'))
    } finally {
      state.isOptimizing = false
    }
  }
  
  // 迭代优化
  state.handleIteratePrompt = async ({ originalPrompt, optimizedPrompt: lastOptimizedPrompt, iterateInput }: { originalPrompt: string, optimizedPrompt: string, iterateInput: string }) => {
    if (!originalPrompt || !lastOptimizedPrompt || !iterateInput || state.isIterating) return
    if (!state.selectedIterateTemplate) {
      toast.error(t('toast.error.noIterateTemplate'))
      return
    }

    // 在开始迭代前立即清空状态，确保没有竞态条件
    state.isIterating = true
    state.optimizedPrompt = ''  // 强制同步清空
    state.optimizedReasoning = '' // 强制同步清空
    
    // 等待一个微任务确保状态更新完成
    await nextTick()
    
    try {
      await promptService.value!.iteratePromptStream(
        originalPrompt,
        lastOptimizedPrompt,
        iterateInput,
        optimizeModel.value,
        {
          onToken: (token: string) => {
            state.optimizedPrompt += token
          },
          onReasoningToken: (reasoningToken: string) => {
            state.optimizedReasoning += reasoningToken
          },
          onComplete: async (_response: unknown) => {
            if (!state.selectedIterateTemplate) {
              state.isIterating = false
              return
            }
            
            try {
              // 使用正确的addIteration方法来保存迭代历史
              const updatedChain = await historyManager.value!.addIteration({
                chainId: state.currentChainId,
                originalPrompt: originalPrompt,
                optimizedPrompt: state.optimizedPrompt,
                iterationNote: iterateInput,
                modelKey: optimizeModel.value,
                templateId: state.selectedIterateTemplate.id
              });
              
              state.currentVersions = updatedChain.versions
              state.currentVersionId = updatedChain.currentRecord.id
              
              toast.success(t('toast.success.iterateComplete'))
            } catch (error) {
              console.error('[History] 迭代记录失败:', error)
              toast.warning(t('toast.warning.historyFailed'))
            } finally {
              state.isIterating = false
            }
          },
          onError: (error: Error) => {
            console.error('[Iterate] 迭代失败:', error)
            toast.error(t('toast.error.iterateFailed'))
            state.isIterating = false
          }
        },
        state.selectedIterateTemplate.id
      )
    } catch (error) {
      console.error('[Iterate] 迭代失败:', error)
      toast.error(t('toast.error.iterateFailed'))
      state.isIterating = false
    }
  }
  
  // 切换版本 - 增强版本，确保强制更新
  state.handleSwitchVersion = async (version: PromptChain['versions'][number]) => {
    // 强制更新内容，确保UI同步
    state.optimizedPrompt = version.optimizedPrompt;
    state.currentVersionId = version.id;
    
    // 等待一个微任务确保状态更新完成
    await nextTick()
  }
  
  // 初始化提示词选择
  state.initTemplateSelection = async () => {
    try {
      // 确保模板管理器已初始化
      await templateManager.value!.ensureInitialized()
      
      // 加载系统提示词优化模板
      const loadSystemOptimizeTemplate = async () => {
        const savedTemplateId = await storage.getItem(STORAGE_KEYS.SYSTEM_OPTIMIZE_TEMPLATE)
        console.log('[loadSystemOptimizeTemplate] 开始加载，保存的模板ID:', savedTemplateId || '无')
        
        let needsClearAndSave = false
        
        if (savedTemplateId) {
          try {
            const template = templateManager.value!.getTemplate(savedTemplateId)
            if (template && template.metadata.templateType === 'optimize') {
              state.selectedOptimizeTemplate = template
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
          state.selectedOptimizeTemplate = templates[0]
          const reason = savedTemplateId ? '保存的模板加载失败' : '首次使用，没有保存的模板'
          console.log(`[loadSystemOptimizeTemplate] 回退到默认模板: ${templates[0].name} (原因: ${reason})`)
          
          // 如果需要清除无效数据或首次使用，保存新的选择
          if (needsClearAndSave || !savedTemplateId) {
            try {
              await storage.setItem(STORAGE_KEYS.SYSTEM_OPTIMIZE_TEMPLATE, templates[0].id)
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
        const savedTemplateId = await storage.getItem(STORAGE_KEYS.USER_OPTIMIZE_TEMPLATE)
        console.log('[loadUserOptimizeTemplate] 开始加载，保存的模板ID:', savedTemplateId || '无')
        
        let needsClearAndSave = false
        
        if (savedTemplateId) {
          try {
            const template = templateManager.value!.getTemplate(savedTemplateId)
            if (template && template.metadata.templateType === 'userOptimize') {
              state.selectedUserOptimizeTemplate = template
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
          state.selectedUserOptimizeTemplate = templates[0]
          const reason = savedTemplateId ? '保存的模板加载失败' : '首次使用，没有保存的模板'
          console.log(`[loadUserOptimizeTemplate] 回退到默认模板: ${templates[0].name} (原因: ${reason})`)
          
          // 如果需要清除无效数据或首次使用，保存新的选择
          if (needsClearAndSave || !savedTemplateId) {
            try {
              await storage.setItem(STORAGE_KEYS.USER_OPTIMIZE_TEMPLATE, templates[0].id)
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
        const savedTemplateId = await storage.getItem(STORAGE_KEYS.ITERATE_TEMPLATE)
        console.log('[loadIterateTemplate] 开始加载，保存的模板ID:', savedTemplateId || '无')
        
        let needsClearAndSave = false
        
        if (savedTemplateId) {
          try {
            const template = templateManager.value!.getTemplate(savedTemplateId)
            if (template && template.metadata.templateType === 'iterate') {
              state.selectedIterateTemplate = template
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
          state.selectedIterateTemplate = templates[0]
          const reason = savedTemplateId ? '保存的模板加载失败' : '首次使用，没有保存的模板'
          console.log(`[loadIterateTemplate] 回退到默认模板: ${templates[0].name} (原因: ${reason})`)
          
          // 如果需要清除无效数据或首次使用，保存新的选择
          if (needsClearAndSave || !savedTemplateId) {
            try {
              await storage.setItem(STORAGE_KEYS.ITERATE_TEMPLATE, templates[0].id)
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
      if (!state.selectedOptimizeTemplate || !state.selectedUserOptimizeTemplate || !state.selectedIterateTemplate) {
        console.warn('Some templates failed to load:', {
          systemOptimize: !!state.selectedOptimizeTemplate,
          userOptimize: !!state.selectedUserOptimizeTemplate,
          iterate: !!state.selectedIterateTemplate
        })
      }
    } catch (error) {
      console.error('加载模板失败', error)
      toast.error('加载模板失败')
    } finally {
      state.isInitializing = false // 初始化完成
    }
  }

  // 监听服务实例变化，初始化模板选择
  watch(services, async () => {
    if (services.value?.templateManager) {
      await state.initTemplateSelection()
    }
  }, { immediate: true })

  // 保存提示词选择 - 修复版本，根据传入的类型决定存储键
  state.saveTemplateSelection = async (template: Template, type: 'system-optimize' | 'user-optimize' | 'iterate') => {
    try {
      let storageKey: string;
      switch (type) {
        case 'system-optimize':
          storageKey = STORAGE_KEYS.SYSTEM_OPTIMIZE_TEMPLATE;
          break;
        case 'user-optimize':
          storageKey = STORAGE_KEYS.USER_OPTIMIZE_TEMPLATE;
          break;
        case 'iterate':
          storageKey = STORAGE_KEYS.ITERATE_TEMPLATE;
          break;
        default:
          console.warn('未知的模板类型，无法保存:', type)
          return
      }
      
      console.log('[saveTemplateSelection] 正在保存选择:', {
        templateName: template.name,
        templateId: template.id,
        storageKey: storageKey
      })

      await storage.setItem(storageKey, template.id)
    } catch (error) {
      console.error(`保存模板选择失败:`, error)
    }
  }
  
  // 使用 watch 监听模板变化，并持久化
  watch(() => state.selectedOptimizeTemplate, (newTemplate, oldTemplate) => {
    if (state.isInitializing) return // 初始化期间不触发
    if (newTemplate && oldTemplate && newTemplate.id !== oldTemplate?.id) {
      state.saveTemplateSelection(newTemplate, 'system-optimize')
      toast.success(t('toast.success.templateSelected', {
        type: '系统提示词优化',
        name: newTemplate.name
      }))
    }
  })

  watch(() => state.selectedUserOptimizeTemplate, (newTemplate, oldTemplate) => {
    if (state.isInitializing) return // 初始化期间不触发
    if (newTemplate && oldTemplate && newTemplate.id !== oldTemplate?.id) {
      state.saveTemplateSelection(newTemplate, 'user-optimize')
      toast.success(t('toast.success.templateSelected', {
        type: '用户提示词优化',
        name: newTemplate.name
      }))
    }
  })

  watch(() => state.selectedIterateTemplate, (newTemplate, oldTemplate) => {
    if (state.isInitializing) return // 初始化期间不触发
    if (newTemplate && oldTemplate && newTemplate.id !== oldTemplate?.id) {
      state.saveTemplateSelection(newTemplate, 'iterate')
      toast.success(t('toast.success.templateSelected', {
        type: t('common.iterate'),
        name: newTemplate.name
      }))
    }
  })

  // 返回 reactive 对象，而不是包含多个 ref 的对象
  return state
} 