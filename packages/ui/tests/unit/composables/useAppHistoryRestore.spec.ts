import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import type { PromptRecord, PromptRecordChain } from '@prompt-optimizer/core'
import type { MessageReactive } from 'naive-ui'

import { useAppHistoryRestore } from '../../../src/composables/app/useAppHistoryRestore'
import { setGlobalMessageApi } from '../../../src/composables/ui/useToast'

const createReactive = (): MessageReactive =>
  ({
    destroy: () => {},
  } as unknown as MessageReactive)

const createImageRecord = (type: PromptRecord['type']): PromptRecord => ({
  id: 'record-1',
  chainId: 'chain-1',
  originalPrompt: '把图1和图2融合成一个电影感画面',
  optimizedPrompt: '优化后的多图提示词',
  version: 1,
  type,
  timestamp: Date.now(),
  modelKey: 'gemini',
  templateId: 'multiimage-optimize',
  metadata: {
    functionMode: 'image',
    imageModelKey: 'imagen',
    compareMode: true,
  },
})

describe('useAppHistoryRestore', () => {
  it('restores multiimage history into image-multiimage mode', async () => {
    setGlobalMessageApi({
      success: vi.fn(() => createReactive()),
      error: vi.fn(() => createReactive()),
      warning: vi.fn(() => createReactive()),
      info: vi.fn(() => createReactive()),
    })

    const navigateToSubModeKey = vi.fn()
    const handleSelectHistory = vi.fn()

    const record = createImageRecord('multiimageOptimize')
    const chain: PromptRecordChain = {
      chainId: 'chain-1',
      rootRecord: record,
      currentRecord: record,
      versions: [record],
    }

    const { handleHistoryReuse } = useAppHistoryRestore({
      services: ref(null),
      navigateToSubModeKey,
      handleContextModeChange: vi.fn(async () => {}),
      handleSelectHistory,
      proMultiMessageSession: {
        updateConversationMessages: vi.fn(),
        setMessageChainMap: vi.fn(),
        conversationMessagesSnapshot: [],
      } as any,
      systemWorkspaceRef: ref(null),
      userWorkspaceRef: ref(null),
      t: (key: string) => key,
      isLoadingExternalData: ref(false),
    })

    await handleHistoryReuse({
      record,
      chainId: chain.chainId,
      rootPrompt: chain.rootRecord.originalPrompt,
      chain,
    })

    expect(navigateToSubModeKey).toHaveBeenCalledWith('image-multiimage')
    expect(handleSelectHistory).not.toHaveBeenCalled()
  })
})
