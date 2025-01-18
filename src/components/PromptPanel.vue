<template>
  <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-800">优化后Prompt</h2>
      <div class="flex items-center space-x-2">
        <button
          @click="copyPrompt"
          class="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
        >
          <span>复制</span>
        </button>
      </div>
    </div>
    
    <div class="space-y-4">
      <div 
        class="bg-gray-50 rounded-xl border border-gray-200 overflow-auto resize-y"
        style="min-height: 200px; max-height: 600px;"
      >
        <textarea
          :value="optimizedPrompt"
          class="w-full h-full p-4 bg-transparent border-none focus:ring-0 resize-none"
          readonly
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  optimizedPrompt: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:optimizedPrompt'])

const copyPrompt = async () => {
  try {
    await navigator.clipboard.writeText(props.optimizedPrompt)
    // TODO: 显示复制成功提示
  } catch (e) {
    console.error('复制失败:', e)
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

/* 添加拖动手柄样式 */
.resize-y {
  resize: vertical;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 8h10M0 5h10M0 2h10' stroke='%23A1A1AA' stroke-width='1'/%3E%3C/svg%3E");
  background-position: right bottom;
  background-repeat: no-repeat;
  background-size: 10px;
  padding-bottom: 10px;
}
</style> 