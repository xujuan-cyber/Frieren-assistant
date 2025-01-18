<template>
  <div v-if="optimizedPrompt" class="h-full flex flex-col">
    <div class="flex justify-between items-center flex-none mb-2">
      <h3 class="text-white/90 font-medium">优化后Prompt</h3>
      <button
        @click="copyPrompt"
        class="text-purple-400 hover:text-purple-300 text-sm flex items-center space-x-1 transition-colors"
      >
        <span>复制</span>
      </button>
    </div>
    
    <div class="relative flex-1 min-h-0">
      <div 
        class="absolute inset-0 bg-black/20 rounded-xl border border-purple-600/50"
      >
        <textarea
          :value="optimizedPrompt"
          class="w-full h-full p-4 bg-transparent border-none focus:ring-0 resize-none text-white/90 placeholder-gray-400"
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