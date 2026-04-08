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

    await handleUseFavorite({
      content: 'favorite prompt',
      functionMode: 'basic',
      optimizationMode: 'system',
    })

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
