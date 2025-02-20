import { ref, onMounted } from 'vue'
import { useToast } from './useToast'
import type { ModelManager, TemplateManager, HistoryManager, PromptService } from '@prompt-optimizer/core'
import { createLLMService, createPromptService } from '../services'

export function useServiceInitializer(
  modelManager: ModelManager,
  templateManager: TemplateManager,
  historyManager: HistoryManager
) {
  const toast = useToast()
  const promptServiceRef = ref<PromptService | null>(null)
  const llmService = createLLMService(modelManager)

  // 初始化基础服务
  const initBaseServices = () => {
    try {
      console.log('开始初始化基础服务...')

      // 获取并验证模板列表
      const templates = templateManager.listTemplates()
      console.log('模板列表:', templates)

      // 创建提示词服务
      console.log('创建提示词服务...')
      promptServiceRef.value = createPromptService(modelManager, llmService, templateManager, historyManager)
      
      console.log('初始化完成')
    } catch (error) {
      console.error('初始化基础服务失败:', error)
      toast.error('初始化失败：' + (error instanceof Error ? error.message : String(error)))
      throw error
    }
  }

  // 在 mounted 时自动初始化
  onMounted(() => {
    initBaseServices()
  })

  return {
    promptServiceRef,
    initBaseServices
  }
} 