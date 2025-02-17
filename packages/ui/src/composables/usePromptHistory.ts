import { ref, watch, type Ref } from 'vue'
import { useToast } from './useToast'
import { v4 as uuidv4 } from 'uuid'
import type { IHistoryManager, PromptRecordChain } from '@prompt-optimizer/core'

type PromptChain = PromptRecordChain

export function usePromptHistory(
  historyManager: IHistoryManager,
  prompt: Ref<string>,
  optimizedPrompt: Ref<string>,
  currentChainId: Ref<string>,
  currentVersions: Ref<PromptChain['versions']>,
  currentVersionId: Ref<string>
) {
  const toast = useToast()
  const history = ref<PromptChain[]>([])
  const showHistory = ref(false)

  const handleSelectHistory = (context: { record: any, chainId: string, rootPrompt: string }) => {
    const { record, rootPrompt } = context
    
    prompt.value = rootPrompt
    optimizedPrompt.value = record.optimizedPrompt
    
    const newRecord = historyManager.createNewChain({
      id: uuidv4(),
      originalPrompt: rootPrompt,
      optimizedPrompt: record.optimizedPrompt,
      type: 'optimize',
      modelKey: record.modelKey,
      templateId: record.templateId,
      timestamp: Date.now(),
      metadata: {}
    })
    
    currentChainId.value = newRecord.chainId
    currentVersions.value = newRecord.versions
    currentVersionId.value = newRecord.currentRecord.id
    
    history.value = historyManager.getAllChains()
    showHistory.value = false
  }

  const handleClearHistory = async () => {
    try {
      await historyManager.clearHistory()
      history.value = []
      toast.success('历史记录已清空')
    } catch (error) {
      console.error('清空历史记录失败:', error)
      toast.error('清空历史记录失败')
    }
  }

  const initHistory = () => {
    try {
      history.value = historyManager.getAllChains()
    } catch (error) {
      console.error('加载历史记录失败:', error)
      toast.error('加载历史记录失败')
    }
  }

  // 监听历史记录显示状态
  watch(showHistory, (newVal) => {
    if (newVal) {
      history.value = historyManager.getAllChains()
    }
  })

  // 监听版本变化，更新历史记录
  watch([currentVersions], () => {
    history.value = historyManager.getAllChains()
  })

  return {
    history,
    showHistory,
    handleSelectHistory,
    handleClearHistory,
    initHistory
  }
} 