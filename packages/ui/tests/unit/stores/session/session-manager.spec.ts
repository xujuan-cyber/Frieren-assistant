import { describe, it, expect, vi } from 'vitest'

import { createTestPinia, createPreferenceServiceStub } from '../../../utils/pinia-test-helpers'
import { useSessionManager } from '../../../../src/stores/session/useSessionManager'
import { useBasicSystemSession } from '../../../../src/stores/session/useBasicSystemSession'
import { useProMultiMessageSession } from '../../../../src/stores/session/useProMultiMessageSession'
import { useImageImage2ImageSession } from '../../../../src/stores/session/useImageImage2ImageSession'
import { useImageMultiImageSession } from '../../../../src/stores/session/useImageMultiImageSession'

describe('SessionManager', () => {
  it('cleans only the oversized session key when restore fails with session snapshot overflow', async () => {
    const deleteMock = vi.fn(async () => {})

    const { pinia, services } = createTestPinia({
      preferenceService: createPreferenceServiceStub({
        get: vi.fn(async () => {
          throw {
            code: 'error.storage.read',
            params: {
              reason: 'session_snapshot_too_large',
              key: 'session/v1/image-multiimage',
            },
          }
        }),
        delete: deleteMock,
      }),
      imageStorageService: {
        getImage: vi.fn(async () => null),
      } as any,
    })

    const manager = useSessionManager(pinia)

    await manager.restoreSubModeSession('image-multiimage')

    expect(deleteMock).toHaveBeenCalledTimes(1)
    expect(deleteMock).toHaveBeenCalledWith('session/v1/image-multiimage')
    expect(services.preferenceService.get).toHaveBeenCalledWith(
      'session/v1/image-multiimage',
      null,
    )
  })

  it('cleans the damaged session key when restore fails because a referenced image asset is missing', async () => {
    const deleteMock = vi.fn(async () => {})

    const { pinia, services } = createTestPinia({
      preferenceService: createPreferenceServiceStub({
        get: vi.fn(async () => {
          throw {
            code: 'error.storage.read',
            params: {
              reason: 'session_referenced_image_missing',
              key: 'session/v1/image-multiimage',
              assetId: 'missing-asset',
            },
          }
        }),
        delete: deleteMock,
      }),
      imageStorageService: {
        getImage: vi.fn(async () => null),
      } as any,
    })

    const manager = useSessionManager(pinia)

    await manager.restoreSubModeSession('image-multiimage')

    expect(deleteMock).toHaveBeenCalledTimes(1)
    expect(deleteMock).toHaveBeenCalledWith('session/v1/image-multiimage')
    expect(services.preferenceService.get).toHaveBeenCalledWith(
      'session/v1/image-multiimage',
      null,
    )
  })

  it('exposes normalized prompt session views without changing existing stores', () => {
    const { pinia } = createTestPinia()
    const manager = useSessionManager(pinia)
    manager.injectSubModeReaders({
      getFunctionMode: () => 'pro',
      getBasicSubMode: () => 'system',
      getProSubMode: () => 'multi',
      getImageSubMode: () => 'multiimage',
    })

    const basicSystem = useBasicSystemSession(pinia)
    basicSystem.prompt = 'Original system prompt'
    basicSystem.optimizedPrompt = 'Optimized system prompt'
    basicSystem.chainId = 'basic-chain'
    basicSystem.versionId = 'basic-version'
    basicSystem.assetBinding = {
      assetId: 'asset-basic',
      versionId: 'version-basic',
      status: 'linked',
    }
    basicSystem.origin = {
      kind: 'favorite',
      id: 'favorite-basic',
      metadata: { title: 'Basic favorite' },
    }
    basicSystem.testContent = 'User test input'
    basicSystem.testVariants = [
      { id: 'a', version: 0, modelKey: 'model-a' },
      { id: 'b', version: 'workspace', modelKey: 'model-b' },
      { id: 'c', version: 'workspace', modelKey: '' },
      { id: 'd', version: 'workspace', modelKey: '' },
    ]
    basicSystem.testVariantResults = {
      a: { result: 'Original result', reasoning: 'Original reasoning' },
      b: { result: 'Workspace result', reasoning: '' },
      c: { result: '', reasoning: '' },
      d: { result: '', reasoning: '' },
    }
    basicSystem.lastActiveAt = 1000

    const proMulti = useProMultiMessageSession(pinia)
    proMulti.conversationMessagesSnapshot = [
      {
        id: 'msg-1',
        role: 'system',
        content: 'Current message',
        originalContent: 'Original message',
      },
    ]
    proMulti.selectedMessageId = 'msg-1'
    proMulti.messageChainMap = { 'msg-1': 'message-chain' }
    proMulti.temporaryVariables = { audience: 'builders' }
    proMulti.testVariants = [
      { id: 'a', version: 'workspace', modelKey: 'model-pro' },
      { id: 'b', version: 'workspace', modelKey: '' },
      { id: 'c', version: 'workspace', modelKey: '' },
      { id: 'd', version: 'workspace', modelKey: '' },
    ]
    proMulti.testVariantResults = {
      a: { result: 'Conversation result', reasoning: '' },
      b: { result: '', reasoning: '' },
      c: { result: '', reasoning: '' },
      d: { result: '', reasoning: '' },
    }
    proMulti.lastActiveAt = 2000

    const multiImage = useImageMultiImageSession(pinia)
    multiImage.originalPrompt = 'Image prompt'
    multiImage.inputImages = [
      {
        id: 'runtime-1',
        assetId: 'input-asset-1',
        b64: 'abc',
        mimeType: 'image/png',
      },
      {
        id: 'runtime-2',
        assetId: null,
        b64: 'def',
        mimeType: 'image/jpeg',
      },
    ]
    multiImage.testVariants = [
      { id: 'a', version: 0, modelKey: 'image-model' },
      { id: 'b', version: 'workspace', modelKey: '' },
      { id: 'c', version: 'workspace', modelKey: '' },
      { id: 'd', version: 'workspace', modelKey: '' },
    ]
    multiImage.testVariantResults = {
      a: {
        images: [{ _type: 'image-ref', id: 'output-asset-1' }],
      },
      b: null,
      c: null,
      d: null,
    }
    multiImage.lastActiveAt = 3000

    const basicSession = manager.getPromptSession('basic-system')
    expect(basicSession).toMatchObject({
      id: 'implicit:basic-system',
      modeKey: 'basic-system',
      draft: {
        content: { kind: 'text', text: 'Optimized system prompt' },
      },
      optimization: {
        id: 'basic-chain',
        root: {
          content: { kind: 'text', text: 'Original system prompt' },
        },
      },
      assetBinding: {
        assetId: 'asset-basic',
        versionId: 'version-basic',
        status: 'linked',
      },
      origin: {
        kind: 'favorite',
        id: 'favorite-basic',
        metadata: { title: 'Basic favorite' },
      },
    })
    expect(basicSession.testRuns[0].runs).toHaveLength(2)
    expect(basicSession.testRuns[0].runs[0]).toMatchObject({
      revision: { kind: 'root', chainId: 'basic-chain' },
      input: { text: 'User test input' },
      output: {
        text: 'Original result',
        metadata: { reasoning: 'Original reasoning' },
      },
    })

    const activeSession = manager.getPromptSession()
    expect(activeSession).toMatchObject({
      id: 'implicit:pro-conversation',
      modeKey: 'pro-conversation',
      optimization: {
        id: 'message-chain',
        target: {
          kind: 'message',
          id: 'msg-1',
          role: 'system',
        },
      },
    })
    expect(activeSession.testRuns[0].runs[0]).toMatchObject({
      input: {
        parameters: { audience: 'builders' },
      },
      output: { text: 'Conversation result' },
    })

    const imageSession = manager.getPromptSession('image-multiimage')
    expect(imageSession.testRuns[0].runs[0]).toMatchObject({
      input: {
        images: [
          { kind: 'asset', assetId: 'input-asset-1' },
          { kind: 'url', url: 'data:image/jpeg;base64,def' },
        ],
      },
      output: {
        images: [{ kind: 'asset', assetId: 'output-asset-1' }],
      },
    })

    const registry = manager.getPromptSessionRegistry()
    expect(registry).toMatchObject({
      activeSessionId: 'implicit:pro-conversation',
      activeSessionIdByMode: {
        'basic-system': 'implicit:basic-system',
        'pro-conversation': 'implicit:pro-conversation',
        'image-multiimage': 'implicit:image-multiimage',
      },
      sessions: expect.arrayContaining([
        expect.objectContaining({
          id: 'implicit:basic-system',
          assetBinding: {
            assetId: 'asset-basic',
            versionId: 'version-basic',
            status: 'linked',
          },
          origin: {
            kind: 'favorite',
            id: 'favorite-basic',
            metadata: { title: 'Basic favorite' },
          },
        }),
      ]),
    })
    expect(registry.updatedAt).toBeGreaterThanOrEqual(3000)
    expect(manager.getAllPromptSessions()).toHaveLength(7)
  })

  it('clears asset bindings when session content is cleared', () => {
    const { pinia } = createTestPinia()

    const basicSystem = useBasicSystemSession(pinia)
    basicSystem.assetBinding = { assetId: 'asset-basic', versionId: 'v1', status: 'linked' }
    basicSystem.origin = { kind: 'favorite', id: 'favorite-basic' }
    basicSystem.clearContent({ persist: false })
    expect(basicSystem.assetBinding).toBeUndefined()
    expect(basicSystem.origin).toBeUndefined()

    const proMulti = useProMultiMessageSession(pinia)
    proMulti.assetBinding = { assetId: 'asset-pro', versionId: 'v2', status: 'linked' }
    proMulti.origin = { kind: 'favorite', id: 'favorite-pro' }
    proMulti.clearContent({ persist: false })
    expect(proMulti.assetBinding).toBeUndefined()
    expect(proMulti.origin).toBeUndefined()

    const imageImage = useImageImage2ImageSession(pinia)
    imageImage.assetBinding = { assetId: 'asset-image', versionId: 'v3', status: 'linked' }
    imageImage.origin = { kind: 'favorite', id: 'favorite-image' }
    imageImage.clearContent({ persist: false })
    expect(imageImage.assetBinding).toBeUndefined()
    expect(imageImage.origin).toBeUndefined()
  })

  it('preserves unsaved image2image input image data in normalized test runs', () => {
    const { pinia } = createTestPinia()
    const manager = useSessionManager(pinia)
    const imageImage = useImageImage2ImageSession(pinia)

    imageImage.originalPrompt = 'Restyle the image'
    imageImage.inputImageB64 = 'raw-input'
    imageImage.inputImageMime = 'image/webp'
    imageImage.testVariants = [
      { id: 'a', version: 'workspace', modelKey: 'image-model' },
      { id: 'b', version: 'workspace', modelKey: '' },
      { id: 'c', version: 'workspace', modelKey: '' },
      { id: 'd', version: 'workspace', modelKey: '' },
    ]
    imageImage.testVariantResults = {
      a: {
        images: [{ _type: 'image-ref', id: 'output-asset' }],
      },
      b: null,
      c: null,
      d: null,
    }

    const session = manager.getPromptSession('image-image2image')
    expect(session.testRuns[0].runs[0]).toMatchObject({
      input: {
        images: [{ kind: 'url', url: 'data:image/webp;base64,raw-input' }],
      },
      output: {
        images: [{ kind: 'asset', assetId: 'output-asset' }],
      },
    })
  })
})
