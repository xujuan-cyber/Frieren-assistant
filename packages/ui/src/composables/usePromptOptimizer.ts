import { ref, onMounted, watch } from 'vue'
import { useToast } from './useToast'
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
      toast.error('服务未初始化，请稍后重试')
      return
    }
    
    if (!selectedOptimizeTemplate.value) {
      toast.error('请先选择优化提示词')
      return
    }
    
    isOptimizing.value = true
    optimizedPrompt.value = ''  // 清空之前的结果
    
    try {
      // 使用流式调用
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
            
            // 创建新记录链
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
            
            toast.success('优化成功')
            isOptimizing.value = false
          },
          onError: (error: Error) => {
            console.error('优化过程出错:', error)
            toast.error(error.message || '优化失败')
            isOptimizing.value = false
          }
        }
      )
    } catch (error: any) {
      console.error('优化失败:', error)
      toast.error(error.message || '优化失败')
    } finally {
      isOptimizing.value = false
    }
  }
  
  // 迭代优化
  const handleIteratePrompt = async ({ originalPrompt, iterateInput }: { originalPrompt: string, iterateInput: string }) => {
    if (!originalPrompt || !iterateInput || isIterating.value) return
    if (!promptService.value) {
      toast.error('服务未初始化，请稍后重试')
      return
    }
    if (!selectedIterateTemplate.value) {
      toast.error('请先选择迭代提示词')
      return
    }

    isIterating.value = true
    optimizedPrompt.value = ''  // 清空之前的结果
    
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
            
            toast.success('迭代优化成功')
          },
          onError: (error: Error) => {
            toast.error(error.message || '迭代优化失败')
          }
        },
        selectedIterateTemplate.value
      );
    } catch (error: any) {
      console.error('迭代优化失败:', error)
      toast.error(error.message || '迭代优化失败')
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
      const iterateTemplateId = localStorage.getItem(STORAGE_KEYS.ITERATE_TEMPLATE)
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
      console.error('加载提示词失败:', error)
      toast.error('加载提示词失败')
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