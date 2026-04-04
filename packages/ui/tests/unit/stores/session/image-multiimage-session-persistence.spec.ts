import { describe, it, expect, vi } from 'vitest'
import { createTestPinia } from '../../../utils/pinia-test-helpers'
import { useImageMultiImageSession } from '../../../../src/stores/session/useImageMultiImageSession'

describe('Session store (image-multiimage) persistence', () => {
  it('persists the ordered multi-image list and restores it with the same order', async () => {
    const savedSnapshots = new Map<string, unknown>()
    const imageMap = new Map<string, { data: string; metadata: { mimeType: string } }>()

    const { pinia } = createTestPinia({
      preferenceService: {
        get: async <T,>(key: string, defaultValue: T) =>
          (savedSnapshots.has(key) ? savedSnapshots.get(key) : defaultValue) as T,
        set: async (key: string, value: unknown) => {
          savedSnapshots.set(key, value)
        },
        delete: async () => {},
        keys: async () => [],
        clear: async () => {},
        getAll: async () => ({}),
        exportData: async () => ({}),
        importData: async () => {},
        getDataType: async () => 'preference',
        validateData: async () => true,
      } as any,
      imageStorageService: {
        saveImage: vi.fn(async (data: any) => {
          imageMap.set(data.metadata.id, {
            data: data.data,
            metadata: { mimeType: data.metadata.mimeType },
          })
          return data.metadata.id
        }),
        getImage: vi.fn(async (id: string) => imageMap.get(id) ?? null),
        getMetadata: vi.fn(async (id: string) =>
          imageMap.has(id)
            ? {
                id,
                mimeType: imageMap.get(id)?.metadata.mimeType || 'image/png',
                sizeBytes: 4,
                createdAt: Date.now(),
                accessedAt: Date.now(),
                source: 'uploaded',
              }
            : null,
        ),
        listAllMetadata: vi.fn(async () => []),
        deleteImages: vi.fn(async () => {}),
      } as any,
    })

    const store = useImageMultiImageSession(pinia)
    store.updatePrompt('将图1和图2融合成新画面')
    await store.addInputImage({ b64: 'AAAA', mimeType: 'image/png' })
    await store.addInputImage({ b64: 'BBBB', mimeType: 'image/jpeg' })
    store.reorderInputImages(1, 0)

    await store.saveSession()

    const restored = useImageMultiImageSession(pinia)
    restored.reset()
    await restored.restoreSession()

    expect(restored.originalPrompt).toBe('将图1和图2融合成新画面')
    expect(restored.inputImages).toHaveLength(2)
    expect(restored.inputImages[0]).toMatchObject({ b64: 'BBBB', mimeType: 'image/jpeg' })
    expect(restored.inputImages[1]).toMatchObject({ b64: 'AAAA', mimeType: 'image/png' })
  })

  it('restores test panel layout and variant state together with the workspace session', async () => {
    const savedSnapshots = new Map<string, unknown>()
    const imageMap = new Map<string, { data: string; metadata: { mimeType: string } }>()

    const { pinia } = createTestPinia({
      preferenceService: {
        get: async <T,>(key: string, defaultValue: T) =>
          (savedSnapshots.has(key) ? savedSnapshots.get(key) : defaultValue) as T,
        set: async (key: string, value: unknown) => {
          savedSnapshots.set(key, value)
        },
        delete: async () => {},
        keys: async () => [],
        clear: async () => {},
        getAll: async () => ({}),
        exportData: async () => ({}),
        importData: async () => {},
        getDataType: async () => 'preference',
        validateData: async () => true,
      } as any,
      imageStorageService: {
        saveImage: vi.fn(async (data: any) => {
          imageMap.set(data.metadata.id, {
            data: data.data,
            metadata: { mimeType: data.metadata.mimeType },
          })
          return data.metadata.id
        }),
        getImage: vi.fn(async (id: string) => imageMap.get(id) ?? null),
        getMetadata: vi.fn(async (id: string) =>
          imageMap.has(id)
            ? {
                id,
                mimeType: imageMap.get(id)?.metadata.mimeType || 'image/png',
                sizeBytes: 4,
                createdAt: Date.now(),
                accessedAt: Date.now(),
                source: 'uploaded',
              }
            : null,
        ),
        listAllMetadata: vi.fn(async () => []),
        deleteImages: vi.fn(async () => {}),
      } as any,
    })

    const store = useImageMultiImageSession(pinia)
    store.updatePrompt('用图1和图2做多图测试')
    await store.addInputImage({ b64: 'AAAA', mimeType: 'image/png' })
    await store.addInputImage({ b64: 'BBBB', mimeType: 'image/jpeg' })
    store.setTestColumnCount(4)
    store.setMainSplitLeftPct(42)
    store.updateTestVariant('a', { version: 'workspace', modelKey: 'image-model-a' })
    store.updateTestVariant('b', { version: 'previous', modelKey: 'image-model-b' })
    store.updateTestVariantResult('a', {
      images: [{ b64: 'CCCC', mimeType: 'image/png' }],
      metadata: { providerId: 'provider', modelId: 'model-a', configId: 'image-model-a' },
    })
    store.setTestVariantLastRunFingerprint('a', 'fingerprint-a')
    store.toggleCompareMode(false)

    await store.saveSession()

    const restored = useImageMultiImageSession(pinia)
    restored.reset()
    await restored.restoreSession()

    expect(restored.layout).toEqual({
      mainSplitLeftPct: 42,
      testColumnCount: 4,
    })
    expect(restored.testVariants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'a', version: 'workspace', modelKey: 'image-model-a' }),
        expect.objectContaining({ id: 'b', version: 'previous', modelKey: 'image-model-b' }),
      ]),
    )
    expect(restored.testVariantResults.a).toMatchObject({
      images: [{ b64: 'CCCC', mimeType: 'image/png' }],
    })
    expect(restored.testVariantLastRunFingerprint.a).toBe('fingerprint-a')
    expect(restored.isCompareMode).toBe(false)
  })
})
