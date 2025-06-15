<!-- 提示词类型选择器组件 - 简化版 -->
<template>
  <div class="prompt-type-selector">
    <div class="inline-flex bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 text-[10px]">
      <button
        @click="updatePromptType('system')"
        :class="[
          'px-1.5 py-0.5 transition-colors duration-150 rounded-l',
          'focus:outline-none focus:ring-1 focus:ring-blue-400',
          modelValue === 'system'
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-75 dark:hover:bg-gray-750'
        ]"
        :aria-pressed="modelValue === 'system'"
        :title="t('promptOptimizer.systemPromptHelp')"
      >
        {{ t('promptOptimizer.systemPrompt') }}
      </button>
      <div class="w-px bg-gray-200 dark:bg-gray-600"></div>
      <button
        @click="updatePromptType('user')"
        :class="[
          'px-1.5 py-0.5 transition-colors duration-150 rounded-r',
          'focus:outline-none focus:ring-1 focus:ring-blue-400',
          modelValue === 'user'
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-75 dark:hover:bg-gray-750'
        ]"
        :aria-pressed="modelValue === 'user'"
        :title="t('promptOptimizer.userPromptHelp')"
      >
        {{ t('promptOptimizer.userPrompt') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PromptType } from '@prompt-optimizer/core'

const { t } = useI18n()

interface Props {
  modelValue?: PromptType
}

interface Emits {
  (e: 'update:modelValue', value: PromptType): void
  (e: 'change', value: PromptType): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 'system'
})
const emit = defineEmits<Emits>()

/**
 * 更新提示词类型
 */
const updatePromptType = (type: PromptType) => {
  if (type !== props.modelValue) {
    emit('update:modelValue', type)
    emit('change', type)
  }
}
</script>

<style scoped>
.prompt-type-selector {
  display: inline-flex;
}

/* 微妙的按钮反馈 */
.prompt-type-selector button:active {
  transform: scale(0.95);
}

/* 响应式设计 */
@media (max-width: 640px) {
  .prompt-type-selector {
    width: 100%;
  }

  .prompt-type-selector .inline-flex {
    display: flex;
    width: 100%;
  }

  .prompt-type-selector button {
    flex: 1;
  }
}
</style>
