<template>
  <button
    class="theme-icon-button"
    @click="$emit('click')"
    :disabled="loading"
  >
    <span class="text-base sm:text-lg">{{ loading ? '⏳' : icon }}</span>
    <span class="text-sm max-sm:hidden">{{ loading ? loadingText || '加载中...' : text }}</span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  text: string
  loading?: boolean
  loadingText?: string
}>()

defineEmits<{
  (e: 'click'): void
}>()
</script>