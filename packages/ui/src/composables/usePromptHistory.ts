import { ref, watch, type Ref, onMounted } from 'vue'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'
import { v4 as uuidv4 } from 'uuid'
import type { IHistoryManager, PromptRecordChain, PromptRecord } from '@prompt-optimizer/core'

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
    
    refreshHistory()
    showHistory.value = false
  }

  const handleClearHistory = () => {
    try {
      historyManager.clearHistory()
      
      // 清空当前显示的内容
      prompt.value = '';
      optimizedPrompt.value = '';
      currentChainId.value = '';
      currentVersions.value = [];
      currentVersionId.value = '';
      
      // 立即更新历史记录，确保UI能够反映最新状态
      history.value = []
      toast.success(t('toast.success.historyClear'))
    } catch (error) {
      console.error(t('toast.error.clearHistoryFailed'), error)
      toast.error(t('toast.error.clearHistoryFailed'))
    }
  }

  const handleDeleteChain = (chainId: string) => {
    try {
      // 获取链中的所有记录
      const allChains = historyManager.getAllChains()
      const chain = allChains.find(c => c.chainId === chainId)
      
      if (chain) {
        // 删除链中的所有记录
        chain.versions.forEach((record: PromptRecord) => {
          historyManager.deleteRecord(record.id)
        })
        
        // 如果当前正在查看的是被删除的链，则清空当前显示
        if (currentChainId.value === chainId) {
          prompt.value = '';
          optimizedPrompt.value = '';
          currentChainId.value = '';
          currentVersions.value = [];
          currentVersionId.value = '';
        }
        
        // 立即更新历史记录，确保UI能够反映最新状态
        history.value = [...historyManager.getAllChains()]
        toast.success(t('toast.success.historyChainDeleted'))
      }
    } catch (error) {
      console.error(t('toast.error.historyChainDeleteFailed'), error)
      toast.error(t('toast.error.historyChainDeleteFailed'))
    }
  }

  const initHistory = () => {
    try {
      refreshHistory()
    } catch (error) {
      console.error(t('toast.error.loadHistoryFailed'), error)
      toast.error(t('toast.error.loadHistoryFailed'))
    }
  }

  // 添加一个刷新历史记录的函数
  const refreshHistory = () => {
    history.value = [...historyManager.getAllChains()]
  }

  // Watch history display state
  watch(showHistory, (newVal) => {
    if (newVal) {
      refreshHistory()
    }
  })

  // Watch version changes, update history
  watch([currentVersions], () => {
    refreshHistory()
  })

  // 初始化时加载历史记录
  onMounted(() => {
    refreshHistory()
  })

  return {
    history,
    showHistory,
    handleSelectHistory,
    handleClearHistory,
    handleDeleteChain,
    initHistory
  }
} 