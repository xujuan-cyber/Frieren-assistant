<!-- 输出面板组件 -->
<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-white/90">测试结果</h3>
      <button
        v-if="result"
        @click="copyResult"
        class="text-white/80 hover:text-white transition-colors flex items-center space-x-2 hover:scale-105 transform"
      >
        <span>📋</span>
        <span class="hidden sm:inline">复制</span>
      </button>
    </div>

    <div class="flex-1 min-h-0 relative">
      <div
        v-if="loading"
        class="absolute inset-0 flex items-center justify-center"
      >
        <div class="text-white/90 flex items-center space-x-2">
          <span class="animate-spin">⏳</span>
          <span>处理中...</span>
        </div>
      </div>

      <div
        v-else-if="error"
        class="absolute inset-0 flex items-center justify-center"
      >
        <div class="text-red-500 flex items-center space-x-2">
          <span>❌</span>
          <span>{{ error }}</span>
        </div>
      </div>

      <textarea
        v-else
        :value="result"
        class="absolute inset-0 w-full h-full p-4 rounded-xl bg-black/20 border border-purple-600/50 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent text-white placeholder-gray-500 resize-none"
        placeholder="测试结果将显示在这里..."
        readonly
      ></textarea>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 定义props
const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  result: {
    type: String,
    default: ''
  }
})

// 复制结果
const copyResult = async () => {
  if (props.result) {
    try {
      await navigator.clipboard.writeText(props.result)
      // TODO: 显示复制成功提示
    } catch (err) {
      // TODO: 显示复制失败提示
    }
  }
}
</script> 