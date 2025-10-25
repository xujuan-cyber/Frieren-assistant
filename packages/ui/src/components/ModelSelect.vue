<template>
  <NSelect
    :value="selectValue"
    @update:value="handleModelSelect"
    :options="selectOptions"
    :placeholder="selectPlaceholder"
    :disabled="disabled"
    :loading="isLoading"
    size="medium"
    @focus="handleFocus"
    filterable
  >
    <template #empty>
      <NSpace vertical align="center" class="py-4">
        <NText class="text-center text-gray-500">{{ t('model.select.noAvailableModels') }}</NText>
        <NButton 
          type="tertiary" 
          size="small" 
          @click="$emit('config')" 
          class="w-full mt-2" 
          ghost 
        > 
          <template #icon> 
            <NText>⚙️</NText> 
          </template> 
          {{ t('model.select.configure') }} 
        </NButton>
      </NSpace>
    </template>
  </NSelect>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, inject, type Ref } from 'vue'

import { useI18n } from 'vue-i18n'
import { NSelect, NButton, NText, NSpace } from 'naive-ui'
import type { AppServices } from '../types/services'
import type { TextModelConfig } from '@prompt-optimizer/core'

const { t } = useI18n()

interface Props {
  modelValue: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'config': []
}>()

const isLoading = ref(false)

// 统一使用inject获取services
const services = inject<Ref<AppServices | null>>('services')
if (!services) {
  throw new Error('[ModelSelect] services未正确注入，请确保在App组件中正确provide了services')
}

const getModelManager = computed(() => {
  const servicesValue = services.value
  if (!servicesValue) {
    throw new Error('[ModelSelect] services未初始化，请确保应用已正确启动')
  }

  const manager = servicesValue.modelManager
  if (!manager) {
    throw new Error('[ModelSelect] modelManager未初始化，请确保服务已正确配置')
  }

  return manager
})

// 响应式数据存储
const allModels = ref<TextModelConfig[]>([])
const enabledModels = ref<TextModelConfig[]>([])

const DEFAULT_MODEL_IDS = ['openai', 'gemini', 'deepseek', 'zhipu', 'siliconflow', 'custom']

// 加载模型数据
const loadModels = async () => {
  try {
    isLoading.value = true
    const manager = getModelManager.value
    if (!manager) {
      throw new Error('ModelManager not available')
    }
    
    // 确保在获取模型前初始化管理器
    await manager.ensureInitialized()
    allModels.value = await manager.getAllModels()
    enabledModels.value = await manager.getEnabledModels()

    // 如果当前选中的模型不在启用列表中，尝试设置一个默认模型
    if (props.modelValue && !enabledModels.value.find(m => m.id === props.modelValue)) {
      const defaultModel = enabledModels.value.find(m => DEFAULT_MODEL_IDS.includes(m.id)) || enabledModels.value[0]
      if (defaultModel) {
        emit('update:modelValue', defaultModel.id)
      }
    }
  } catch (error) {
    console.error('Failed to load models:', error)
    allModels.value = []
    enabledModels.value = []
  } finally {
    isLoading.value = false
  }
}

// 选择框选项
const selectOptions = computed(() => {
  const modelOptions = enabledModels.value.map(model => ({
    label: model.name,
    value: model.id,
    model: model,
    isDefault: DEFAULT_MODEL_IDS.includes(model.id),
    type: 'model'
  }))
  
  // 如果没有模型，返回空数组让placeholder显示
  if (modelOptions.length === 0) {
    return []
  }
  
  // 添加配置按钮选项
  const configOption = {
    label: '⚙️'+t('model.select.configure'),
    value: '__config__',
    type: 'config'
  }
  
  return [...modelOptions, configOption]
})

// 选择框占位符
const selectValue = computed(() => {
  // 若没有可用模型或当前值无效，返回 null 以显示占位符
  if (!enabledModels.value.length) return null as unknown as string
  const exists = enabledModels.value.some(m => m.id === props.modelValue)
  return exists ? props.modelValue : null as unknown as string
})

// 选择框占位符
const selectPlaceholder = computed(() => {
  if (isLoading.value) return t('common.loading')
  // 无可用模型时也显示占位符文本，而不是 noAvailableModels（该文案用于下拉空态）
  return t('model.select.placeholder')
})

// 处理模型选择
const handleModelSelect = (value: string) => {
  // 如果选择的是配置选项，不更新值，直接触发配置事件
  if (value === '__config__') {
    emit('config')
    return
  }
  emit('update:modelValue', value)
}

// 处理焦点事件
const handleFocus = async () => {
  await loadModels()
}

// 添加刷新方法
const refresh = async () => {
  await loadModels()
}

// 暴露方法给父组件
defineExpose({
  refresh
})

// 监听模型数据变化，确保选中的模型仍然可用
watch(
  () => props.modelValue,
  async (newValue) => {
    if (newValue && !enabledModels.value.find(m => m.id === newValue)) {
      await loadModels()
      if (!enabledModels.value.find(m => m.id === newValue)) {
        emit('update:modelValue', enabledModels.value[0]?.id || '')
      }
    }
  }
)

// 初始化时加载模型
onMounted(async () => {
  await loadModels()
})
</script>
