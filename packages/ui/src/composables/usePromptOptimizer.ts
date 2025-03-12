import { ref, onMounted, watch } from 'vue'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'
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
        selectedOptimizeTemplate.value.content,
        {
          onToken: (token: string) => {
            optimizedPrompt.value += token
          },
          onComplete: () => {
            if (!selectedOptimizeTemplate.value) return
            
            // Create new record chain
            const newRecord = historyManager.createNewChain({
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
            isOptimizing.value = false
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
  const handleIteratePrompt = async ({ originalPrompt, iterateInput }: { originalPrompt: string, iterateInput: string }) => {
    if (!originalPrompt || !iterateInput || isIterating.value) return
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
        iterateInput,
        selectedOptimizeModel.value,
        {
          onToken: (token: string) => {
            optimizedPrompt.value += token
          },
          onComplete: () => {
            if (!selectedIterateTemplate.value) return
            
            const updatedChain = historyManager.addIteration({
              chainId: currentChainId.value,
              originalPrompt: originalPrompt,
              optimizedPrompt: optimizedPrompt.value,
              iterationNote: iterateInput,
              modelKey: selectedOptimizeModel.value,
              templateId: selectedIterateTemplate.value.id
            });
            
            currentVersions.value = updatedChain.versions;
            currentVersionId.value = updatedChain.currentRecord.id;
            
            toast.success(t('toast.success.iterateSuccess'))
          },
          onError: (error: Error) => {
            toast.error(error.message || t('toast.error.iterateFailed'))
          }
        },
        selectedIterateTemplate.value
      );
    } catch (error: any) {
      console.error(t('toast.error.iterateFailed'), error)
      toast.error(error.message || t('toast.error.iterateFailed'))
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
  const saveTemplateSelection = (template: Template, type: 'optimize' | 'iterate') => {
    localStorage.setItem(
      type === 'optimize' ? STORAGE_KEYS.OPTIMIZE_TEMPLATE : STORAGE_KEYS.ITERATE_TEMPLATE,
      template.id
    )
  }
  
  // 初始化提示词选择
  const initTemplateSelection = () => {
    try {
      // 加载优化提示词
      const optimizeTemplateId = localStorage.getItem(STORAGE_KEYS.OPTIMIZE_TEMPLATE)
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
      
      // 如果没有已保存的提示词或加载失败，使用该类型的第一个提示词
      if (!selectedOptimizeTemplate.value) {
        const optimizeTemplates = templateManager.listTemplatesByType('optimize')
        if (optimizeTemplates.length > 0) {
          selectedOptimizeTemplate.value = optimizeTemplates[0]
        }
      }
      
      // 加载迭代提示词
      const iterateTemplateId = localStorage.getItem(STORAGE_KEYS.ITERATE_TEMPLATE)
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
      
      // 如果没有已保存的提示词或加载失败，使用该类型的第一个提示词
      if (!selectedIterateTemplate.value) {
        const iterateTemplates = templateManager.listTemplatesByType('iterate')
        if (iterateTemplates.length > 0) {
          selectedIterateTemplate.value = iterateTemplates[0]
        }
      }

      // 如果仍然无法加载任何提示词，显示错误
      if (!selectedOptimizeTemplate.value || !selectedIterateTemplate.value) {
        throw new Error(t('toast.error.noDefaultTemplate'))
      }
    } catch (error) {
      console.error(t('toast.error.loadTemplateFailed'), error)
      toast.error(t('toast.error.loadTemplateFailed'))
    }
  }

  // 在 onMounted 中初始化
  onMounted(() => {
    initTemplateSelection()
  })

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
    saveTemplateSelection,
    initTemplateSelection
  }
} 