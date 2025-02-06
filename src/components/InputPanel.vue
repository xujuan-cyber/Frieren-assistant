<!-- 输入面板组件 -->
<template>
  <div class="space-y-3">
    <!-- 标题 -->
    <div class="flex justify-between items-center">
      <label class="block text-sm font-medium text-white/90">{{ label }}</label>
    </div>

    <!-- 输入框 -->
    <div class="relative">
      <textarea
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        class="w-full px-4 py-3 bg-black/20 border border-purple-600/50 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all resize-none"
        :placeholder="placeholder"
        rows="4"
      ></textarea>
    </div>

    <!-- 模型选择和提交按钮 -->
    <div class="flex items-center justify-between">
      <div class="flex-1 max-w-[200px]">
        <label class="block text-sm font-medium text-white/90 mb-1">{{ modelLabel }}</label>
        <select
          :value="selectedModel"
          @input="$emit('update:selectedModel', $event.target.value)"
          class="w-full px-3 py-1.5 bg-black/20 border border-purple-600/50 rounded-lg text-white custom-select"
          :disabled="loading || disabled"
        >
          <option v-for="model in models" :key="model.key" :value="model.key">
            {{ model.name }}
          </option>
        </select>
      </div>
      <button
        @click="$emit('submit')"
        :disabled="loading || disabled || !modelValue.trim()"
        class="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white rounded-lg transition-colors flex items-center space-x-2"
      >
        <span>{{ loading ? loadingText : buttonText }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  selectedModel: {
    type: String,
    required: true
  },
  models: {
    type: Array,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  placeholder: {
    type: String,
    default: ''
  },
  modelLabel: {
    type: String,
    required: true
  },
  buttonText: {
    type: String,
    required: true
  },
  loadingText: {
    type: String,
    required: true
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

const emit = defineEmits(['update:modelValue', 'update:selectedModel', 'submit'])
</script> 