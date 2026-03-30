import { computed, ref } from 'vue'

import type {
  ReferenceApplicationMode,
  ReferencePromptPreview,
} from '../../services/ImageStyleExtractor'

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

const createPromptPreview = (prompt: string) => {
  const normalizedPrompt = prompt.replace(/\s+/g, ' ').trim()
  if (normalizedPrompt.length <= previewMaxLength) {
    return normalizedPrompt
  }

  return `${normalizedPrompt.slice(0, previewMaxLength - 3).trimEnd()}...`
}

export function useReferencePromptDialog(options: ReferencePromptDialogOptions) {
  const showDialog = ref(false)
  const mode = ref<ReferenceApplicationMode>('replicate')
  const detectedOriginalPrompt = ref('')
  const sourceImageName = ref('')
  const sourceImagePreviewUrl = ref('')
  const generatedPreview = ref<ReferencePromptPreview | null>(null)
  const workingPrompt = ref('')
  const workingVariables = ref<Record<string, string>>({})
  const detectedOriginalPromptPreview = ref('')

  const showModeSwitch = computed(() => detectedOriginalPrompt.value.trim().length > 0)
  const hasGeneratedPreview = computed(() => !!generatedPreview.value)
  const canApply = computed(() => workingPrompt.value.trim().length > 0)

  const resetGeneratedPreview = () => {
    generatedPreview.value = null
    workingPrompt.value = ''
    workingVariables.value = {}
  }

  const openDialog = () => {
    detectedOriginalPrompt.value = options.getCurrentPrompt().trim()
    detectedOriginalPromptPreview.value = createPromptPreview(
      detectedOriginalPrompt.value,
    )
    mode.value = detectedOriginalPrompt.value ? 'migrate' : 'replicate'
    sourceImageName.value = ''
    sourceImagePreviewUrl.value = ''
    resetGeneratedPreview()
    showDialog.value = true
  }

  const closeDialog = () => {
    showDialog.value = false
  }

  const updateMode = (nextMode: ReferenceApplicationMode) => {
    mode.value = nextMode
  }

  const setImageSource = (payload: { name?: string; previewUrl?: string }) => {
    sourceImageName.value = payload.name?.trim() || ''
    sourceImagePreviewUrl.value = payload.previewUrl?.trim() || ''
  }

  const setGeneratedPreview = (preview: ReferencePromptPreview) => {
    generatedPreview.value = {
      prompt: preview.prompt,
      variableDefaults: cloneVariables(preview.variableDefaults),
      rawText: preview.rawText,
    }
    workingPrompt.value = preview.prompt
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
    sourceImageName,
    sourceImagePreviewUrl,
    generatedPreview,
    workingPrompt,
    workingVariables,
    showModeSwitch,
    hasGeneratedPreview,
    canApply,
    openDialog,
    closeDialog,
    updateMode,
    setImageSource,
    resetGeneratedPreview,
    setGeneratedPreview,
    updatePrompt,
    updateVariableValue,
    replaceWorkingVariables,
    applyToCurrentPrompt,
  }
}
