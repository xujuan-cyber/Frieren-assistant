<template>
  <button
    @click="handleToggle"
    class="advanced-mode-button"
    :class="{ 'active': props.enabled }"
    :disabled="loading"
    :title="t('settings.advancedModeTooltip')"
  >
    <svg 
      class="icon" 
      :class="{ 'icon-active': props.enabled }"
      fill="currentColor" 
      viewBox="0 0 24 24"
    >
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
    </svg>
    <span class="text">{{ t('settings.advancedMode') }}</span>
    
    <!-- 状态指示器 -->
    <div v-if="props.enabled" class="status-dot"></div>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

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
.advanced-mode-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 0.375rem;
  background-color: transparent;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  user-select: none;
}

.advanced-mode-button:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.advanced-mode-button:active {
  transform: translateY(1px);
}

.advanced-mode-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.advanced-mode-button.active {
  background-color: var(--color-primary-bg, rgba(59, 130, 246, 0.1));
  color: var(--color-primary, #2563eb);
}

.icon {
  width: 1.25rem;
  height: 1.25rem;
  transition: all 0.2s ease;
}

.icon-active {
  color: var(--color-primary, #2563eb);
}

.text {
  font-weight: 500;
  white-space: nowrap;
}

.status-dot {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  width: 0.5rem;
  height: 0.5rem;
  background-color: var(--color-success, #10b981);
  border-radius: 50%;
  border: 2px solid var(--color-bg-primary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .text {
    display: none;
  }
  
  .advanced-mode-button {
    padding: 0.5rem;
  }
}
</style>
