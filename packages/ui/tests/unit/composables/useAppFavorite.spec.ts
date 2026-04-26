import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import type { MessageReactive } from 'naive-ui'

import { useAppFavorite } from '../../../src/composables/app/useAppFavorite'
import { setGlobalMessageApi } from '../../../src/composables/ui/useToast'

const createReactive = (): MessageReactive =>
  ({
    destroy: () => {},
  } as unknown as MessageReactive)

describe('useAppFavorite', () => {
  it('waits for workspace navigation before resolving a normal favorite load', async () => {
    const success = vi.fn(() => createReactive())
    setGlobalMessageApi({
      success,
      error: vi.fn(() => createReactive()),
      warning: vi.fn(() => createReactive()),
      info: vi.fn(() => createReactive()),
    })

    const optimizerPrompt = ref('')
    const order: string[] = []
    const navigateToSubModeKey = vi.fn(async () => {
      order.push('navigation-started')
      await Promise.resolve()
      order.push('navigation-finished')
    })

    const { handleUseFavorite } = useAppFavorite({
      navigateToSubModeKey,
      handleContextModeChange: vi.fn(async () => {}),
      optimizerPrompt,
      t: (key: string) => key,
      isLoadingExternalData: ref(false),
    })

    const used = await handleUseFavorite({
      content: 'favorite prompt',
      functionMode: 'basic',
      optimizationMode: 'system',
    })

    expect(used).toBe(true)
    expect(navigateToSubModeKey).toHaveBeenCalledWith('basic-system')
    expect(order).toEqual(['navigation-started', 'navigation-finished'])
    expect(optimizerPrompt.value).toBe('favorite prompt')
    expect(success).toHaveBeenCalled()
  })

  it('returns success for image favorites after dispatching restore data', async () => {
    const success = vi.fn(() => createReactive())
    setGlobalMessageApi({
      success,
      error: vi.fn(() => createReactive()),
      warning: vi.fn(() => createReactive()),
      info: vi.fn(() => createReactive()),
    })

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    const { handleUseFavorite } = useAppFavorite({
      navigateToSubModeKey: vi.fn(async () => {}),
      handleContextModeChange: vi.fn(async () => {}),
      optimizerPrompt: ref('unchanged'),
      t: (key: string) => key,
      isLoadingExternalData: ref(false),
    })

    const used = await handleUseFavorite({
      content: 'image favorite prompt',
      functionMode: 'image',
      imageSubMode: 'text2image',
      metadata: { source: 'test' },
    })

    expect(used).toBe(true)
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'image-workspace-restore-favorite',
    }))

    dispatchSpy.mockRestore()
  })

  it('logs favorite restore failures with an English runtime message', async () => {
    const error = vi.fn(() => createReactive())
    setGlobalMessageApi({
      success: vi.fn(() => createReactive()),
      error,
      warning: vi.fn(() => createReactive()),
      info: vi.fn(() => createReactive()),
    })

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { handleUseFavorite } = useAppFavorite({
      navigateToSubModeKey: vi.fn(() => {
        throw new Error('boom')
      }),
      handleContextModeChange: vi.fn(async () => {}),
      optimizerPrompt: ref(''),
      t: (key: string, params?: Record<string, unknown>) =>
        key === 'toast.error.favoriteLoadFailed'
          ? `favorite load failed: ${String(params?.error ?? '')}`
          : key,
      isLoadingExternalData: ref(false),
    })

    const used = await handleUseFavorite({
      content: 'favorite prompt',
      functionMode: 'basic',
      optimizationMode: 'system',
    })

    expect(used).toBe(false)
    expect(consoleErrorSpy).toHaveBeenCalledWith('[App] Failed to load favorite:', expect.any(Error))
    expect(error).toHaveBeenCalledWith(
      'favorite load failed: boom',
      expect.objectContaining({
        closable: true,
        duration: 3000,
        keepAliveOnHover: true,
      }),
    )

    consoleErrorSpy.mockRestore()
  })
})
