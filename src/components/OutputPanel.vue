<template>
  <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-800">测试结果</h2>
      <div class="flex items-center space-x-2">
        <button
          @click="copyResult"
          class="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
        >
          <span>复制</span>
        </button>
      </div>
    </div>
    
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
      {{ error }}
    </div>
    
    <div class="space-y-4">
      <div class="bg-gray-50 rounded-xl p-4 border border-gray-200 min-h-[200px]">
        <p class="whitespace-pre-wrap">{{ result }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'

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
    // TODO: 显示复制成功提示
  } catch (e) {
    console.error('复制失败:', e)
  }
}
</script> 