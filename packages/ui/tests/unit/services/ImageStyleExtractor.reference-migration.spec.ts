import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUnderstand, mockProcessTemplate } = vi.hoisted(() => ({
  mockUnderstand: vi.fn(),
  mockProcessTemplate: vi.fn(),
}))

vi.mock('@prompt-optimizer/core', async () => {
  const actual = await vi.importActual<typeof import('@prompt-optimizer/core')>(
    '@prompt-optimizer/core',
  )

  return {
    ...actual,
    createImageUnderstandingService: () => ({
      understand: mockUnderstand,
    }),
    TemplateProcessor: {
      processTemplate: mockProcessTemplate,
    },
  }
})

import {
  extractPromptVariables,
  resolveReferencePromptPreview,
} from '../../../src/services/ImageStyleExtractor'

describe('ImageStyleExtractor reference migration pipeline', () => {
  const modelConfig = {
    provider: 'mock',
    model: 'mock-image-understanding',
    apiKey: 'test-key',
  } as any

  const referenceSpec = {
    风格: {
      媒介: '胶片插画',
      光线: '傍晚逆光',
    },
    主体观察: {
      当前主体: '一只金毛犬',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockProcessTemplate.mockReturnValue([
      { role: 'system', content: 'extract reference spec' },
      { role: 'user', content: 'describe reference image' },
    ])

    mockUnderstand.mockResolvedValue({
      content: JSON.stringify(referenceSpec),
    })
  })

  it('按参考图生成时，走 extract spec -> compose -> variables', async () => {
    const templateManager = {
      getTemplate: vi.fn().mockResolvedValue({
        id: 'image-reference-spec-extraction',
        name: 'Extract Reference Spec',
        content: 'unused',
        metadata: {
          version: '1.0.0',
          lastModified: Date.now(),
          templateType: 'image-reference-spec-extraction',
          language: 'zh',
        },
      }),
    }

    const promptService = {
      optimizePrompt: vi.fn().mockResolvedValue(
        JSON.stringify({
          场景: {
            主体: '一只棕色的猫',
            风格: '胶片感插画',
          },
        }),
      ),
    }

    const variableExtractionService = {
      extract: vi.fn().mockResolvedValue({
        variables: [
          {
            name: '主体颜色',
            value: '棕色',
            position: {
              originalText: '棕色',
              occurrence: 1,
            },
            reason: '颜色是主要可调参数',
          },
        ],
        summary: '提取到 1 个变量',
      }),
    }

    const preview = await resolveReferencePromptPreview({
      mode: 'replicate',
      originalPrompt: '',
      imageB64: 'ZmFrZS1pbWFnZQ==',
      mimeType: 'image/png',
      modelConfig,
      templateManager: templateManager as any,
      promptService: promptService as any,
      variableExtractionService: variableExtractionService as any,
      modelKey: 'text-model',
      referenceMode: 'text2image',
    })

    expect(templateManager.getTemplate).toHaveBeenCalledWith('image-reference-spec-extraction')
    expect(mockUnderstand).toHaveBeenCalledWith(
      expect.objectContaining({
        modelConfig,
        systemPrompt: 'extract reference spec',
        userPrompt: 'describe reference image',
        responseMimeType: 'application/json',
      }),
    )
    expect(promptService.optimizePrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'image-prompt-from-reference-spec',
        modelKey: 'text-model',
        targetPrompt: '',
        advancedContext: {
          variables: expect.objectContaining({
            referenceMode: 'text2image',
            referenceSpecJson: JSON.stringify(referenceSpec, null, 2),
          }),
        },
      }),
    )
    expect(variableExtractionService.extract).toHaveBeenCalledWith({
      promptContent: JSON.stringify(
        {
          场景: {
            主体: '一只棕色的猫',
            风格: '胶片感插画',
          },
        },
        null,
        2,
      ),
      extractionModelKey: 'text-model',
    })
    expect(preview.prompt).toContain('{{主体颜色}}')
    expect(preview.variableDefaults).toEqual({
      主体颜色: '棕色',
    })
  })

  it('保留当前内容时，走 extract spec -> migrate -> variables，且保留原始主体语义', async () => {
    const promptService = {
      optimizePrompt: vi.fn().mockResolvedValue(
        JSON.stringify({
          场景: {
            主体: '两只棕色的猫',
            气氛: '胶片感、傍晚逆光',
          },
        }),
      ),
    }

    const variableExtractionService = {
      extract: vi.fn().mockResolvedValue({
        variables: [
          {
            name: '主体颜色',
            value: '棕色',
            position: {
              originalText: '棕色',
              occurrence: 1,
            },
            reason: '颜色是主要可调参数',
          },
        ],
        summary: '提取到 1 个变量',
      }),
    }

    const preview = await resolveReferencePromptPreview({
      mode: 'migrate',
      originalPrompt: '两只棕色的猫',
      imageB64: 'ZmFrZS1pbWFnZQ==',
      mimeType: 'image/png',
      modelConfig,
      templateManager: {
        getTemplate: vi.fn().mockResolvedValue({
          id: 'image-reference-spec-extraction',
          name: 'Extract Reference Spec',
          content: 'unused',
          metadata: {
            version: '1.0.0',
            lastModified: Date.now(),
            templateType: 'image-reference-spec-extraction',
            language: 'zh',
          },
        }),
      } as any,
      promptService: promptService as any,
      variableExtractionService: variableExtractionService as any,
      modelKey: 'text-model',
      referenceMode: 'text2image',
    })

    expect(promptService.optimizePrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'image-prompt-migration',
        targetPrompt: '两只棕色的猫',
        advancedContext: {
          variables: expect.objectContaining({
            referenceSpecJson: JSON.stringify(referenceSpec, null, 2),
          }),
        },
      }),
    )
    expect(variableExtractionService.extract).toHaveBeenCalledTimes(1)
    expect(preview.prompt).toContain('两只{{主体颜色}}的猫')
    expect(preview.prompt).toContain('胶片感、傍晚逆光')
    expect(preview.prompt).not.toContain('金毛犬')
    expect(preview.variableDefaults).toEqual({
      主体颜色: '棕色',
    })
  })

  it('变量抽取只保留最终 prompt 中实际出现的变量', async () => {
    const variableExtractionService = {
      extract: vi.fn().mockResolvedValue({
        variables: [
          {
            name: '主体颜色',
            value: '棕色',
            position: {
              originalText: '棕色',
              occurrence: 1,
            },
            reason: '主体颜色可复用',
          },
          {
            name: '背景场景',
            value: '森林',
            position: {
              originalText: '森林',
              occurrence: 1,
            },
            reason: '错误提取，不应保留',
          },
        ],
        summary: '提取到 2 个变量',
      }),
    }

    const result = await extractPromptVariables({
      prompt: JSON.stringify(
        {
          场景: {
            主体: '一只棕色的猫',
            背景: '白墙',
          },
        },
        null,
        2,
      ),
      rawText: '{"场景":{"主体":"一只棕色的猫","背景":"白墙"}}',
      modelKey: 'text-model',
      variableExtractionService: variableExtractionService as any,
    })

    expect(result.prompt).toContain('一只{{主体颜色}}的猫')
    expect(result.prompt).toContain('白墙')
    expect(result.variableDefaults).toEqual({
      主体颜色: '棕色',
    })
  })

  it('变量抽取最多只保留 5 个高优先级变量', async () => {
    const variableExtractionService = {
      extract: vi.fn().mockResolvedValue({
        variables: [
          {
            name: '主体',
            value: '猫',
            position: { originalText: '猫', occurrence: 1 },
            reason: '主体可复用',
          },
          {
            name: '数量',
            value: '两只',
            position: { originalText: '两只', occurrence: 1 },
            reason: '数量可复用',
          },
          {
            name: '颜色',
            value: '棕色',
            position: { originalText: '棕色', occurrence: 1 },
            reason: '颜色可复用',
          },
          {
            name: '动作',
            value: '奔跑',
            position: { originalText: '奔跑', occurrence: 1 },
            reason: '动作可复用',
          },
          {
            name: '场景',
            value: '草地',
            position: { originalText: '草地', occurrence: 1 },
            reason: '场景可复用',
          },
          {
            name: '光线',
            value: '黄昏逆光',
            position: { originalText: '黄昏逆光', occurrence: 1 },
            reason: '超过上限后不应保留',
          },
        ],
        summary: '提取到 6 个变量',
      }),
    }

    const result = await extractPromptVariables({
      prompt: '两只棕色的猫在草地上奔跑，黄昏逆光',
      modelKey: 'text-model',
      variableExtractionService: variableExtractionService as any,
    })

    expect(Object.keys(result.variableDefaults)).toHaveLength(5)
    expect(result.prompt).toContain('{{主体}}')
    expect(result.prompt).toContain('{{数量}}')
    expect(result.prompt).toContain('{{颜色}}')
    expect(result.prompt).toContain('{{动作}}')
    expect(result.prompt).toContain('{{场景}}')
    expect(result.prompt).toContain('黄昏逆光')
    expect(result.variableDefaults).not.toHaveProperty('光线')
  })
})
