import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EvaluationService } from '../../../src/services/evaluation/service'
import {
  EvaluationExecutionError,
  EvaluationValidationError,
} from '../../../src/services/evaluation/errors'
import type {
  CompareEvaluationRequest,
  EvaluationModeConfig,
  PromptOnlyEvaluationRequest,
  ResultEvaluationRequest,
} from '../../../src/services/evaluation/types'
import type { FullImageData, IImageStorageService } from '../../../src/services/image/types'
import type {
  IImageUnderstandingService,
  ImageUnderstandingExecutionRequest,
} from '../../../src/services/image-understanding/types'
import type { LLMResponse } from '../../../src/services/llm/types'
import type { TextModelConfig } from '../../../src/services/model/types'

const imageModeConfig: EvaluationModeConfig = {
  functionMode: 'image',
  subMode: 'text2image',
}

const createModelConfig = (id = 'image-recognition-model'): TextModelConfig => ({
  id,
  name: 'Image Recognition Model',
  enabled: true,
  providerMeta: {
    id: 'test-provider',
    name: 'Test Provider',
    requiresApiKey: false,
    defaultBaseURL: 'https://example.com',
    supportsDynamicModels: false,
  },
  modelMeta: {
    id,
    name: 'Image Recognition Model',
    providerId: 'test-provider',
    capabilities: {
      supportsTools: false,
    },
    parameterDefinitions: [],
  },
  connectionConfig: {},
  paramOverrides: {},
})

const createEvaluationJson = (overall = 88) =>
  JSON.stringify({
    score: {
      overall,
      dimensions: [
        {
          key: 'goalAchievement',
          label: 'Goal Achievement',
          score: overall,
        },
      ],
    },
    improvements: ['make the prompt clearer'],
    summary: 'looks solid',
    patchPlan: [],
  })

describe('EvaluationService image multimodal evaluation', () => {
  let mockLLMService: {
    sendMessage: ReturnType<typeof vi.fn>
    sendMessageStream: ReturnType<typeof vi.fn>
  }
  let mockModelManager: {
    getModel: ReturnType<typeof vi.fn>
  }
  let mockTemplateManager: {
    getTemplate: ReturnType<typeof vi.fn>
  }
  let mockImageUnderstandingService: {
    understand: ReturnType<typeof vi.fn>
  }
  let mockImageStorageService: {
    getImage: ReturnType<typeof vi.fn>
  }
  let modelConfig: TextModelConfig

  const createPromptOnlyRequest = (
    overrides: Partial<PromptOnlyEvaluationRequest> = {}
  ): PromptOnlyEvaluationRequest => ({
    type: 'prompt-only',
    target: {
      workspacePrompt: 'a cinematic beach scene prompt',
    },
    evaluationModelKey: 'image-recognition-model',
    mode: imageModeConfig,
    ...overrides,
  })

  const createResultRequest = (
    overrides: Partial<ResultEvaluationRequest> = {}
  ): ResultEvaluationRequest => ({
    type: 'result',
    target: {
      workspacePrompt: 'workspace image prompt',
      referencePrompt: 'original intent prompt',
    },
    testCase: {
      id: 'intent-case',
      label: '生成意图',
      input: {
        kind: 'text',
        label: '生成意图',
        content: '一只戴墨镜的柴犬在海滩上奔跑',
      },
    },
    snapshot: {
      id: 'snap-a',
      label: 'A',
      testCaseId: 'intent-case',
      promptRef: { kind: 'workspace', label: '工作区' },
      promptText: 'workspace image prompt with style details',
      output: '使用当前执行 prompt 生成的单张结果图。',
      outputBlock: {
        kind: 'image',
        label: '生成结果',
        content: '使用当前执行 prompt 生成的单张结果图。',
        media: [
          {
            label: 'A-1',
            b64: 'ZmFrZS1pbWFnZS0x',
            mimeType: 'image/png',
          },
        ],
      },
    },
    evaluationModelKey: 'image-recognition-model',
    mode: imageModeConfig,
    ...overrides,
  })

  const createCompareRequest = (
    overrides: Partial<CompareEvaluationRequest> = {}
  ): CompareEvaluationRequest => ({
    type: 'compare',
    target: {
      workspacePrompt: 'workspace image prompt',
      referencePrompt: 'original intent prompt',
    },
    testCases: [
      {
        id: 'intent-case',
        label: '生成意图',
        input: {
          kind: 'text',
          label: '生成意图',
          content: '一只戴墨镜的柴犬在海滩上奔跑',
        },
      },
    ],
    snapshots: [
      {
        id: 'snap-a',
        label: 'A',
        testCaseId: 'intent-case',
        promptRef: { kind: 'original', label: '原始' },
        promptText: 'original prompt',
        output: '原始 prompt 的单张结果图。',
        outputBlock: {
          kind: 'image',
          label: '生成结果',
          content: '原始 prompt 的单张结果图。',
          media: [
            {
              label: 'A-1',
              b64: 'ZmFrZS1pbWFnZS1B',
              mimeType: 'image/png',
            },
          ],
        },
      },
      {
        id: 'snap-b',
        label: 'B',
        testCaseId: 'intent-case',
        promptRef: { kind: 'workspace', label: '工作区' },
        promptText: 'workspace prompt',
        output: '工作区 prompt 的单张结果图。',
        outputBlock: {
          kind: 'image',
          label: '生成结果',
          content: '工作区 prompt 的单张结果图。',
          media: [
            {
              label: 'B-1',
              b64: 'ZmFrZS1pbWFnZS1C',
              mimeType: 'image/png',
            },
          ],
        },
      },
    ],
    evaluationModelKey: 'image-recognition-model',
    mode: imageModeConfig,
    ...overrides,
  })

  const createService = () =>
    new EvaluationService(
      mockLLMService as any,
      mockModelManager as any,
      mockTemplateManager as any,
      {
        imageStorageService: mockImageStorageService as unknown as IImageStorageService,
        imageUnderstandingService:
          mockImageUnderstandingService as unknown as IImageUnderstandingService,
      }
    )

  beforeEach(() => {
    modelConfig = createModelConfig()

    mockLLMService = {
      sendMessage: vi.fn().mockResolvedValue(createEvaluationJson(80)),
      sendMessageStream: vi.fn(),
    }

    mockModelManager = {
      getModel: vi.fn().mockResolvedValue(modelConfig),
    }

    mockTemplateManager = {
      getTemplate: vi.fn().mockResolvedValue({
        id: 'evaluation-image-text2image-result',
        content: [
          { role: 'system', content: 'System prompt for image evaluation.' },
          { role: 'user', content: 'User prompt for image evaluation.' },
        ],
      }),
    }

    mockImageUnderstandingService = {
      understand: vi.fn().mockResolvedValue({
        content: createEvaluationJson(88),
      } satisfies LLMResponse),
    }

    mockImageStorageService = {
      getImage: vi.fn(),
    }
  })

  it('uses the image understanding service for image result evaluation with image evidence', async () => {
    const service = createService()
    const response = await service.evaluate(createResultRequest())

    expect(response.score.overall).toBe(88)
    expect(mockLLMService.sendMessage).not.toHaveBeenCalled()
    expect(mockImageUnderstandingService.understand).toHaveBeenCalledTimes(1)

    const multimodalRequest =
      mockImageUnderstandingService.understand.mock.calls[0][0] as ImageUnderstandingExecutionRequest

    expect(multimodalRequest.modelConfig).toBe(modelConfig)
    expect(multimodalRequest.systemPrompt).toBe('System prompt for image evaluation.')
    expect(multimodalRequest.userPrompt).toContain('User prompt for image evaluation.')
    expect(multimodalRequest.userPrompt).toContain('A-1')
    expect(multimodalRequest.images).toEqual([
      {
        b64: 'ZmFrZS1pbWFnZS0x',
        mimeType: 'image/png',
      },
    ])
  })

  it('resolves asset-backed image evidence before sending it to the image understanding service', async () => {
    const service = createService()
    mockImageStorageService.getImage.mockResolvedValue({
      metadata: {
        id: 'asset-1',
        mimeType: 'image/jpeg',
        sizeBytes: 123,
        createdAt: Date.now(),
        accessedAt: Date.now(),
        source: 'generated',
      },
      data: 'YXNzZXQtYmFzZTY0',
    } satisfies FullImageData)

    await service.evaluate(
      createResultRequest({
        snapshot: {
          ...createResultRequest().snapshot,
          outputBlock: {
            kind: 'image',
            label: '生成结果',
            content: '使用 asset 引用保存的图像结果。',
            media: [
              {
                label: 'asset-image',
                assetId: 'asset-1',
              },
            ],
          },
        },
      })
    )

    expect(mockImageStorageService.getImage).toHaveBeenCalledWith('asset-1')
    expect(mockImageUnderstandingService.understand).toHaveBeenCalledTimes(1)

    const multimodalRequest =
      mockImageUnderstandingService.understand.mock.calls[0][0] as ImageUnderstandingExecutionRequest

    expect(multimodalRequest.images).toEqual([
      {
        b64: 'YXNzZXQtYmFzZTY0',
        mimeType: 'image/jpeg',
      },
    ])
  })

  it('rejects image compare when fewer than two snapshots include output image evidence', async () => {
    const service = createService()

    await expect(
      service.evaluate(
        createCompareRequest({
          snapshots: [
            createCompareRequest().snapshots[0],
            {
              ...createCompareRequest().snapshots[1],
              outputBlock: {
                kind: 'image',
                label: '生成结果',
                content: '没有图片证据。',
                media: [],
              },
            },
          ],
        })
      )
    ).rejects.toThrow(EvaluationValidationError)

    expect(mockImageUnderstandingService.understand).not.toHaveBeenCalled()
    expect(mockLLMService.sendMessage).not.toHaveBeenCalled()
  })

  it('rejects image compare when any compared snapshot lacks output image evidence', async () => {
    const service = createService()
    const compareRequest = createCompareRequest()

    await expect(
      service.evaluate(
        createCompareRequest({
          snapshots: [
            compareRequest.snapshots[0],
            compareRequest.snapshots[1],
            {
              id: 'snap-c',
              label: 'C',
              testCaseId: 'intent-case',
              promptRef: { kind: 'version', version: 1, label: 'v1' },
              promptText: 'previous prompt',
              output: '历史 prompt 的结果未附带图片证据。',
              outputBlock: {
                kind: 'image',
                label: '生成结果',
                content: '历史 prompt 的结果未附带图片证据。',
                media: [],
              },
            },
          ],
        })
      )
    ).rejects.toThrow(EvaluationValidationError)

    expect(mockImageUnderstandingService.understand).not.toHaveBeenCalled()
    expect(mockLLMService.sendMessage).not.toHaveBeenCalled()
  })

  it('raises a clear execution error when asset-backed image evidence cannot be resolved', async () => {
    const service = createService()
    mockImageStorageService.getImage.mockResolvedValue(null)

    await expect(
      service.evaluate(
        createResultRequest({
          snapshot: {
            ...createResultRequest().snapshot,
            outputBlock: {
              kind: 'image',
              label: '生成结果',
              content: '引用了缺失的图像资源。',
              media: [
                {
                  label: 'missing-image',
                  assetId: 'missing-asset',
                },
              ],
            },
          },
        })
      )
    ).rejects.toThrow(EvaluationExecutionError)
  })

  it('keeps image prompt-only evaluation on the existing text-only llm path', async () => {
    const service = createService()
    const response = await service.evaluate(createPromptOnlyRequest())

    expect(response.score.overall).toBe(80)
    expect(mockLLMService.sendMessage).toHaveBeenCalledTimes(1)
    expect(mockImageUnderstandingService.understand).not.toHaveBeenCalled()
  })
})
