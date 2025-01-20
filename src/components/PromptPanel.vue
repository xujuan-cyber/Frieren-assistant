<template>
  <div class="flex flex-col h-full">
    <!-- 标题和按钮区域 -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3 flex-none">
      <h3 class="text-lg font-semibold text-white/90">优化后Prompt</h3>
      <button
        v-if="optimizedPrompt"
        @click="copyPrompt"
        class="text-purple-400 hover:text-purple-300 text-sm flex items-center space-x-2 transition-colors transform hover:scale-105"
      >
        <span>复制</span>
      </button>
    </div>
    
    <!-- 内容区域 -->
    <div class="flex-1 min-h-0 bg-black/20 rounded-xl border border-purple-600/50 transition-colors overflow-hidden">
      <div class="h-full relative">
        <textarea
          :value="optimizedPrompt"
          class="absolute inset-0 w-full h-full p-4 bg-transparent border-none focus:ring-2 focus:ring-purple-500/50 resize-none text-white/90 placeholder-gray-400 text-sm sm:text-base overflow-auto"
          placeholder="优化后的提示词将显示在这里..."
          readonly
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'
import { useToast } from '../composables/useToast'

const toast = useToast()
const props = defineProps({
  optimizedPrompt: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:optimizedPrompt'])

const copyPrompt = async () => {
  if (!props.optimizedPrompt) return
  
  try {
    await navigator.clipboard.writeText(props.optimizedPrompt)
    toast.success('复制成功')
  } catch (e) {
    console.error('复制失败:', e)
    toast.error('复制失败')
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