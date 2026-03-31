import { computed, ref } from 'vue'

import type {
  ReferenceApplicationMode,
  ReferencePromptPreview,
} from '../../services/ImageStyleExtractor'

export type ReferenceDialogProcessingStage =
  | 'idle'
  | 'generating-preview'

interface ReferenceDialogProcessingStageOption {
  value: Exclude<ReferenceDialogProcessingStage, 'idle'>
  labelKey: string
}

interface ReferencePromptDialogOptions {
  getCurrentPrompt: () => string
  getCurrentVariables: () => Record<string, string>
  applyPrompt: (prompt: string) => void
  applyVariables: (variables: Record<string, string>) => void
  resetPromptArtifacts?: () => void
}

const cloneVariables = (variables: Record<string, string>): Record<string, string> => ({
  ...variables,
})

const previewMaxLength = 60
const processingStageOptions: ReferenceDialogProcessingStageOption[] = [
  {
    value: 'generating-preview',
    labelKey: 'imageWorkspace.referenceImage.generatingPreview',
  },
]

const createPromptPreview = (prompt: string) => {
  const normalizedPrompt = prompt.replace(/\s+/g, ' ').trim()
  if (normalizedPrompt.length <= previewMaxLength) {
    return normalizedPrompt
  }

  return `${normalizedPrompt.slice(0, previewMaxLength - 3).trimEnd()}...`
}

const resolveGeneratedPrompt = (preview: ReferencePromptPreview) => {
  const primaryPrompt = preview.prompt?.trim()
  if (primaryPrompt) {
    return preview.prompt
  }

  return preview.rawText?.trim() || ''
}

export function useReferencePromptDialog(options: ReferencePromptDialogOptions) {
  const showDialog = ref(false)
  const mode = ref<ReferenceApplicationMode>('replicate')
  const detectedOriginalPrompt = ref('')
  const sourceImagePreviewUrl = ref('')
  const generatedPreview = ref<ReferencePromptPreview | null>(null)
  const workingPrompt = ref('')
  const workingVariables = ref<Record<string, string>>({})
  const detectedOriginalPromptPreview = ref('')
  const processingStage = ref<ReferenceDialogProcessingStage>('idle')

  const showModeSwitch = computed(() => detectedOriginalPrompt.value.trim().length > 0)
  const hasGeneratedPreview = computed(() => !!generatedPreview.value)
  const canApply = computed(() => workingPrompt.value.trim().length > 0)
  const hasProcessingStage = computed(() => processingStage.value !== 'idle')
  const currentProcessingStageLabelKey = computed(() => {
    if (processingStage.value === 'idle') {
      return ''
    }

    return (
      processingStageOptions.find((option) => option.value === processingStage.value)?.labelKey ||
      ''
    )
  })

  const resetGeneratedPreview = () => {
    generatedPreview.value = null
    workingPrompt.value = ''
    workingVariables.value = {}
  }

  const setProcessingStage = (stage: ReferenceDialogProcessingStage) => {
    processingStage.value = stage
  }

  const clearProcessingStage = () => {
    processingStage.value = 'idle'
  }

  const openDialog = () => {
    detectedOriginalPrompt.value = options.getCurrentPrompt().trim()
    detectedOriginalPromptPreview.value = createPromptPreview(
      detectedOriginalPrompt.value,
    )
    mode.value = detectedOriginalPrompt.value ? 'migrate' : 'replicate'
    sourceImagePreviewUrl.value = ''
    clearProcessingStage()
    resetGeneratedPreview()
    showDialog.value = true
  }

  const closeDialog = () => {
    clearProcessingStage()
    showDialog.value = false
  }

  const updateMode = (nextMode: ReferenceApplicationMode) => {
    mode.value = nextMode
  }

  const setImageSource = (payload: { name?: string; previewUrl?: string }) => {
    sourceImagePreviewUrl.value = payload.previewUrl?.trim() || ''
  }

  const setGeneratedPreview = (preview: ReferencePromptPreview) => {
    const resolvedPrompt = resolveGeneratedPrompt(preview)
    generatedPreview.value = {
      prompt: resolvedPrompt,
      variableDefaults: cloneVariables(preview.variableDefaults),
      rawText: preview.rawText,
    }
    workingPrompt.value = resolvedPrompt
    workingVariables.value = cloneVariables(preview.variableDefaults)
  }

  const updatePrompt = (prompt: string) => {
    workingPrompt.value = prompt
  }

  const updateVariableValue = (name: string, value: string) => {
    workingVariables.value = {
      ...workingVariables.value,
      [name]: value,
    }
  }

  const replaceWorkingVariables = (variables: Record<string, string>) => {
    workingVariables.value = cloneVariables(variables)
  }

  const applyToCurrentPrompt = () => {
    if (!canApply.value) {
      return false
    }

    options.applyPrompt(workingPrompt.value)
    options.applyVariables(cloneVariables(workingVariables.value))
    options.resetPromptArtifacts?.()
    closeDialog()
    return true
  }

  return {
    showDialog,
    mode,
    detectedOriginalPrompt,
    detectedOriginalPromptPreview,
    sourceImagePreviewUrl,
    generatedPreview,
    workingPrompt,
    workingVariables,
    processingStage,
    processingStageOptions,
    hasProcessingStage,
    currentProcessingStageLabelKey,
    showModeSwitch,
    hasGeneratedPreview,
    canApply,
    openDialog,
    closeDialog,
    updateMode,
    setImageSource,
    setProcessingStage,
    clearProcessingStage,
    resetGeneratedPreview,
    setGeneratedPreview,
    updatePrompt,
    updateVariableValue,
    replaceWorkingVariables,
    applyToCurrentPrompt,
  }
}
