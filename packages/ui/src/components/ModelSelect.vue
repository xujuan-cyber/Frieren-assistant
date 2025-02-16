<template>
  <div class="relative">
    <button
      @click.stop="toggleDropdown"
      class="template-select-button w-full h-10 px-3 bg-black/20 border border-purple-600/50 rounded-lg text-white hover:border-purple-500/70 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
      :disabled="disabled"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span v-if="modelValue && getSelectedModel && getSelectedModel.enabled" class="text-white">
            {{ getSelectedModel.name }}
          </span>
          <span v-else class="text-white/50">
            {{ !enabledModels.length ? '请配置模型' : '请选择模型' }}
          </span>
        </div>
        <span class="text-purple-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </span>
      </div>
    </button>

    <div v-if="isOpen" 
         class="absolute z-50 min-w-[300px] w-max max-w-[90vw] mt-1 bg-gray-800/95 backdrop-blur-sm rounded-lg border border-purple-600/30 shadow-xl"
         :style="dropdownStyle"
         @click.stop
         v-click-outside="() => isOpen = false"
    >
      <div class="p-2 max-h-64 overflow-y-auto">
        <div v-if="!enabledModels.length" class="px-3 py-2 text-gray-400 text-sm">
          暂无可用模型
        </div>
        <div v-else v-for="model in enabledModels" 
             :key="model.key"
             @click="selectModel(model)"
             class="px-3 py-2 rounded-lg cursor-pointer transition-colors group relative"
             :class="[
               modelValue === model.key
                 ? 'bg-purple-600/30 text-purple-200'
                 : 'hover:bg-gray-700/50 text-gray-300'
             ]"
        >
          <div class="flex items-center justify-between">
            <span>{{ model.name }}</span>
            <span v-if="!isDefaultModel(model.key)" 
                  class="text-xs px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-300">
              自定义
            </span>
          </div>
        </div>
      </div>
      <div class="p-2 border-t border-purple-600/20">
        <button
          @click="$emit('config')"
          class="w-full px-3 py-2 text-sm rounded-lg bg-purple-600/20 text-purple-300 
                 hover:bg-purple-600/30 transition-colors flex items-center justify-center space-x-1"
        >
          <span>⚙️</span>
          <span>配置模型</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { clickOutside } from '../directives/clickOutside'

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  models: {
    type: Array,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'config'])

const isOpen = ref(false)
const vClickOutside = clickOutside
const refreshTrigger = ref(0)

// 添加深度监听 models 变化
watch(() => props.models, () => {
  refreshTrigger.value++
  // 如果当前选中的模型不在可用列表中，重置选择
  if (props.modelValue && !enabledModels.value.find(m => m.key === props.modelValue)) {
    emit('update:modelValue', enabledModels.value[0]?.key || '')
  }
}, { deep: true })

// 监听下拉框打开状态
watch(isOpen, (newValue) => {
  if (newValue) {
    // 打开时强制刷新列表
    refreshTrigger.value++
  }
})

const dropdownStyle = computed(() => ({
  minWidth: '100%'
}))

// 获取选中的模型
const getSelectedModel = computed(() => {
  refreshTrigger.value // 依赖刷新触发器
  return props.models.find(m => m.key === props.modelValue)
})

// 判断是否为默认模型
const isDefaultModel = (key) => {
  return ['openai', 'gemini', 'deepseek'].includes(key)
}

// 添加启用模型的计算属性
const enabledModels = computed(() => {
  refreshTrigger.value // 依赖刷新触发器
  return props.models.filter(model => model.enabled)
})

// 切换下拉框
const toggleDropdown = () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    refreshTrigger.value++ // 打开时刷新
  }
}

// 选择模型
const selectModel = (model) => {
  emit('update:modelValue', model.key)
  isOpen.value = false
  refreshTrigger.value++ // 选择后刷新
}
</script>

<style scoped>
.template-select-button {
  position: relative;
}
</style> 