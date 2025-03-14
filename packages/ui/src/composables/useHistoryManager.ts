import { ref, type Ref } from 'vue'
import type { HistoryManager } from '@prompt-optimizer/core'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'

export interface HistoryManagerHooks {
  showHistory: Ref<boolean>
  handleSelectHistory: (historyItem: any) => void
  handleClearHistory: () => void
  handleDeleteChain: (chainId: string) => void
}

export function useHistoryManager(
  historyManager: HistoryManager,
  prompt: Ref<string>,
  optimizedPrompt: Ref<string>,
  currentChainId: Ref<string | null>,
  currentVersions: Ref<any[]>,
  currentVersionId: Ref<string | null>,
  handleSelectHistoryBase: (historyItem: any) => void,
  handleClearHistoryBase: () => void,
  handleDeleteChainBase: (chainId: string) => void
): HistoryManagerHooks {
  const showHistory = ref(false)
  const toast = useToast()
  const { t } = useI18n()

  const handleSelectHistory = (historyItem: any) => {
    handleSelectHistoryBase(historyItem)
    showHistory.value = false
  }

  const handleClearHistory = () => {
    // 调用基础方法处理数据层面的清空
    handleClearHistoryBase()
    // 关闭历史记录抽屉
    showHistory.value = false
  }

  const handleDeleteChain = (chainId: string) => {
    // 调用基础方法处理数据层面的删除
    handleDeleteChainBase(chainId)
    // 不关闭历史记录抽屉，让用户继续查看其他记录
  }

  return {
    showHistory,
    handleSelectHistory,
    handleClearHistory,
    handleDeleteChain
  }
} 
