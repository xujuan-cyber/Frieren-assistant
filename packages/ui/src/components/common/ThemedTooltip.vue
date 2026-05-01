<template>
  <NTooltip
    :trigger="trigger"
    :placement="placement"
    :theme-overrides="tooltipThemeOverrides"
  >
    <template #trigger>
      <slot />
    </template>
    {{ label }}
  </NTooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NTooltip } from 'naive-ui'

withDefaults(defineProps<{
  label: string
  trigger?: 'hover' | 'click' | 'focus' | 'manual'
  placement?: 'top' | 'right' | 'bottom' | 'left' | 'top-start' | 'top-end' | 'right-start' | 'right-end' | 'bottom-start' | 'bottom-end' | 'left-start' | 'left-end'
}>(), {
  trigger: 'hover',
  placement: 'top',
})

const tooltipThemeOverrides = computed(() => ({
  color: 'var(--n-popover-color, var(--n-color))',
  textColor: 'var(--n-text-color-2)',
  borderRadius: '8px',
  boxShadow: '0 10px 28px rgba(15, 23, 42, 0.16)',
  padding: '6px 10px',
}))
</script>
