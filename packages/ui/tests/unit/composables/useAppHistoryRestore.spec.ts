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

const createBasicRecord = (type: PromptRecord['type']): PromptRecord => ({
  id: 'record-basic-1',
  chainId: 'chain-basic-1',
  originalPrompt: 'Optimize this prompt',
  optimizedPrompt: 'Optimized prompt',
  version: 1,
  type,
  timestamp: Date.now(),
  modelKey: 'gemini',
  metadata: {
    optimizationMode: 'system',
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

  it('waits for workspace navigation before restoring basic history data', async () => {
    setGlobalMessageApi({
      success: vi.fn(() => createReactive()),
      error: vi.fn(() => createReactive()),
      warning: vi.fn(() => createReactive()),
      info: vi.fn(() => createReactive()),
    })

    const order: string[] = []
    const navigateToSubModeKey = vi.fn(async () => {
      order.push('navigation-started')
      await Promise.resolve()
      order.push('navigation-finished')
    })
    const handleSelectHistory = vi.fn(async () => {
      order.push('history-selected')
    })

    const record = createBasicRecord('optimize')
    const chain: PromptRecordChain = {
      chainId: 'chain-basic-1',
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

    expect(navigateToSubModeKey).toHaveBeenCalledWith('basic-system')
    expect(order).toEqual(['navigation-started', 'navigation-finished', 'history-selected'])
  })

  it('logs history restore failures with an English runtime message', async () => {
    const error = vi.fn(() => createReactive())
    setGlobalMessageApi({
      success: vi.fn(() => createReactive()),
      error,
      warning: vi.fn(() => createReactive()),
      info: vi.fn(() => createReactive()),
    })

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const navigateToSubModeKey = vi.fn()
    const handleSelectHistory = vi.fn(async () => {
      throw new Error('boom')
    })

    const record = createBasicRecord('optimize')
    const chain: PromptRecordChain = {
      chainId: 'chain-basic-1',
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
      t: (key: string, params?: Record<string, unknown>) =>
        key === 'toast.error.historyRestoreFailed'
          ? `history restore failed: ${String(params?.error ?? '')}`
          : key,
      isLoadingExternalData: ref(false),
    })

    await handleHistoryReuse({
      record,
      chainId: chain.chainId,
      rootPrompt: chain.rootRecord.originalPrompt,
      chain,
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith('[App] Failed to restore history:', expect.any(Error))
    expect(error).toHaveBeenCalledWith(
      'history restore failed: boom',
      expect.objectContaining({
        closable: true,
        duration: 3000,
        keepAliveOnHover: true,
      }),
    )

    consoleErrorSpy.mockRestore()
  })
})
