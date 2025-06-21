import { ref, onMounted, watch } from 'vue'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'
import { useStorage } from './useStorage'
import { v4 as uuidv4 } from 'uuid'
import type { Ref } from 'vue'
import type {
  ModelConfig,
  ModelManager,
  IHistoryManager,
  Template,
  PromptRecordChain,
  IPromptService,
  ITemplateManager,
  OptimizationMode,
  OptimizationRequest
} from '@prompt-optimizer/core'


type PromptChain = PromptRecordChain

export function usePromptOptimizer(
  modelManager: ModelManager,
  templateManager: ITemplateManager,
  historyManager: IHistoryManager,
  promptService: Ref<IPromptService | null>,
  selectedOptimizationMode?: Ref<OptimizationMode>,    // 新增：优化模式
  selectedOptimizeModel?: Ref<string>,                 // 新增：优化模型选择
  selectedTestModel?: Ref<string>                      // 新增：测试模型选择
) {
  // 如果没有传入参数，使用默认值
  const optimizationMode = selectedOptimizationMode || ref<OptimizationMode>('system')
  const optimizeModel = selectedOptimizeModel || ref('')
  const testModel = selectedTestModel || ref('')
  const toast = useToast()
  const { t } = useI18n()
  const storage = useStorage()
  
  // 状态
  const prompt = ref('')
  const optimizedPrompt = ref('')
  const isOptimizing = ref(false)
  const isIterating = ref(false)
  const isInitializing = ref(true) // 新增：初始化状态标志
  const selectedOptimizeTemplate = ref<Template | null>(null)  // 系统提示词优化模板
  const selectedUserOptimizeTemplate = ref<Template | null>(null)  // 用户提示词优化模板
  const selectedIterateTemplate = ref<Template | null>(null)
  const currentChainId = ref('')
  const currentVersions = ref<PromptChain['versions']>([])
  const currentVersionId = ref('')
  
  // 本地存储key - 分离系统和用户提示词优化模板
  const STORAGE_KEYS = {
    SYSTEM_OPTIMIZE_TEMPLATE: 'app:selected-system-optimize-template',
    USER_OPTIMIZE_TEMPLATE: 'app:selected-user-optimize-template',
    ITERATE_TEMPLATE: 'app:selected-iterate-template'
  } as const
  
  // 优化提示词
  const handleOptimizePrompt = async () => {
    if (!prompt.value.trim() || isOptimizing.value) return
    if (!promptService.value) {
      toast.error(t('toast.error.serviceInit'))
      return
    }

    // 根据优化模式选择对应的模板
    const currentTemplate = optimizationMode.value === 'system' 
      ? selectedOptimizeTemplate.value 
      : selectedUserOptimizeTemplate.value

    if (!currentTemplate) {
      toast.error(t('toast.error.noOptimizeTemplate'))
      return
    }

    if (!optimizeModel.value) {
      toast.error(t('toast.error.noOptimizeModel'))
      return
    }

    isOptimizing.value = true
    optimizedPrompt.value = ''  // Clear previous result

    try {
      // 构建优化请求
      const request: OptimizationRequest = {
        optimizationMode: optimizationMode.value,
        targetPrompt: prompt.value,
        templateId: currentTemplate.id,
        modelKey: optimizeModel.value
      }

      // 使用重构后的优化API
      await promptService.value.optimizePromptStream(
        request,
        {
          onToken: (token: string) => {
            optimizedPrompt.value += token
          },
          onComplete: async () => {
            if (!currentTemplate) return

            try {
              // Create new record chain with enhanced metadata
              const newRecord = await historyManager.createNewChain({
                id: uuidv4(),
                originalPrompt: prompt.value,
                optimizedPrompt: optimizedPrompt.value,
                type: 'optimize',
                modelKey: optimizeModel.value,
                templateId: currentTemplate.id,
                timestamp: Date.now(),
                metadata: {
                  optimizationMode: optimizationMode.value
                }
              });

              currentChainId.value = newRecord.chainId;
              currentVersions.value = newRecord.versions;
              currentVersionId.value = newRecord.currentRecord.id;

              toast.success(t('toast.success.optimizeSuccess'))
            } catch (error) {
              console.error('创建历史记录失败:', error)
              toast.error('创建历史记录失败: ' + (error as Error).message)
            } finally {
              isOptimizing.value = false
            }
          },
          onError: (error: Error) => {
            console.error(t('toast.error.optimizeProcessFailed'), error)
            toast.error(error.message || t('toast.error.optimizeFailed'))
            isOptimizing.value = false
          }
        }
      )
    } catch (error: any) {
      console.error(t('toast.error.optimizeFailed'), error)
      toast.error(error.message || t('toast.error.optimizeFailed'))
    } finally {
      isOptimizing.value = false
    }
  }
  
  // 迭代优化
  const handleIteratePrompt = async ({ originalPrompt, optimizedPrompt: lastOptimizedPrompt, iterateInput }: { originalPrompt: string, optimizedPrompt: string, iterateInput: string }) => {
    if (!originalPrompt || !lastOptimizedPrompt || !iterateInput || isIterating.value) return
    if (!promptService.value) {
      toast.error(t('toast.error.serviceInit'))
      return
    }
    if (!selectedIterateTemplate.value) {
      toast.error(t('toast.error.noIterateTemplate'))
      return
    }

    isIterating.value = true
    optimizedPrompt.value = ''  // Clear previous result
    
    try {
      await promptService.value.iteratePromptStream(
        originalPrompt,
        lastOptimizedPrompt,
        iterateInput,
        optimizeModel.value,
        {
          onToken: (token: string) => {
            optimizedPrompt.value += token
          },
          onComplete: async () => {
            if (!selectedIterateTemplate.value) return
            
            try {
              const updatedChain = await historyManager.addIteration({
                chainId: currentChainId.value,
                originalPrompt: originalPrompt,
                optimizedPrompt: optimizedPrompt.value,
                iterationNote: iterateInput,
                modelKey: optimizeModel.value,
                templateId: selectedIterateTemplate.value.id
              });
              
              currentVersions.value = updatedChain.versions
              currentVersionId.value = updatedChain.currentRecord.id
              
              toast.success(t('toast.success.iterateComplete'))
            } catch (error) {
              console.error('[History] 迭代记录失败:', error)
              toast.warning(t('toast.warning.historyFailed'))
            }
          },
          onError: (error: Error) => {
            console.error('[Iterate] 迭代失败:', error)
            toast.error(t('toast.error.iterateFailed'))
          }
        },
        selectedIterateTemplate.value.id
      )
    } catch (error) {
      console.error('[Iterate] 迭代失败:', error)
      toast.error(t('toast.error.iterateFailed'))
    } finally {
      isIterating.value = false
    }
  }
  
  // 切换版本
  const handleSwitchVersion = (version: PromptChain['versions'][number]) => {
    optimizedPrompt.value = version.optimizedPrompt;
    currentVersionId.value = version.id;
  }
  
  // 初始化提示词选择
  const initTemplateSelection = async () => {
    try {
      // 确保模板管理器已初始化
      await templateManager.ensureInitialized()
      
      // 加载系统提示词优化模板
      const loadSystemOptimizeTemplate = async () => {
        const savedTemplateId = await storage.getItem(STORAGE_KEYS.SYSTEM_OPTIMIZE_TEMPLATE)
        console.log('[loadSystemOptimizeTemplate] 开始加载，保存的模板ID:', savedTemplateId || '无')
        
        let needsClearAndSave = false
        
        if (savedTemplateId) {
          try {
            const template = templateManager.getTemplate(savedTemplateId)
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
        const templates = templateManager.listTemplatesByType('optimize')
        console.log('[loadSystemOptimizeTemplate] 可用的系统优化模板数量:', templates.length)
        
        if (templates.length > 0) {
          selectedOptimizeTemplate.value = templates[0]
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
            const template = templateManager.getTemplate(savedTemplateId)
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
        const templates = templateManager.listTemplatesByType('userOptimize')
        console.log('[loadUserOptimizeTemplate] 可用的用户优化模板数量:', templates.length)
        
        if (templates.length > 0) {
          selectedUserOptimizeTemplate.value = templates[0]
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
            const template = templateManager.getTemplate(savedTemplateId)
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
        const templates = templateManager.listTemplatesByType('iterate')
        console.log('[loadIterateTemplate] 可用的迭代模板数量:', templates.length)
        
        if (templates.length > 0) {
          selectedIterateTemplate.value = templates[0]
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
    } finally {
      isInitializing.value = false // 初始化完成
    }
  }

  // 在 onMounted 中初始化
  onMounted(async () => {
    await initTemplateSelection()
  })

  // 保存提示词选择 - 修复版本，根据传入的类型决定存储键
  const saveTemplateSelection = async (template: Template, type: 'system-optimize' | 'user-optimize' | 'iterate') => {
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
  watch(selectedOptimizeTemplate, (newTemplate, oldTemplate) => {
    if (isInitializing.value) return // 初始化期间不触发
    if (newTemplate && oldTemplate && newTemplate.id !== oldTemplate?.id) {
      saveTemplateSelection(newTemplate, 'system-optimize')
      toast.success(t('toast.success.templateSelected', {
        type: '系统提示词优化',
        name: newTemplate.name
      }))
    }
  })

  watch(selectedUserOptimizeTemplate, (newTemplate, oldTemplate) => {
    if (isInitializing.value) return // 初始化期间不触发
    if (newTemplate && oldTemplate && newTemplate.id !== oldTemplate?.id) {
      saveTemplateSelection(newTemplate, 'user-optimize')
      toast.success(t('toast.success.templateSelected', {
        type: '用户提示词优化',
        name: newTemplate.name
      }))
    }
  })

  watch(selectedIterateTemplate, (newTemplate, oldTemplate) => {
    if (isInitializing.value) return // 初始化期间不触发
    if (newTemplate && oldTemplate && newTemplate.id !== oldTemplate?.id) {
      saveTemplateSelection(newTemplate, 'iterate')
      toast.success(t('toast.success.templateSelected', {
        type: t('common.iterate'),
        name: newTemplate.name
      }))
    }
  })

  return {
    // 状态
    prompt,
    optimizedPrompt,
    isOptimizing,
    isIterating,
    selectedOptimizeTemplate,
    selectedUserOptimizeTemplate,
    selectedIterateTemplate,
    selectedOptimizeModel: optimizeModel,
    selectedTestModel: testModel,
    currentChainId,
    currentVersions,
    currentVersionId,

    // 方法
    handleOptimizePrompt,
    handleIteratePrompt,
    handleSwitchVersion,
    initTemplateSelection
  }
} 