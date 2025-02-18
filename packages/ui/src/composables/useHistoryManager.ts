import { ref, onMounted } from 'vue'
import type { Ref } from 'vue'
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

  // 初始化历史记录
  const initHistory = () => {
    try {
      historyManager.init()
    } catch (error) {
      console.error('初始化历史记录失败:', error)
    }
  }

  // 在 mounted 时自动初始化
  onMounted(() => {
    initHistory()
  })

  return {
    showHistory,
    handleSelectHistory,
    handleClearHistory: historyManager.clearHistory
  }
} 