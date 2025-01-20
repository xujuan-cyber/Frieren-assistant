<template>
  <div class="flex flex-col h-full">
    <!-- 标题和按钮区域 -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3 flex-none">
      <h3 class="text-lg font-semibold text-white/90">优化后Prompt</h3>
      <div class="flex items-center space-x-4">
        <button
          v-if="optimizedPrompt"
          @click="handleIterate"
          class="text-purple-400 hover:text-purple-300 text-sm flex items-center space-x-2 transition-colors transform hover:scale-105"
          :disabled="isIterating"
        >
          <span>{{ isIterating ? '优化中...' : '继续优化' }}</span>
        </button>
        <button
          v-if="optimizedPrompt"
          @click="copyPrompt"
          class="text-purple-400 hover:text-purple-300 text-sm flex items-center space-x-2 transition-colors transform hover:scale-105"
        >
          <span>复制</span>
        </button>
      </div>
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

    <!-- 迭代优化输入框 -->
    <div v-if="showIterateInput" class="mt-4">
      <div class="bg-black/20 rounded-xl border border-purple-600/50 p-4">
        <h4 class="text-sm font-medium text-white/90 mb-2">请输入需要优化的方向：</h4>
        <div class="flex flex-col space-y-3">
          <textarea
            v-model="iterateInput"
            class="w-full bg-black/30 border-none rounded-lg p-3 text-white/90 placeholder-gray-400 text-sm resize-none focus:ring-2 focus:ring-purple-500/50"
            placeholder="例如：使提示词更简洁、增加特定功能描述等..."
            rows="3"
          ></textarea>
          <div class="flex justify-end space-x-3">
            <button
              @click="cancelIterate"
              class="px-4 py-2 text-sm text-white/70 hover:text-white/90 transition-colors"
            >
              取消
            </button>
            <button
              @click="submitIterate"
              class="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!iterateInput.trim() || isIterating"
            >
              {{ isIterating ? '优化中...' : '确认优化' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'
import { useToast } from '../composables/useToast'

const toast = useToast()
const props = defineProps({
  optimizedPrompt: {
    type: String,
    default: ''
  },
  isIterating: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:optimizedPrompt', 'iterate'])

const showIterateInput = ref(false)
const iterateInput = ref('')

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

const handleIterate = () => {
  showIterateInput.value = true
}

const cancelIterate = () => {
  showIterateInput.value = false
  iterateInput.value = ''
}

const submitIterate = () => {
  if (!iterateInput.value.trim()) return
  
  emit('iterate', {
    originalPrompt: props.optimizedPrompt,
    iterateInput: iterateInput.value.trim()
  })
  
  // 重置输入
  iterateInput.value = ''
  showIterateInput.value = false
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