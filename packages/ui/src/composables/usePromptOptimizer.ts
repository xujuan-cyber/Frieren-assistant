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
  ITemplateManager
} from '@prompt-optimizer/core'


type PromptChain = PromptRecordChain

export function usePromptOptimizer(
  modelManager: ModelManager,
  templateManager: ITemplateManager,
  historyManager: IHistoryManager,
  promptService: Ref<IPromptService | null>,
  selectedOptimizeModel: Ref<string>,
  selectedTestModel: Ref<string>
) {
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
  
  // 本地存储key
  const STORAGE_KEYS = {
    OPTIMIZE_TEMPLATE: 'app:selected-optimize-template',
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
    
    isOptimizing.value = true
    optimizedPrompt.value = ''  // Clear previous result
    
    try {
      // Use streaming call
      await promptService.value.optimizePromptStream(
        prompt.value, 
        selectedOptimizeModel.value,
        selectedOptimizeTemplate.value.id,
        {
          onToken: (token: string) => {
            optimizedPrompt.value += token
          },
          onComplete: async () => {
            if (!selectedOptimizeTemplate.value) return
            
            try {
              // Create new record chain (异步调用需要await)
              const newRecord = await historyManager.createNewChain({
                id: uuidv4(),
                originalPrompt: prompt.value,
                optimizedPrompt: optimizedPrompt.value,
                type: 'optimize',
                modelKey: selectedOptimizeModel.value,
                templateId: selectedOptimizeTemplate.value.id,
                timestamp: Date.now(),
                metadata: {}
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
        selectedOptimizeModel.value,
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
                modelKey: selectedOptimizeModel.value,
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
  
  // 保存提示词选择
  const saveTemplateSelection = async (template: Template, type: 'optimize' | 'iterate') => {
    try {
      await storage.setItem(
        type === 'optimize' ? STORAGE_KEYS.OPTIMIZE_TEMPLATE : STORAGE_KEYS.ITERATE_TEMPLATE,
        template.id
      )
    } catch (error) {
      console.error(`保存模板选择失败 (${type}):`, error)
    }
  }
  
  // 初始化提示词选择
  const initTemplateSelection = async () => {
    try {
      // 确保模板管理器已初始化
      await templateManager.ensureInitialized()

      // 加载优化提示词
      const optimizeTemplateId = await storage.getItem(STORAGE_KEYS.OPTIMIZE_TEMPLATE)
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
      
      // 如果没有已保存的提示词或加载失败，使用该类型的第一个提示词
      if (!selectedOptimizeTemplate.value) {
        const optimizeTemplates = templateManager.listTemplatesByType('optimize')
        if (optimizeTemplates.length > 0) {
          selectedOptimizeTemplate.value = optimizeTemplates[0]
        }
      }
      
      // 加载迭代提示词
      const iterateTemplateId = await storage.getItem(STORAGE_KEYS.ITERATE_TEMPLATE)
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
      console.error('加载模板失败', error)
      toast.error('加载模板失败')
    }
  }

  // 在 onMounted 中初始化
  onMounted(async () => {
    await initTemplateSelection()
  })

  // 处理模板选择
  const handleTemplateSelect = async (template: Template, type: 'optimize' | 'iterate') => {
    try {
      if (type === 'optimize') {
        selectedOptimizeTemplate.value = template
      } else {
        selectedIterateTemplate.value = template
      }
      
      await saveTemplateSelection(template, type)
      toast.success(t('toast.success.templateSelected', {
        type: type === 'optimize' ? t('common.optimize') : t('common.iterate'),
        name: template.name
      }))
    } catch (error) {
      console.error(`模板选择失败 (${type}):`, error)
      toast.error(t('toast.error.selectTemplateFailed'))
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