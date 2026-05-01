<template>
  <NModal
    :show="show"
    preset="dialog"
    :title="t('common.promptGarden.importTitle')"
    :positive-text="t('common.import')"
    :negative-text="t('common.cancel')"
    :positive-button-props="{ disabled: !normalizedImportCode }"
    :show-icon="false"
    :mask-closable="true"
    :close-on-esc="true"
    :on-positive-click="handleConfirm"
    @update:show="emit('update:show', $event)"
    @after-leave="reset"
  >
    <div class="prompt-garden-import-dialog">
      <p class="prompt-garden-import-hint">
        {{ t('common.promptGarden.importHint') }}
      </p>
      <NInput
        v-model:value="inputValue"
        :placeholder="t('common.promptGarden.importPlaceholder')"
        clearable
        autofocus
        data-testid="workspace-prompt-garden-import-code"
        @keyup.enter="handleConfirm"
      />
    </div>
  </NModal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NInput, NModal } from 'naive-ui'
import { useI18n } from 'vue-i18n'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  confirm: [importCode: string]
}>()

const { t } = useI18n()
const inputValue = ref('')

const normalizePromptGardenImportCode = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)
    const directImportCode = url.searchParams.get('importCode')?.trim()
    if (directImportCode) return directImportCode

    const hashQueryIndex = url.hash.indexOf('?')
    if (hashQueryIndex >= 0) {
      const hashQuery = new URLSearchParams(url.hash.slice(hashQueryIndex + 1))
      return hashQuery.get('importCode')?.trim() || trimmed
    }
  } catch {
    // Plain import codes are expected; non-URL values are used as-is.
  }

  return trimmed
}

const normalizedImportCode = computed(() =>
  normalizePromptGardenImportCode(inputValue.value)
)

const reset = () => {
  inputValue.value = ''
}

const handleConfirm = () => {
  const importCode = normalizedImportCode.value
  if (!importCode) return false

  emit('confirm', importCode)
  emit('update:show', false)
  return true
}
</script>

<style scoped>
.prompt-garden-import-dialog {
  display: grid;
  gap: 12px;
  max-width: 360px;
}

.prompt-garden-import-hint {
  margin: 0;
  color: var(--n-text-color-2);
  line-height: 1.5;
}
</style>
