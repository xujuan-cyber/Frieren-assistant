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
  PromptType,
  OptimizationRequest
} from '@prompt-optimizer/core'


type PromptChain = PromptRecordChain

export function usePromptOptimizer(
  modelManager: ModelManager,
  templateManager: ITemplateManager,
  historyManager: IHistoryManager,
  promptService: Ref<IPromptService | null>,
  selectedPromptType?: Ref<PromptType>,    // 新增：提示词类型
  selectedOptimizeModel?: Ref<string>,     // 新增：优化模型选择
  selectedTestModel?: Ref<string>          // 新增：测试模型选择
) {
  // 如果没有传入参数，使用默认值
  const promptType = selectedPromptType || ref<PromptType>('system')
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
  const selectedOptimizeTemplate = ref<Template | null>(null)
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

    if (!selectedOptimizeTemplate.value) {
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
        promptType: promptType.value,
        targetPrompt: prompt.value,
        templateId: selectedOptimizeTemplate.value.id,
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
            if (!selectedOptimizeTemplate.value) return

            try {
              // Create new record chain with enhanced metadata
              const newRecord = await historyManager.createNewChain({
                id: uuidv4(),
                originalPrompt: prompt.value,
                optimizedPrompt: optimizedPrompt.value,
                type: 'optimize',
                modelKey: optimizeModel.value,
                templateId: selectedOptimizeTemplate.value.id,
                timestamp: Date.now(),
                metadata: {
                  promptType: promptType.value
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
  
  // 保存提示词选择 - 根据优化模式分别保存
  const saveTemplateSelection = async (template: Template, type: 'optimize' | 'iterate') => {
    try {
      let storageKey: string
      if (type === 'optimize') {
        // 根据当前提示词类型选择不同的存储键
        storageKey = promptType.value === 'system'
          ? STORAGE_KEYS.SYSTEM_OPTIMIZE_TEMPLATE
          : STORAGE_KEYS.USER_OPTIMIZE_TEMPLATE
      } else {
        storageKey = STORAGE_KEYS.ITERATE_TEMPLATE
      }

      await storage.setItem(storageKey, template.id)
    } catch (error) {
      console.error(`保存模板选择失败 (${type}):`, error)
    }
  }
  
  // 初始化提示词选择
  const initTemplateSelection = async () => {
    try {
      // 确保模板管理器已初始化
      await templateManager.ensureInitialized()

      // 加载优化模板的函数 - 根据提示词类型选择不同的存储键
      const loadOptimizeTemplate = async () => {
        const storageKey = promptType.value === 'system'
          ? STORAGE_KEYS.SYSTEM_OPTIMIZE_TEMPLATE
          : STORAGE_KEYS.USER_OPTIMIZE_TEMPLATE

        const savedTemplateId = await storage.getItem(storageKey)
        if (savedTemplateId) {
          try {
            const template = templateManager.getTemplate(savedTemplateId)
            if (template && template.metadata.templateType === 'optimize') {
              // 检查模板是否适用于当前提示词类型
              if (!template.metadata.promptType || template.metadata.promptType === promptType.value) {
                selectedOptimizeTemplate.value = template
                return
              }
            }
          } catch (error) {
            console.warn(`Failed to load saved optimize template for ${promptType.value} mode`, error)
          }
        }

        // 回退到第一个可用的模板（根据提示词类型选择对应的templateType）
        const templateType = promptType.value === 'system' ? 'optimize' : 'userOptimize'
        const templates = templateManager.listTemplatesByType(templateType)
        if (templates.length > 0) {
          selectedOptimizeTemplate.value = templates[0]
        } else {
          // 如果没有特定类型的模板，使用通用模板
          const generalTemplates = templateManager.listTemplatesByType('optimize')
          if (generalTemplates.length > 0) {
            selectedOptimizeTemplate.value = generalTemplates[0]
          }
        }
      }

      // 加载迭代模板的函数
      const loadIterateTemplate = async () => {
        const savedTemplateId = await storage.getItem(STORAGE_KEYS.ITERATE_TEMPLATE)
        if (savedTemplateId) {
          try {
            const template = templateManager.getTemplate(savedTemplateId)
            if (template && template.metadata.templateType === 'iterate') {
              selectedIterateTemplate.value = template
              return
            }
          } catch (error) {
            console.warn('Failed to load saved iterate template', error)
          }
        }

        // 回退到第一个可用的迭代模板
        const templates = templateManager.listTemplatesByType('iterate')
        if (templates.length > 0) {
          selectedIterateTemplate.value = templates[0]
        }
      }

      await loadOptimizeTemplate()
      await loadIterateTemplate()

      // 如果仍然无法加载任何提示词，显示错误
      if (!selectedOptimizeTemplate.value || !selectedIterateTemplate.value) {
        throw new Error('无法加载默认提示词')
      }
    } catch (error) {
      console.error('加载模板失败', error)
      toast.error('加载模板失败')
    }
  }

  // 监听提示词类型变化，静默重新加载模板（避免重复toast）
  watch(promptType, async (newType, oldType) => {
    if (newType !== oldType) {
      // 静默加载，不显示toast
      await initTemplateSelection()
    }
  })

  // 在 onMounted 中初始化
  onMounted(async () => {
    await initTemplateSelection()
  })

  // 处理模板选择
  const handleTemplateSelect = async (template: Template, type: 'optimize' | 'userOptimize' | 'iterate', showToast: boolean = true) => {
    try {
      if (type === 'optimize' || type === 'userOptimize') {
        selectedOptimizeTemplate.value = template
      } else {
        selectedIterateTemplate.value = template
      }

      // 将templateType转换为存储类型
      const storageType = (type === 'optimize' || type === 'userOptimize') ? 'optimize' : 'iterate'
      await saveTemplateSelection(template, storageType)

      // 只在明确要求时显示toast（避免自动切换时的重复提示）
      if (showToast) {
        let typeLabel: string
        if (type === 'optimize') {
          typeLabel = '系统提示词优化'
        } else if (type === 'userOptimize') {
          typeLabel = '用户提示词优化'
        } else {
          typeLabel = t('common.iterate')
        }

        toast.success(t('toast.success.templateSelected', {
          type: typeLabel,
          name: template.name
        }))
      }
    } catch (error) {
      console.error(`模板选择失败 (${type}):`, error)
      if (showToast) {
        toast.error(t('toast.error.selectTemplateFailed'))
      }
    }
  }

  return {
    // 状态
    prompt,
    optimizedPrompt,
    isOptimizing,
    isIterating,
    selectedOptimizeTemplate,
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
    handleTemplateSelect,
    saveTemplateSelection,
    initTemplateSelection
  }
} 