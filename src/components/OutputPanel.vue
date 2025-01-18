<template>
  <div class="h-full flex flex-col">
    <div class="flex-none p-4 border-b border-purple-100 dark:border-purple-800">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">测试结果</h2>
        <div class="flex items-center space-x-2">
          <button
            v-if="result"
            @click="copyResult"
            class="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm flex items-center space-x-1 transition-colors"
          >
            <span>复制结果</span>
          </button>
        </div>
      </div>
    </div>
    
    <div class="p-4 space-y-4 flex-1 min-h-0 flex flex-col">
      <h3 class="text-white/90 font-medium flex-none">测试结果</h3>
      
      <div class="flex-1 min-h-0 relative">
        <div v-if="error" class="absolute inset-0 flex items-center justify-center">
          <div class="text-red-400 text-center">
            <span class="block text-3xl mb-2">❌</span>
            <p>{{ error }}</p>
          </div>
        </div>

        <div v-else-if="!result" class="absolute inset-0 flex items-center justify-center">
          <p class="text-white/50">等待测试结果...</p>
        </div>

        <div v-else class="absolute inset-0">
          <textarea
            :value="result"
            class="w-full h-full p-4 bg-black/20 border border-purple-600/50 rounded-xl text-white/90 resize-none"
            readonly
          ></textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, ref } from 'vue'
import { useToast } from '../composables/useToast'

const toast = useToast()
const props = defineProps({
  result: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  }
})

const copyResult = async () => {
  try {
    await navigator.clipboard.writeText(props.result)
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