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
  promptService: Ref<IPromptService | null>
) {
  const toast = useToast()
  
  // 状态
  const prompt = ref('')
  const optimizedPrompt = ref('')
  const isOptimizing = ref(false)
  const isIterating = ref(false)
  const selectedOptimizeTemplate = ref<Template | null>(null)
  const selectedIterateTemplate = ref<Template | null>(null)
  const selectedOptimizeModel = ref('')
  const selectedTestModel = ref('')
  const currentChainId = ref('')
  const currentVersions = ref<PromptChain['versions']>([])
  const currentVersionId = ref('')
  
  // 本地存储key
  const STORAGE_KEYS = {
    OPTIMIZE_TEMPLATE: 'app:selected-optimize-template',
    ITERATE_TEMPLATE: 'app:selected-iterate-template',
    OPTIMIZE_MODEL: 'app:selected-optimize-model',
    TEST_MODEL: 'app:selected-test-model'
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
  const initTemplateSelection = async () => {
    try {
      // 加载优化提示词
      const optimizeTemplateId = localStorage.getItem(STORAGE_KEYS.OPTIMIZE_TEMPLATE)
      if (optimizeTemplateId) {
        const optimizeTemplate = await templateManager.getTemplate(optimizeTemplateId)
        if (optimizeTemplate) {
          selectedOptimizeTemplate.value = optimizeTemplate
        }
      }
      
      // 如果没有已保存的提示词或加载失败，使用该类型的第一个提示词
      if (!selectedOptimizeTemplate.value) {
        const optimizeTemplates = await templateManager.getTemplatesByType('optimize')
        if (optimizeTemplates.length > 0) {
          selectedOptimizeTemplate.value = optimizeTemplates[0]
        }
      }
      
      // 加载迭代提示词
      const iterateTemplateId = localStorage.getItem(STORAGE_KEYS.ITERATE_TEMPLATE)
      if (iterateTemplateId) {
        const iterateTemplate = await templateManager.getTemplate(iterateTemplateId)
        if (iterateTemplate) {
          selectedIterateTemplate.value = iterateTemplate
        }
      }
      
      // 如果没有已保存的提示词或加载失败，使用该类型的第一个提示词
      if (!selectedIterateTemplate.value) {
        const iterateTemplates = await templateManager.getTemplatesByType('iterate') 
        if (iterateTemplates.length > 0) {
          selectedIterateTemplate.value = iterateTemplates[0]
        }
      }

      // 如果仍然无法加载任何提示词，显示错误
      if (!selectedOptimizeTemplate.value || !selectedIterateTemplate.value) {
        throw new Error('无法加载默认提示词')
      }
    } catch (error: any) {
      console.error('加载提示词失败:', error)
      toast.error('加载提示词失败')
    }
  }

  // 保存模型选择
  const saveModelSelection = (model: string, type: 'optimize' | 'test') => {
    if (model) {
      localStorage.setItem(
        type === 'optimize' ? STORAGE_KEYS.OPTIMIZE_MODEL : STORAGE_KEYS.TEST_MODEL,
        model
      )
    }
  }

  // 初始化模型选择
  const initModelSelection = async () => {
    try {
      const enabledModels = modelManager.getAllModels().filter(m => m.enabled)
      const defaultModel = enabledModels[0]?.key

      if (defaultModel) {
        // 加载优化模型选择
        const savedOptimizeModel = localStorage.getItem(STORAGE_KEYS.OPTIMIZE_MODEL)
        selectedOptimizeModel.value = (savedOptimizeModel && enabledModels.find(m => m.key === savedOptimizeModel))
          ? savedOptimizeModel
          : defaultModel

        // 加载测试模型选择
        const savedTestModel = localStorage.getItem(STORAGE_KEYS.TEST_MODEL)
        selectedTestModel.value = (savedTestModel && enabledModels.find(m => m.key === savedTestModel))
          ? savedTestModel
          : defaultModel

        // 保存初始选择
        saveModelSelection(selectedOptimizeModel.value, 'optimize')
        saveModelSelection(selectedTestModel.value, 'test')
      }
    } catch (error: any) {
      console.error('初始化模型选择失败:', error)
      toast.error('初始化模型选择失败')
    }
  }

  // 处理模型选择
  const handleModelSelect = async (model: ModelConfig & { key: string }) => {
    if (model) {
      selectedOptimizeModel.value = model.key
      selectedTestModel.value = model.key
      
      saveModelSelection(model.key, 'optimize')
      saveModelSelection(model.key, 'test')
      
      toast.success(`已选择模型: ${model.name}`)
    }
  }

  // 监听模型选择变化
  watch(selectedOptimizeModel, (newVal) => {
    if (newVal) {
      saveModelSelection(newVal, 'optimize')
    }
  })

  watch(selectedTestModel, (newVal) => {
    if (newVal) {
      saveModelSelection(newVal, 'test')
    }
  })

  // 加载模型数据
  const loadModels = async () => {
    try {
      // 获取最新的启用模型列表
      const enabledModels = modelManager.getAllModels().filter(m => m.enabled)
      const defaultModel = enabledModels[0]?.key

      // 验证当前选中的模型是否仍然可用
      if (!enabledModels.find(m => m.key === selectedOptimizeModel.value)) {
        selectedOptimizeModel.value = defaultModel || ''
      }
      if (!enabledModels.find(m => m.key === selectedTestModel.value)) {
        selectedTestModel.value = defaultModel || ''
      }

      toast.success('模型列表已更新')
    } catch (error: any) {
      console.error('加载模型列表失败:', error)
      toast.error('加载模型列表失败')
    }
  }

  // 在 onMounted 中初始化
  onMounted(async () => {
    await initModelSelection()
  })

  return {
    // 状态
    prompt,
    optimizedPrompt,
    isOptimizing,
    isIterating,
    selectedOptimizeTemplate,
    selectedIterateTemplate,
    selectedOptimizeModel,
    selectedTestModel,
    currentChainId,
    currentVersions,
    currentVersionId,
    
    // 方法
    handleOptimizePrompt,
    handleIteratePrompt,
    handleSwitchVersion,
    saveTemplateSelection,
    initTemplateSelection,
    handleModelSelect,
    saveModelSelection,
    initModelSelection,
    loadModels
  }
} 