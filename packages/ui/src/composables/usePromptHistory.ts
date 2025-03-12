import { ref, watch, type Ref } from 'vue'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'
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
  const { t } = useI18n()
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

  const handleClearHistory = () => {
    try {
      historyManager.clearHistory()
      history.value = []
      toast.success(t('toast.success.historyClear'))
    } catch (error) {
      console.error(t('toast.error.historyClearFailed'), error)
      toast.error(t('toast.error.historyClearFailed'))
    }
  }

  const initHistory = () => {
    try {
      history.value = historyManager.getAllChains()
    } catch (error) {
      console.error(t('toast.error.loadHistoryFailed'), error)
      toast.error(t('toast.error.loadHistoryFailed'))
    }
  }

  // Watch history display state
  watch(showHistory, (newVal) => {
    if (newVal) {
      history.value = historyManager.getAllChains()
    }
  })

  // Watch version changes, update history
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