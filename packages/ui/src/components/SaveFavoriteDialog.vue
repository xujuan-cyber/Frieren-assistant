<template>
  <NModal
    :show="show"
    preset="card"
    :title="dialogTitle"
    :style="{ width: 'min(92vw, 1040px)' }"
    :mask-closable="false"
    content-style="padding: 0;"
    @update:show="handleClose"
  >
    <div class="save-favorite-dialog">
      <FavoriteEditorForm
        :mode="mode"
        :content="content"
        :original-content="originalContent"
        :current-function-mode="currentFunctionMode"
        :current-optimization-mode="currentOptimizationMode"
        :prefill="prefill"
        :favorite="favorite"
        @cancel="handleClose"
        @saved="handleSaved"
      />
    </div>
  </NModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { NModal } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import type { FavoritePrompt } from '@prompt-optimizer/core'

import FavoriteEditorForm from './FavoriteEditorForm.vue'
import type { FavoriteReproducibilityDraft } from '../utils/favorite-reproducibility'

const { t } = useI18n()

interface Props {
  show: boolean
  mode?: 'create' | 'save' | 'edit'
  content?: string
  originalContent?: string
  currentFunctionMode?: 'basic' | 'context' | 'pro' | 'image'
  currentOptimizationMode?: 'system' | 'user'
  prefill?: {
    title?: string
    description?: string
    category?: string
    tags?: string[]
    functionMode?: 'basic' | 'context' | 'image'
    optimizationMode?: 'system' | 'user'
    imageSubMode?: 'text2image' | 'image2image' | 'multiimage'
    metadata?: Record<string, unknown>
    reproducibilityDraft?: FavoriteReproducibilityDraft
  }
  favorite?: FavoritePrompt
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'save',
  content: '',
  originalContent: undefined,
  currentFunctionMode: 'basic',
  currentOptimizationMode: 'system',
  prefill: undefined,
  favorite: undefined,
})

const emit = defineEmits<{
  'update:show': [value: boolean]
  'saved': [favoriteId?: string]
}>()

const dialogTitle = computed(() => {
  if (props.mode === 'create') return t('favorites.dialog.createTitle')
  if (props.mode === 'edit') return t('favorites.dialog.editTitle')
  return t('favorites.dialog.saveTitle')
})

const handleClose = () => {
  emit('update:show', false)
}

const handleSaved = (favoriteId: string) => {
  emit('saved', favoriteId)
  emit('update:show', false)
}
</script>

<style scoped>
.save-favorite-dialog {
  display: flex;
  height: min(76vh, 860px);
  min-height: 520px;
  flex-direction: column;
}

@media (max-width: 767px) {
  .save-favorite-dialog {
    height: min(84vh, 920px);
    min-height: 480px;
  }
}
</style>
