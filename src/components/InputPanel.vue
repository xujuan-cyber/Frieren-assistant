<template>
  <div class="p-4 space-y-4 flex-1 min-h-0 flex flex-col">
    <div class="flex items-center justify-between flex-none">
      <h3 class="text-white/90 font-medium">测试内容</h3>
      <div class="flex items-center space-x-2">
        <span class="text-white/90 whitespace-nowrap">模型:</span>
        <div class="relative min-w-[160px]">
          <select 
            v-model="selectedModel"
            class="w-full rounded-lg bg-black/20 border border-purple-600/50 px-4 py-1.5 text-white appearance-none cursor-pointer"
            :disabled="isLoading"
            @change="$emit('update:model', selectedModel)"
          >
            <option 
              v-for="model in enabledModels" 
              :key="model.key" 
              :value="model.key"
              class="bg-gray-900 text-white"
            >
              {{ model.name }}
            </option>
          </select>
          <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg class="w-4 h-4 text-white/60" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1 min-h-0 relative">
      <textarea
        v-model="content"
        class="w-full h-full p-4 rounded-xl bg-black/20 border border-purple-600/50 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent text-white placeholder-gray-500 resize-none"
        placeholder="请输入要测试的内容..."
        :disabled="isLoading"
        @input="$emit('update:modelValue', content)"
      ></textarea>
    </div>

    <div class="flex-none">
      <button
        @click="$emit('test')"
        class="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isLoading || !content.trim()"
      >
        <span v-if="isLoading" class="animate-spin">⏳</span>
        <span>{{ isLoading ? '测试中...' : '开始测试 →' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, watch, onMounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  modelContent: {
    type: String,
    required: true
  },
  enabledModels: {
    type: Array,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'update:model', 'test'])

const content = ref(props.modelValue)
const selectedModel = ref(props.modelContent)

// 在组件挂载时，如果没有选择模型则设置第一个为默认值
onMounted(() => {
  if (!selectedModel.value && props.enabledModels.length > 0) {
    selectedModel.value = props.enabledModels[0].key
    emit('update:model', selectedModel.value)
  }
})

// 监听 props 变化
watch(() => props.modelValue, (newVal) => {
  content.value = newVal
})

watch(() => props.modelContent, (newVal) => {
  selectedModel.value = newVal
})
</script>