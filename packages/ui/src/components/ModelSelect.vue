<template>
  <div class="relative">
    <button
      @click.stop="toggleDropdown"
      class="theme-template-select-button"
      :disabled="disabled"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span v-if="modelValue && getSelectedModel && getSelectedModel.enabled" class="theme-text text-sm">
            {{ getSelectedModel.name }}
          </span>
          <span v-else class="theme-placeholder">
            {{ !enabledModels.length ? t('model.select.noModels') : t('model.select.placeholder') }}
          </span>
        </div>
        <span class="theme-text text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </span>
      </div>
    </button>

    <div v-if="isOpen" 
         class="theme-dropdown"
         :style="dropdownStyle"
         @click.stop
         v-click-outside="() => isOpen = false"
    >
      <div class="p-2 max-h-64 overflow-y-auto">
        <div v-if="!enabledModels.length" class="theme-dropdown-empty">
          {{ t('model.select.noAvailableModels') }}
        </div>
        <div v-else v-for="model in enabledModels" 
             :key="model.key"
             @click="selectModel(model)"
             class="theme-dropdown-item"
             :class="[
               modelValue === model.key
                 ? 'theme-dropdown-item-active'
                 : 'theme-dropdown-item-inactive'
             ]"
        >
          <div class="flex items-center justify-between">
            <span class="theme-text text-sm">{{ model.name }}</span>
          </div>
        </div>
      </div>
      <div class="theme-dropdown-section">
        <button
          @click="$emit('config')"
          class="theme-dropdown-config-button"
        >
          <span>⚙️</span>
          <span>{{ t('model.select.configure') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { modelManager } from '@prompt-optimizer/core'
import { clickOutside } from '../directives/clickOutside'

const { t } = useI18n()

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'config'])

const isOpen = ref(false)
const refreshTrigger = ref(0)
const vClickOutside = clickOutside

// 获取选中的模型
const getSelectedModel = computed(() => {
  refreshTrigger.value
  return modelManager.getAllModels().find(m => m.key === props.modelValue)
})

// 启用的模型列表
const enabledModels = computed(() => {
  refreshTrigger.value
  return modelManager.getEnabledModels()
})

// 判断是否为默认模型
const isDefaultModel = (key) => {
  const model = modelManager.getAllModels().find(m => m.key === key)
  return model?.isDefault ?? false
}

// 切换下拉框
const toggleDropdown = () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    refreshTrigger.value++
  }
}

// 选择模型
const selectModel = (model) => {
  emit('update:modelValue', model.key)
  isOpen.value = false
  refreshTrigger.value++
}

// 添加刷新方法
const refresh = () => {
  refreshTrigger.value++
}

// 暴露方法给父组件
defineExpose({
  refresh
})

// 监听模型数据变化，确保选中的模型仍然可用
watch(
  () => modelManager.getAllModels(),
  () => {
    if (props.modelValue && !enabledModels.value.find(m => m.key === props.modelValue)) {
      emit('update:modelValue', enabledModels.value[0]?.key || '')
    }
  }, 
  { deep: true }
)

// 计算下拉框样式
const dropdownStyle = computed(() => ({
  minWidth: '100%'
}))
</script>

<style scoped>
.theme-template-select-button {
  position: relative;
}
</style> 