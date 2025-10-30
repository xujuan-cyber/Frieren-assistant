<!-- 优化模式选择器组件 - 使用 Naive UI RadioGroup -->
<template>
  <NRadioGroup
    :value="modelValue"
    @update:value="updateOptimizationMode"
    size="small"
    class="optimization-mode-selector"
  >
    <NRadioButton
      v-if="!hideSystemOption"
      value="system"
      :title="t('promptOptimizer.systemPromptHelp')"
    >
      {{ t('promptOptimizer.systemPrompt') }}
    </NRadioButton>
    <NRadioButton
      value="user"
      :title="t('promptOptimizer.userPromptHelp')"
    >
      {{ t('promptOptimizer.userPrompt') }}
    </NRadioButton>
  </NRadioGroup>
</template>

<script setup lang="ts">
import { NRadioGroup, NRadioButton } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import type { OptimizationMode } from '@prompt-optimizer/core'

const { t } = useI18n()

interface Props {
  modelValue: OptimizationMode
  /** 是否隐藏系统提示词选项（用于临时禁用功能） */
  hideSystemOption?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: OptimizationMode): void
  (e: 'change', value: OptimizationMode): void
}

const props = withDefaults(defineProps<Props>(), {
  hideSystemOption: false,
})
const emit = defineEmits<Emits>()

/**
 * 更新优化模式
 */
const updateOptimizationMode = (mode: OptimizationMode) => {
  emit('update:modelValue', mode)
  emit('change', mode)
}
</script>

<style scoped>
/* 响应式设计 - 移动端全宽显示 */
@media (max-width: 640px) {
  .optimization-mode-selector {
    width: 100%;
  }

  .optimization-mode-selector :deep(.n-radio-button) {
    flex: 1;
  }
}
</style>