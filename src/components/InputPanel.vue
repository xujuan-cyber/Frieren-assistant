<!-- 输入面板组件 -->
<template>
  <div class="flex flex-col h-full">
    <div class="h-[180px] flex flex-col space-y-2 flex-none">
      <label class="text-white/90 font-medium flex-none">{{ label }}</label>
      <div class="relative flex-1 min-h-0">
        <textarea
          :value="modelValue"
          class="absolute inset-0 w-full h-full p-4 rounded-xl bg-black/20 border border-purple-600/50 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent text-white placeholder-gray-500 resize-none"
          :placeholder="placeholder"
          :disabled="disabled"
          @input="$emit('update:modelValue', $event.target.value)"
        ></textarea>
      </div>
    </div>
    
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 flex-none">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-3">
        <span class="text-white/90 whitespace-nowrap">{{ modelLabel }}:</span>
        <div class="relative flex-1 sm:min-w-[180px]">
          <select 
            :value="model"
            class="custom-select w-full rounded-lg bg-black/20 border border-purple-600/50 px-4 py-2 text-white cursor-pointer focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
            :disabled="disabled"
            @change="$emit('update:model', $event.target.value)"
          >
            <option v-for="model in models" 
                    :key="model.key" 
                    :value="model.key"
                    class="bg-gray-900 text-white"
            >
              {{ model.name }}
            </option>
          </select>
          <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg class="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      
      <button
        @click="$emit('submit')"
        class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-none hover:shadow-lg hover:shadow-purple-500/20 transform hover:scale-105"
        :disabled="disabled || !modelValue.trim()"
      >
        <span v-if="loading" class="animate-spin">⏳</span>
        <span>{{ loading ? loadingText : buttonText }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// 定义props
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  model: {
    type: String,
    default: ''
  },
  models: {
    type: Array,
    default: () => []
  },
  label: {
    type: String,
    required: true
  },
  modelLabel: {
    type: String,
    default: '模型'
  },
  placeholder: {
    type: String,
    default: ''
  },
  buttonText: {
    type: String,
    default: '提交'
  },
  loadingText: {
    type: String,
    default: '处理中...'
  },
  loading: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

// 定义事件
defineEmits(['update:modelValue', 'update:model', 'submit'])
</script> 