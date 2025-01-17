<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 z-40"
    @click="$emit('close')"
  >
    <div
      class="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl"
      @click.stop
    >
      <div class="h-full flex flex-col">
        <div class="p-4 border-b flex items-center justify-between">
          <h2 class="text-lg font-medium">历史记录</h2>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-500"
          >
            ×
          </button>
        </div>
        
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <div
            v-for="item in history"
            :key="item.id"
            class="bg-gray-50 rounded-lg p-4 space-y-2"
          >
            <div class="text-sm text-gray-500">
              {{ new Date(item.timestamp).toLocaleString() }}
            </div>
            <div class="space-y-1">
              <div class="text-sm font-medium">原始提示词：</div>
              <div class="text-sm text-gray-600">{{ item.original }}</div>
            </div>
            <div class="space-y-1">
              <div class="text-sm font-medium">优化结果：</div>
              <div class="text-sm text-gray-600 whitespace-pre-wrap">{{ item.optimized }}</div>
            </div>
            <div class="flex justify-end">
              <button
                @click="reuse(item)"
                class="text-blue-600 hover:text-blue-700 text-sm"
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