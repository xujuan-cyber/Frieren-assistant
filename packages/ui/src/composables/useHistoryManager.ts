import { ref, type Ref } from 'vue'
import type { HistoryManager } from '@prompt-optimizer/core'

export interface HistoryManagerHooks {
  showHistory: Ref<boolean>
  handleSelectHistory: (historyItem: any) => void
  handleClearHistory: () => void
}

export function useHistoryManager(
  historyManager: HistoryManager,
  prompt: Ref<string>,
  optimizedPrompt: Ref<string>,
  currentChainId: Ref<string | null>,
  currentVersions: Ref<any[]>,
  currentVersionId: Ref<string | null>,
  handleSelectHistoryBase: (historyItem: any) => void
): HistoryManagerHooks {
  const showHistory = ref(false)

  const handleSelectHistory = (historyItem: any) => {
    handleSelectHistoryBase(historyItem)
    showHistory.value = false
  }

  return {
    showHistory,
    handleSelectHistory,
    handleClearHistory: historyManager.clearHistory
  }
} 
