<template>
  <div class="fixed inset-0 theme-mask z-[70] flex items-center justify-center p-4">
    <div class="relative theme-manager-container w-full max-w-lg max-h-[90vh] overflow-y-auto z-10" @click.stop>
      <!-- 弹窗头部 -->
      <div class="flex items-center justify-between p-6 border-b theme-manager-border flex-none">
        <h3 class="text-xl font-semibold theme-manager-text">
          {{ isEditing ? t('variables.editor.editTitle') : t('variables.editor.addTitle') }}
        </h3>
        <button class="theme-manager-text-secondary hover:theme-manager-text transition-colors text-xl" @click="cancel" :title="t('common.cancel')">
          ×
        </button>
      </div>

      <!-- 弹窗内容 -->
      <div class="flex-1 min-h-0 p-6 overflow-y-auto">
        <form @submit.prevent="save" class="space-y-6">
          <!-- 变量名 -->
          <div class="space-y-2">
            <label for="variableName" class="block text-sm font-medium theme-manager-text">
              {{ t('variables.editor.variableName') }}
              <span class="text-red-500 ml-1">*</span>
            </label>
            <input
              id="variableName"
              v-model="formData.name"
              type="text"
              class="theme-manager-input"
              :class="{ 'border-red-500': errors.name }"
              :placeholder="t('variables.editor.variableNamePlaceholder')"
              :disabled="isEditing || loading"
              @input="validateName"
            />
            <div v-if="errors.name" class="text-sm text-red-600">
              {{ errors.name }}
            </div>
            <div class="text-sm theme-manager-text-secondary">
              {{ t('variables.editor.variableNameHelp') }}
            </div>
          </div>

          <!-- 变量值 -->
          <div class="space-y-2">
            <label for="variableValue" class="block text-sm font-medium theme-manager-text">
              {{ t('variables.editor.variableValue') }}
              <span class="text-red-500 ml-1">*</span>
            </label>
            <textarea
              id="variableValue"
              v-model="formData.value"
              class="theme-manager-input resize-y"
              :class="{ 'border-red-500': errors.value }"
              :placeholder="t('variables.editor.variableValuePlaceholder')"
              :disabled="loading"
              rows="4"
              @input="validateValue"
            ></textarea>
            <div v-if="errors.value" class="text-sm text-red-600">
              {{ errors.value }}
            </div>
            <div class="text-sm theme-manager-text-secondary">
              {{ t('variables.editor.variableValueHelp') }}
            </div>
          </div>

          <!-- 预览 -->
          <div v-if="formData.name && formData.value" class="theme-manager-card p-4">
            <h4 class="text-sm font-medium theme-manager-text mb-3">{{ t('variables.editor.preview') }}</h4>
            <div class="space-y-2">
              <div class="flex items-start gap-3">
                <span class="text-xs theme-manager-text-secondary min-w-[80px]">{{ t('variables.editor.usage') }}:</span>
                <code class="px-2 py-1 rounded text-xs font-mono bg-gray-100 text-purple-600">{{ formatVariableName(formData.name) }}</code>
              </div>
              <div class="flex items-start gap-3">
                <span class="text-xs theme-manager-text-secondary min-w-[80px]">{{ t('variables.editor.resolvedValue') }}:</span>
                <div class="flex-1 text-xs theme-manager-text max-h-20 overflow-y-auto p-2 bg-white border rounded">{{ formData.value }}</div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- 弹窗底部 -->
      <div class="flex items-center justify-end gap-3 p-6 border-t theme-manager-border flex-none">
        <button 
          type="button" 
          class="theme-manager-button-secondary" 
          @click="cancel"
          :disabled="loading"
        >
          {{ t('common.cancel') }}
        </button>
        <button 
          type="button"
          class="theme-manager-button-primary inline-flex items-center gap-2" 
          @click="save"
          :disabled="!isValid || loading"
        >
          <svg v-if="loading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isEditing ? t('common.save') : t('common.add') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Variable } from '../types/variable'

const { t } = useI18n()

interface Props {
  variable?: Variable | null
  existingNames: string[]
}

const props = withDefaults(defineProps<Props>(), {
  variable: null
})

const emit = defineEmits<{
  'save': [variable: { name: string; value: string }]
  'cancel': []
}>()

// 状态管理
const loading = ref(false)
const formData = ref({
  name: '',
  value: ''
})

const errors = ref({
  name: '',
  value: ''
})

// 计算属性
const isEditing = computed(() => !!props.variable)

const isValid = computed(() => {
  return formData.value.name.trim() !== '' && 
         formData.value.value.trim() !== '' && 
         !errors.value.name && 
         !errors.value.value
})

// 验证函数
const validateName = () => {
  const name = formData.value.name.trim()
  errors.value.name = ''

  if (!name) {
    errors.value.name = t('variables.editor.errors.nameRequired')
    return false
  }

  // 检查变量名格式（字母、数字、下划线）
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    errors.value.name = t('variables.editor.errors.nameInvalid')
    return false
  }

  // 检查是否与预定义变量冲突
  const predefinedNames = ['originalPrompt', 'lastOptimizedPrompt', 'iterateInput']
  if (predefinedNames.includes(name)) {
    errors.value.name = t('variables.editor.errors.namePredefined')
    return false
  }

  // 检查是否重名（编辑模式下排除自己）
  const existingNames = props.existingNames.filter(n => 
    isEditing.value ? n !== props.variable?.name : true
  )
  if (existingNames.includes(name)) {
    errors.value.name = t('variables.editor.errors.nameExists')
    return false
  }

  return true
}

const validateValue = () => {
  const value = formData.value.value.trim()
  errors.value.value = ''

  if (!value) {
    errors.value.value = t('variables.editor.errors.valueRequired')
    return false
  }

  // 检查值长度限制
  if (value.length > 5000) {
    errors.value.value = t('variables.editor.errors.valueTooLong')
    return false
  }

  return true
}

const validate = () => {
  return validateName() && validateValue()
}

const formatVariableName = (name: string): string => {
  return `{{${name}}}`
}

// 事件处理
const save = async () => {
  if (!validate()) return

  try {
    loading.value = true
    emit('save', {
      name: formData.value.name.trim(),
      value: formData.value.value.trim()
    })
  } catch (error: unknown) {
    console.error('[VariableEditor] Save error:', error)
  } finally {
    loading.value = false
  }
}

const cancel = () => {
  emit('cancel')
}

// 初始化
onMounted(() => {
  if (props.variable) {
    formData.value = {
      name: props.variable.name,
      value: props.variable.value
    }
  }
})

// 监听props变化
watch(() => props.variable, (newVariable) => {
  if (newVariable) {
    formData.value = {
      name: newVariable.name,
      value: newVariable.value
    }
  } else {
    formData.value = {
      name: '',
      value: ''
    }
  }
  
  // 清除错误
  errors.value = {
    name: '',
    value: ''
  }
})
</script>

<style scoped>
/* 移除所有自定义样式，完全依赖 theme.css 中的主题类 */
</style>
