<template>
  <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-800">测试内容</h2>
    </div>
    
    <div class="space-y-4">
      <textarea
        v-model="content"
        rows="6"
        class="w-full p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="请输入需要测试的内容..."
        :disabled="isLoading"
        @input="$emit('update:modelValue', content)"
      ></textarea>
      
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span class="text-gray-700">模型:</span>
          <select 
            v-model="selectedModel"
            class="rounded-lg border border-gray-300 px-4 py-1.5 appearance-none bg-white bg-no-repeat bg-[right_8px_center] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==')]"
            :disabled="isLoading"
            :style="{ minWidth: getSelectWidth(enabledModels) + 'px' }"
            @change="$emit('update:model', selectedModel)"
          >
            <option v-for="model in enabledModels" 
                    :key="model.key" 
                    :value="model.key">
              {{ model.name }}
            </option>
          </select>
        </div>
        
        <button
          @click="$emit('test')"
          class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isLoading || !content.trim()"
        >
          <span v-if="isLoading" class="animate-spin">⏳</span>
          <span>{{ isLoading ? '测试中...' : '开始测试 →' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  model: {
    type: String,
    default: ''
  },
  enabledModels: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'update:model', 'test'])

const content = ref(props.modelValue)
const selectedModel = ref(props.model)

// 监听 props 变化
watch(() => props.modelValue, (newVal) => {
  content.value = newVal
})

watch(() => props.model, (newVal) => {
  selectedModel.value = newVal
})

// 计算下拉框宽度
const getSelectWidth = (models) => {
  if (!models.length) return 160
  const maxLength = Math.max(...models.map(m => m.name.length))
  return Math.max(160, maxLength * 12)  // 12px per character as estimation
}
</script> 