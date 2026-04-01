import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import type { ReferencePromptPreview } from '../../../src/services/ImageStyleExtractor'
import { useReferencePromptDialog } from '../../../src/composables/image/useReferencePromptDialog'

describe('useReferencePromptDialog', () => {
  const createPreview = (): ReferencePromptPreview => ({
    prompt: JSON.stringify(
      {
        场景: {
          主体: [{ 类型: '猫', 描述: '两只{{主体颜色}}的小猫' }],
        },
      },
      null,
      2,
    ),
    variableDefaults: {
      主体颜色: '棕色',
    },
    rawText: '{"prompt":{"场景":{"主体":[{"类型":"猫","描述":"两只{{主体颜色}}的小猫"}]}}}',
  })

  it('当前原始提示词为空时，默认按仅复刻打开且不展示模式切换', () => {
    const currentPrompt = ref('')
    const currentVariables = ref<Record<string, string>>({})

    const dialog = useReferencePromptDialog({
      getCurrentPrompt: () => currentPrompt.value,
      getCurrentVariables: () => ({ ...currentVariables.value }),
      applyPrompt: (nextPrompt) => {
        currentPrompt.value = nextPrompt
      },
      applyVariables: (nextVariables) => {
        currentVariables.value = { ...nextVariables }
      },
      resetPromptArtifacts: vi.fn(),
    })

    dialog.openDialog()

    expect(dialog.showDialog.value).toBe(true)
    expect(dialog.mode.value).toBe('replicate')
    expect(dialog.showModeSwitch.value).toBe(false)
  })

  it('当前原始提示词非空时，公开当前提示词预览供工作区展示', () => {
    const currentPrompt = ref(
      '  两只棕色的猫 在   阳光  下  追逐  '.repeat(6),
    )
    const currentVariables = ref<Record<string, string>>({
      老变量: '旧值',
    })

    const dialog = useReferencePromptDialog({
      getCurrentPrompt: () => currentPrompt.value,
      getCurrentVariables: () => ({ ...currentVariables.value }),
      applyPrompt: (nextPrompt) => {
        currentPrompt.value = nextPrompt
      },
      applyVariables: (nextVariables) => {
        currentVariables.value = { ...nextVariables }
      },
      resetPromptArtifacts: vi.fn(),
    })

    dialog.openDialog()

    const previewRef = (dialog as Record<string, any>).detectedOriginalPromptPreview
    const normalizedPrompt = currentPrompt.value.replace(/\s+/g, ' ').trim()
    const expectedPreview = `${normalizedPrompt.slice(0, 57).trimEnd()}...`

    dialog.setGeneratedPreview(createPreview())
    dialog.updatePrompt(
      JSON.stringify(
        {
          场景: {
            主体: [{ 类型: '猫', 描述: '两只{{主体颜色}}、神态更活泼的小猫' }],
          },
        },
        null,
        2,
      ),
    )
    dialog.updateVariableValue('主体颜色', '深棕色')

    expect(dialog.mode.value).toBe('migrate')
    expect(dialog.showModeSwitch.value).toBe(true)
    expect(dialog).toHaveProperty('detectedOriginalPromptPreview')
    expect(dialog.detectedOriginalPrompt.value).toBe(currentPrompt.value.trim())
    expect(previewRef?.value).toBe(expectedPreview)
    expect(previewRef?.value).not.toBe(dialog.detectedOriginalPrompt.value)
  })

  it('应用提示词和变量后，不再暴露撤销状态', () => {
    const currentPrompt = ref('两只棕色的猫')
    const currentVariables = ref<Record<string, string>>({
      老变量: '旧值',
    })
    const resetPromptArtifacts = vi.fn()

    const dialog = useReferencePromptDialog({
      getCurrentPrompt: () => currentPrompt.value,
      getCurrentVariables: () => ({ ...currentVariables.value }),
      applyPrompt: (nextPrompt) => {
        currentPrompt.value = nextPrompt
      },
      applyVariables: (nextVariables) => {
        currentVariables.value = { ...nextVariables }
      },
      resetPromptArtifacts,
    })

    dialog.openDialog()
    dialog.setGeneratedPreview(createPreview())
    dialog.updatePrompt(
      JSON.stringify(
        {
          场景: {
            主体: [{ 类型: '猫', 描述: '两只{{主体颜色}}、神态更活泼的小猫' }],
          },
        },
        null,
        2,
      ),
    )
    dialog.updateVariableValue('主体颜色', '深棕色')

    const applyResult = dialog.applyToCurrentPrompt()

    expect(applyResult).toBe(true)
    expect(currentPrompt.value).toContain('神态更活泼')
    expect(currentVariables.value).toEqual({
      主体颜色: '深棕色',
    })
    expect(resetPromptArtifacts).toHaveBeenCalledTimes(1)
    expect(dialog.showDialog.value).toBe(false)
    expect(dialog).not.toHaveProperty('canUndoLastApply')
    expect(dialog).not.toHaveProperty('undoLastApply')
  })

  it('取消弹窗不会改动当前提示词和变量', () => {
    const currentPrompt = ref('一只猫')
    const currentVariables = ref<Record<string, string>>({
      主体颜色: '白色',
    })

    const dialog = useReferencePromptDialog({
      getCurrentPrompt: () => currentPrompt.value,
      getCurrentVariables: () => ({ ...currentVariables.value }),
      applyPrompt: (nextPrompt) => {
        currentPrompt.value = nextPrompt
      },
      applyVariables: (nextVariables) => {
        currentVariables.value = { ...nextVariables }
      },
      resetPromptArtifacts: vi.fn(),
    })

    dialog.openDialog()
    dialog.setGeneratedPreview(createPreview())
    dialog.closeDialog()

    expect(currentPrompt.value).toBe('一只猫')
    expect(currentVariables.value).toEqual({
      主体颜色: '白色',
    })
    expect(dialog.showDialog.value).toBe(false)
  })

  it('编辑提示词不会自动刷新变量，且不再暴露同步变量状态', () => {
    const currentPrompt = ref('两只棕色的猫')
    const currentVariables = ref<Record<string, string>>({})

    const dialog = useReferencePromptDialog({
      getCurrentPrompt: () => currentPrompt.value,
      getCurrentVariables: () => ({ ...currentVariables.value }),
      applyPrompt: (nextPrompt) => {
        currentPrompt.value = nextPrompt
      },
      applyVariables: (nextVariables) => {
        currentVariables.value = { ...nextVariables }
      },
      resetPromptArtifacts: vi.fn(),
    })

    dialog.openDialog()
    dialog.setGeneratedPreview(createPreview())
    dialog.updatePrompt(
      JSON.stringify(
        {
          场景: {
            主体: [{ 类型: '猫', 描述: '两只{{主体颜色}}、戴围巾的小猫' }],
          },
        },
        null,
        2,
      ),
    )

    expect(dialog.workingVariables.value).toEqual({
      主体颜色: '棕色',
    })
    expect(dialog).not.toHaveProperty('showSyncVariablesAction')
    expect(dialog).not.toHaveProperty('markVariablesSynced')
  })

  it('生成结果缺少 prompt 时，会回退到 rawText 作为弹窗编辑内容', () => {
    const currentPrompt = ref('')
    const currentVariables = ref<Record<string, string>>({})

    const dialog = useReferencePromptDialog({
      getCurrentPrompt: () => currentPrompt.value,
      getCurrentVariables: () => ({ ...currentVariables.value }),
      applyPrompt: (nextPrompt) => {
        currentPrompt.value = nextPrompt
      },
      applyVariables: (nextVariables) => {
        currentVariables.value = { ...nextVariables }
      },
      resetPromptArtifacts: vi.fn(),
    })

    dialog.openDialog()
    dialog.setGeneratedPreview({
      prompt: '',
      variableDefaults: {
        主体颜色: '棕色',
      },
      rawText: '{"场景":{"主体":"一只{{主体颜色}}的小猫"}}',
    })

    expect(dialog.workingPrompt.value).toBe('{"场景":{"主体":"一只{{主体颜色}}的小猫"}}')
  })

  it('支持展示参考图处理阶段状态，并在完成后自动清空状态', () => {
    const currentPrompt = ref('两只棕色的猫')
    const currentVariables = ref<Record<string, string>>({})

    const dialog = useReferencePromptDialog({
      getCurrentPrompt: () => currentPrompt.value,
      getCurrentVariables: () => ({ ...currentVariables.value }),
      applyPrompt: (nextPrompt) => {
        currentPrompt.value = nextPrompt
      },
      applyVariables: (nextVariables) => {
        currentVariables.value = { ...nextVariables }
      },
      resetPromptArtifacts: vi.fn(),
    })

    dialog.openDialog()
    dialog.setProcessingStage('generating-preview')

    expect(dialog.processingStage.value).toBe('generating-preview')
    expect(dialog.hasProcessingStage.value).toBe(true)
    expect(dialog.showProcessingStageOptions.value).toBe(false)

    dialog.clearProcessingStage()
    expect(dialog.processingStage.value).toBe('idle')
    expect(dialog.hasProcessingStage.value).toBe(false)
  })
})
