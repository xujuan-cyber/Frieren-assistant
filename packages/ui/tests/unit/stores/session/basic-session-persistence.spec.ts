import { describe, it, expect, vi } from 'vitest'
import { useBasicSystemSession } from '../../../../src/stores/session/useBasicSystemSession'
import { useBasicUserSession } from '../../../../src/stores/session/useBasicUserSession'
import { createTestPinia } from '../../../utils/pinia-test-helpers'
import { TEMPLATE_SELECTION_KEYS } from '@prompt-optimizer/core'

describe('Session stores (basic) persistence', () => {
  it('basic-system saveSession writes snapshot to preferenceService', async () => {
    const set = vi.fn(async () => {})

    const { pinia } = createTestPinia({
      preferenceService: {
        get: async <T,>(_key: string, defaultValue: T) => defaultValue,
        set,
        delete: async () => {},
        keys: async () => [],
        clear: async () => {},
        getAll: async () => ({}),
        exportData: async () => ({}),
        importData: async () => {},
        getDataType: async () => 'preference',
        validateData: async () => true,
      } as any
    })

    const store = useBasicSystemSession(pinia)
    store.updatePrompt('p')
    store.updateOptimizedResult({ optimizedPrompt: 'o', reasoning: 'r', chainId: 'c', versionId: 'v' })
    store.updateTestContent('t')
    store.updateTemplate('tpl')
    store.updateIterateTemplate('tpl-iter')

    await store.saveSession()

    expect(set).toHaveBeenCalled()
    const lastCall = set.mock.calls.at(-1)
    expect(lastCall?.[0]).toBe('session/v1/basic-system')

    const raw = lastCall?.[1]
    const saved =
      typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw as Record<string, unknown> | undefined) || {}
    expect(saved).toMatchObject({
      prompt: 'p',
      optimizedPrompt: 'o',
      reasoning: 'r',
      chainId: 'c',
      versionId: 'v',
      testContent: 't',
      selectedTemplateId: 'tpl',
      selectedIterateTemplateId: 'tpl-iter',
    })
  })

  it('basic-user restoreSession migrates legacy template selection when missing', async () => {
    const get = vi.fn(async (key: string, defaultValue: any) => {
      if (key === 'session/v1/basic-user') return null
      if (key === TEMPLATE_SELECTION_KEYS.USER_OPTIMIZE_TEMPLATE) return 'legacy-template'
      return defaultValue
    })

    const { pinia } = createTestPinia({
      preferenceService: {
        get,
        set: async () => {},
        delete: async () => {},
        keys: async () => [],
        clear: async () => {},
        getAll: async () => ({}),
        exportData: async () => ({}),
        importData: async () => {},
        getDataType: async () => 'preference',
        validateData: async () => true,
      } as any
    })

    const store = useBasicUserSession(pinia)
    await store.restoreSession()

    expect(store.selectedTemplateId).toBe('legacy-template')
    expect(get).toHaveBeenCalledWith('session/v1/basic-user', null)
  })

  it('basic-system restoreSession migrates legacy latest test variants to workspace', async () => {
    const get = vi.fn(async (key: string, defaultValue: any) => {
      if (key !== 'session/v1/basic-system') return defaultValue
      return {
        prompt: 'p',
        optimizedPrompt: 'draft',
        reasoning: '',
        chainId: '',
        versionId: '',
        testContent: 'input',
        layout: { mainSplitLeftPct: 50, testColumnCount: 2 },
        testVariants: [
          { id: 'a', version: 0, modelKey: 'm1' },
          { id: 'b', version: 'latest', modelKey: 'm2' },
          { id: 'c', version: 'latest', modelKey: 'm3' },
          { id: 'd', version: 'latest', modelKey: 'm4' },
        ],
        testVariantResults: {
          a: { result: '', reasoning: '' },
          b: { result: '', reasoning: '' },
          c: { result: '', reasoning: '' },
          d: { result: '', reasoning: '' },
        },
        testVariantLastRunFingerprint: {
          a: '',
          b: '',
          c: '',
          d: '',
        },
        evaluationResults: {},
        selectedOptimizeModelKey: '',
        selectedTestModelKey: '',
        selectedTemplateId: null,
        selectedIterateTemplateId: null,
        isCompareMode: true,
        lastActiveAt: Date.now(),
      }
    })

    const { pinia } = createTestPinia({
      preferenceService: {
        get,
        set: async () => {},
        delete: async () => {},
        keys: async () => [],
        clear: async () => {},
        getAll: async () => ({}),
        exportData: async () => ({}),
        importData: async () => {},
        getDataType: async () => 'preference',
        validateData: async () => true,
      } as any
    })

    const store = useBasicSystemSession(pinia)
    await store.restoreSession()

    expect(store.testVariants.map((item) => item.version)).toEqual([0, 'workspace', 'workspace', 'workspace'])
  })

  it('uses English warnings when preferenceService is unavailable', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { pinia } = createTestPinia({
      preferenceService: undefined as any,
    })

    const basicSystemStore = useBasicSystemSession(pinia)
    await basicSystemStore.saveSession()
    await basicSystemStore.restoreSession()

    const basicUserStore = useBasicUserSession(pinia)
    await basicUserStore.saveSession()
    await basicUserStore.restoreSession()

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[BasicSystemSession] PreferenceService is unavailable; cannot save session',
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[BasicSystemSession] PreferenceService is unavailable; cannot restore session',
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[BasicUserSession] PreferenceService is unavailable; cannot save session',
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[BasicUserSession] PreferenceService is unavailable; cannot restore session',
    )

    consoleWarnSpy.mockRestore()
  })

  it('uses English error logs when basic session persistence throws', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('boom')
    const { pinia } = createTestPinia({
      preferenceService: {
        get: vi.fn(async () => {
          throw error
        }),
        set: vi.fn(async () => {
          throw error
        }),
        delete: async () => {},
        keys: async () => [],
        clear: async () => {},
        getAll: async () => ({}),
        exportData: async () => ({}),
        importData: async () => {},
        getDataType: async () => 'preference',
        validateData: async () => true,
      } as any,
    })

    const basicSystemStore = useBasicSystemSession(pinia)
    await basicSystemStore.saveSession()
    await basicSystemStore.restoreSession()

    const basicUserStore = useBasicUserSession(pinia)
    await basicUserStore.saveSession()
    await basicUserStore.restoreSession()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[BasicSystemSession] Failed to save session:',
      error,
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[BasicSystemSession] Failed to restore session:',
      error,
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[BasicUserSession] Failed to save session:',
      error,
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[BasicUserSession] Failed to restore session:',
      error,
    )

    consoleErrorSpy.mockRestore()
  })
})
