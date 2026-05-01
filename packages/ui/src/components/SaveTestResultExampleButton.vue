<template>
  <NTooltip trigger="hover">
    <template #trigger>
      <NButton
        size="small"
        quaternary
        circle
        :disabled="disabled"
        :data-testid="testId"
        @click="handleSaveExample"
      >
        <template #icon>
          <NIcon>
            <Star />
          </NIcon>
        </template>
      </NButton>
    </template>
    {{ t('favorites.dialog.reproducibility.saveTestResultExample') }}
  </NTooltip>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { NButton, NIcon, NTooltip } from 'naive-ui'
import { Star } from '@vicons/tabler'
import { useI18n } from 'vue-i18n'
import {
  promptExampleFromTestRun,
  type PromptSession,
  type PromptTestRun,
} from '@prompt-optimizer/core'

import { useToast } from '../composables/ui/useToast'
import { useSessionManager, type SubModeKey } from '../stores/session/useSessionManager'
import type { SaveFavoritePayload } from '../types/workspace'
import {
  favoriteReproducibilityExampleFromPromptExample,
  type FavoriteReproducibilityVariable,
} from '../utils/favorite-reproducibility'
import { isValidVariableName } from '../types/variable'

const props = withDefaults(defineProps<{
  subModeKey: SubModeKey
  variantId: string
  content: string
  originalContent?: string
  functionMode: 'basic' | 'context' | 'image'
  optimizationMode?: 'system' | 'user'
  imageSubMode?: 'text2image' | 'image2image' | 'multiimage'
  disabled?: boolean
  testId?: string
}>(), {
  originalContent: undefined,
  optimizationMode: undefined,
  imageSubMode: undefined,
  disabled: false,
  testId: undefined,
})

const { t } = useI18n()
const toast = useToast()
const sessionManager = useSessionManager()
const appHandleSaveFavorite = inject<((data: SaveFavoritePayload) => void) | null>('handleSaveFavorite', null)

const disabled = computed(() => props.disabled || !props.content.trim())

const findTestRun = (session: PromptSession): PromptTestRun | null => {
  for (const runSet of session.testRuns) {
    const found = runSet.runs.find((run) =>
      run.metadata?.legacyVariantId === props.variantId ||
      run.id.endsWith(`:test:${props.variantId}`),
    )
    if (found) return found
  }
  return null
}

const buildVariableDraft = (parameters: Record<string, string> | undefined): FavoriteReproducibilityVariable[] => {
  if (!parameters) return []

  return Object.keys(parameters)
    .filter((name) => isValidVariableName(name))
    .map((name) => ({
      name,
      required: false,
      options: [],
      source: 'test-run',
    }))
}

const handleSaveExample = () => {
  if (disabled.value) return

  if (!appHandleSaveFavorite) {
    toast.error(t('toast.error.favoriteNotInitialized'))
    return
  }

  const session = sessionManager.getPromptSession(props.subModeKey)
  const run = findTestRun(session)
  if (!run) {
    toast.warning(t('favorites.dialog.reproducibility.noTestResultToSave'))
    return
  }

  const example = promptExampleFromTestRun(run, {
    basedOnVersionId: session.assetBinding?.versionId ?? `${session.id}:draft`,
  })
  const favoriteExample = example
    ? favoriteReproducibilityExampleFromPromptExample(example)
    : null

  if (!favoriteExample) {
    toast.warning(t('favorites.dialog.reproducibility.noTestResultToSave'))
    return
  }

  appHandleSaveFavorite({
    content: props.content,
    originalContent: props.originalContent,
    prefill: {
      functionMode: props.functionMode,
      optimizationMode: props.optimizationMode,
      imageSubMode: props.imageSubMode,
      reproducibilityDraft: {
        variables: buildVariableDraft(favoriteExample.parameters),
        examples: [favoriteExample],
      },
    },
  })
}
</script>
