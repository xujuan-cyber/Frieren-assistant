<template>
  <NButton
    @click="handleToggle"
    :type="buttonType"
    :size="buttonSize"
    :loading="loading"
    :disabled="props.disabled || loading"
    :title="t('settings.advancedModeTooltip')"
    class="advanced-mode-toggle"
    :ghost="!props.enabled"
    round
  >
    <template #icon>
      <svg 
        class="w-5 h-5" 
        fill="currentColor" 
        viewBox="0 0 24 24"
      >
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
      </svg>
    </template>
    <span class="text-sm max-md:hidden">{{ t('settings.advancedMode') }}</span>
    
    <!-- 状态指示器 -->
    <div v-if="props.enabled" class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border-2 border-white"></div>
  </NButton>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NButton } from 'naive-ui'

const { t } = useI18n()

interface Props {
  enabled: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  enabled: false,
  disabled: false
})

const emit = defineEmits<{
  'update:enabled': [enabled: boolean]
  'change': [enabled: boolean]
}>()

const loading = ref(false)

// 动态计算按钮类型和尺寸
const buttonType = computed(() => props.enabled ? 'primary' : 'default')
const buttonSize = computed(() => 'medium')

const handleToggle = async () => {
  if (props.disabled || loading.value) return

  try {
    loading.value = true
    
    const newValue = !props.enabled
    
    emit('update:enabled', newValue)
    emit('change', newValue)
    
    console.log(`[AdvancedModeToggle] Advanced mode ${newValue ? 'enabled' : 'disabled'}`)
  } catch (error) {
    console.error('[AdvancedModeToggle] Failed to toggle advanced mode:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Naive UI主题系统完全集成 - 仅保留必要的定位和动画效果 */
.advanced-mode-toggle {
  position: relative;
}

.advanced-mode-toggle:hover {
  transform: translateY(-1px);
}
</style>
