<!-- 输出面板组件 -->
<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-white/90">测试结果</h3>
      <button
        v-if="result"
        @click="copyResult"
        class="px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-all transform hover:scale-105 flex items-center space-x-2"
      >
        <span>复制</span>
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
        @input="$emit('update:result', $event.target.value)"
        class="absolute inset-0 w-full h-full p-4 rounded-xl bg-black/20 border border-purple-600/50 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent text-white placeholder-gray-500 resize-none"
        placeholder="测试结果将显示在这里..."
      ></textarea>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useToast } from '../composables/useToast'

const toast = useToast()

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

// 定义事件
const emit = defineEmits(['update:result'])

// 复制结果
const copyResult = async () => {
  if (props.result) {
    try {
      await navigator.clipboard.writeText(props.result)
      toast.success('复制成功')
    } catch (err) {
      toast.error('复制失败')
    }
  }
}
</script>

<style scoped>
textarea {
  /* 隐藏滚动条但保持可滚动 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

textarea::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}
</style> 