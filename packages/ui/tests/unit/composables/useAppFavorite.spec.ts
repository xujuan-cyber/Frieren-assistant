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

  it('applies selected example parameters to pro-variable temporary variables', async () => {
    const success = vi.fn(() => createReactive())
    setGlobalMessageApi({
      success,
      error: vi.fn(() => createReactive()),
      warning: vi.fn(() => createReactive()),
      info: vi.fn(() => createReactive()),
    })

    const optimizerPrompt = ref('')
    const temporaryVariables: Record<string, string> = { topic: 'old' }
    const proVariableSession = {
      getTemporaryVariable: vi.fn((name: string) => temporaryVariables[name]),
      setTemporaryVariable: vi.fn((name: string, value: string) => {
        temporaryVariables[name] = value
      }),
      clearTemporaryVariables: vi.fn(() => {
        for (const key of Object.keys(temporaryVariables)) delete temporaryVariables[key]
      }),
    }

    const { handleUseFavorite } = useAppFavorite({
      navigateToSubModeKey: vi.fn(async () => {}),
      handleContextModeChange: vi.fn(async () => {}),
      optimizerPrompt,
      t: (key: string) => key,
      isLoadingExternalData: ref(false),
      proVariableSession,
    })

    const used = await handleUseFavorite({
      content: 'Write about {{topic}}',
      functionMode: 'context',
      optimizationMode: 'user',
      metadata: {
        reproducibility: {
          variables: [{ name: 'topic', defaultValue: 'default' }],
          examples: [
            { id: 'a', parameters: { topic: 'alpha' } },
            { id: 'b', parameters: { topic: 'beta' } },
          ],
        },
      },
    }, { applyExample: true, exampleId: 'b' })

    expect(used).toBe(true)
    expect(optimizerPrompt.value).toBe('Write about {{topic}}')
    expect(proVariableSession.clearTemporaryVariables).toHaveBeenCalled()
    expect(temporaryVariables.topic).toBe('beta')
    expect(success).toHaveBeenCalled()
  })

  it('applies image example input images without changing template content', async () => {
    const success = vi.fn(() => createReactive())
    setGlobalMessageApi({
      success,
      error: vi.fn(() => createReactive()),
      warning: vi.fn(() => createReactive()),
      info: vi.fn(() => createReactive()),
    })

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    const replaceInputImages = vi.fn()
    const imageMultiImageSession = {
      getTemporaryVariable: vi.fn(() => undefined),
      setTemporaryVariable: vi.fn(),
      clearTemporaryVariables: vi.fn(),
      replaceInputImages,
    }

    const { handleUseFavorite } = useAppFavorite({
      navigateToSubModeKey: vi.fn(async () => {}),
      handleContextModeChange: vi.fn(async () => {}),
      optimizerPrompt: ref('unchanged'),
      t: (key: string) => key,
      isLoadingExternalData: ref(false),
      imageMultiImageSession,
    })

    const used = await handleUseFavorite({
      content: 'Image prompt {{scene}}',
      functionMode: 'image',
      imageSubMode: 'multiimage',
      metadata: {
        reproducibility: {
          variables: [{ name: 'scene' }],
          examples: [{ id: 'img', parameters: { scene: 'city' }, inputImages: ['data:image/png;base64,AAECAw=='] }],
        },
      },
    }, { applyExample: true, exampleId: 'img' })

    expect(used).toBe(true)
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'image-workspace-restore-favorite',
      detail: expect.objectContaining({ content: 'Image prompt {{scene}}' }),
    }))
    expect(imageMultiImageSession.setTemporaryVariable).toHaveBeenCalledWith('scene', 'city')
    expect(replaceInputImages).toHaveBeenCalledWith([{ b64: 'AAECAw==', mimeType: 'image/png' }])

    dispatchSpy.mockRestore()
  })

  it('stops loading favorite data when workspace navigation rejects the target key', async () => {
    const success = vi.fn(() => createReactive())
    setGlobalMessageApi({
      success,
      error: vi.fn(() => createReactive()),
      warning: vi.fn(() => createReactive()),
      info: vi.fn(() => createReactive()),
    })

    const optimizerPrompt = ref('unchanged')
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    const { handleUseFavorite } = useAppFavorite({
      navigateToSubModeKey: vi.fn(async () => false),
      handleContextModeChange: vi.fn(async () => {}),
      optimizerPrompt,
      t: (key: string) => key,
      isLoadingExternalData: ref(false),
    })

    const used = await handleUseFavorite({
      content: 'image favorite prompt',
      functionMode: 'image',
      imageSubMode: 'text2image',
    })

    expect(used).toBe(false)
    expect(optimizerPrompt.value).toBe('unchanged')
    expect(dispatchSpy).not.toHaveBeenCalledWith(expect.objectContaining({
      type: 'image-workspace-restore-favorite',
    }))
    expect(success).not.toHaveBeenCalled()

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
