import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ImageUnderstandingService } from '../../../src/services/image-understanding/service'
import type { ITextAdapterRegistry } from '../../../src/services/llm/types'

describe('ImageUnderstandingService', () => {
  let registry: ITextAdapterRegistry
  let adapter: any
  let service: ImageUnderstandingService

  const request = {
    modelConfig: {
      id: 'vision-model',
      name: 'Vision Model',
      enabled: true,
      providerMeta: {
        id: 'openai',
        name: 'OpenAI',
        requiresApiKey: true,
        defaultBaseURL: 'https://example.com',
        supportsDynamicModels: false,
      },
      modelMeta: {
        id: 'gpt-vision',
        name: 'GPT Vision',
        providerId: 'openai',
        capabilities: {
          supportsTools: false,
        },
        parameterDefinitions: [],
      },
      connectionConfig: {
        apiKey: 'test',
      },
      paramOverrides: {},
    },
    systemPrompt: 'system',
    userPrompt: 'user',
    images: [
      {
        b64: 'ZmFrZQ==',
        mimeType: 'image/png',
      },
    ],
  }

  beforeEach(() => {
    adapter = {
      sendImageUnderstanding: vi.fn().mockResolvedValue({ content: 'ok' }),
      sendImageUnderstandingStream: vi.fn(),
    }

    registry = {
      getAdapter: vi.fn().mockReturnValue(adapter),
    } as unknown as ITextAdapterRegistry

    service = new ImageUnderstandingService({ registry })
  })

  it('delegates understandStream to the provider adapter', async () => {
    const callbacks = {
      onToken: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    }

    adapter.sendImageUnderstandingStream.mockImplementation(async (_req: any, _config: any, streamCallbacks: any) => {
      streamCallbacks.onToken('A')
      await streamCallbacks.onComplete({ content: 'A' })
    })

    await service.understandStream(request as any, callbacks)

    expect(adapter.sendImageUnderstandingStream).toHaveBeenCalledTimes(1)
    expect(adapter.sendImageUnderstandingStream).toHaveBeenCalledWith(
      request,
      request.modelConfig,
      callbacks,
    )
  })
})
