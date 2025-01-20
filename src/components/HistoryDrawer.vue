<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 z-45"
    @click="$emit('close')"
  >
    <div
      class="fixed right-0 top-[60px] sm:top-[68px] bottom-0 w-full max-w-md bg-gray-900/90 backdrop-blur-sm border-l border-purple-700/50 shadow-xl transition-transform duration-300 transform"
      @click.stop
    >
      <div class="h-full flex flex-col">
        <div class="sticky top-0 z-10 p-4 sm:p-6 border-b border-purple-700/50 flex items-center justify-between bg-gray-900/95 backdrop-blur-sm">
          <h2 class="text-lg font-semibold text-white/90">历史记录</h2>
          <button
            @click="$emit('close')"
            class="text-white/60 hover:text-white/90 transition-colors text-xl"
          >
            ×
          </button>
        </div>
        
        <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div
            v-for="item in history"
            :key="item.id"
            class="bg-black/20 rounded-xl border border-purple-600/50 p-4 space-y-3 hover:border-purple-500/70 transition-colors"
          >
            <div class="text-sm text-white/50">
              {{ new Date(item.timestamp).toLocaleString() }}
            </div>
            <div class="space-y-2">
              <div class="text-sm font-medium text-white/90">原始提示词：</div>
              <div class="text-sm text-white/70 bg-black/20 rounded-lg p-3 border border-purple-600/20">
                {{ item.original }}
              </div>
            </div>
            <div class="space-y-2">
              <div class="text-sm font-medium text-white/90">优化结果：</div>
              <div class="text-sm text-white/70 bg-black/20 rounded-lg p-3 border border-purple-600/20 whitespace-pre-wrap">
                {{ item.optimized }}
              </div>
            </div>
            <div class="flex justify-end">
              <button
                @click="reuse(item)"
                class="px-4 py-1.5 text-sm rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors"
              >
                重新使用
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: Boolean,
  history: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'reuse'])

const reuse = (item) => {
  emit('reuse', item)
  emit('close')
}
</script> 