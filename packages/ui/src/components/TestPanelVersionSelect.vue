<template>
  <NTooltip
    trigger="hover"
    :disabled="!selectedOption || selectedOption.fullLabel === selectedOption.label"
  >
    <template #trigger>
      <NSelect
        :value="value"
        :options="options"
        :render-label="renderOptionLabel"
        :disabled="disabled"
        size="small"
        :data-testid="testId"
        class="test-panel-version-select"
        @update:value="handleUpdate"
      />
    </template>
    <span>{{ selectedOption?.fullLabel }}</span>
  </NTooltip>
</template>

<script setup lang="ts">
import { computed, h, type VNodeChild } from 'vue'
import { NSelect, NTooltip, type SelectOption } from 'naive-ui'
import type { TestPanelVersionOption } from '../utils/testPanelVersion'

const props = defineProps<{
  value: string | number
  options: TestPanelVersionOption[]
  disabled?: boolean
  testId?: string
}>()

const emit = defineEmits<{
  'update:value': [value: string | number]
}>()

const selectedOption = computed(() =>
  props.options.find((option) => option.value === props.value) || null
)

const renderOptionLabel = (
  option: SelectOption & { fullLabel?: string }
): VNodeChild => {
  const fullLabel = typeof option.fullLabel === 'string'
    ? option.fullLabel
    : String(option.label ?? '')
  return h('div', { class: 'test-panel-version-select__menu-label', title: fullLabel }, fullLabel)
}

const handleUpdate = (nextValue: string | number | null) => {
  if (nextValue == null) return
  emit('update:value', nextValue)
}
</script>

<style scoped>
.test-panel-version-select {
  width: 108px;
}

.test-panel-version-select__menu-label {
  white-space: nowrap;
}
</style>
