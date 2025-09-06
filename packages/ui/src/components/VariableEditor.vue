<template>
  <NModal 
    :show="true" 
    preset="card" 
    :title="isEditing ? t('variables.editor.editTitle') : t('variables.editor.addTitle')"
    size="medium"
    :segmented="{ content: true }"
    style="width: 600px;"
    @close="cancel"
    :mask-closable="false"
  >

    <NForm 
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-placement="top"
    >
      <!-- 变量名 -->
      <NFormItem 
        path="name" 
        :label="t('variables.editor.variableName')"
        required
      >
        <NInput
          v-model:value="formData.name"
          :placeholder="t('variables.editor.variableNamePlaceholder')"
          :disabled="isEditing || loading"
          @input="validateName"
          clearable
        />
        <template #feedback>
          <div class="text-xs text-gray-500 mt-1">
            {{ t('variables.editor.variableNameHelp') }}
          </div>
        </template>
      </NFormItem>

      <!-- 变量值 -->
      <NFormItem 
        path="value" 
        :label="t('variables.editor.variableValue')"
        required
      >
        <NInput
          v-model:value="formData.value"
          type="textarea"
          :placeholder="t('variables.editor.variableValuePlaceholder')"
          :disabled="loading"
          :autosize="{ minRows: 4, maxRows: 8 }"
          @input="validateValue"
          clearable
        />
        <template #feedback>
          <div class="text-xs text-gray-500 mt-1">
            {{ t('variables.editor.variableValueHelp') }}
          </div>
        </template>
      </NFormItem>

      <!-- 预览 -->
      <NCard v-if="formData.name && formData.value" size="small" embedded>
        <template #header>
          <div class="text-sm font-medium">{{ t('variables.editor.preview') }}</div>
        </template>
        <NSpace vertical size="small">
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-500 min-w-[80px]">{{ t('variables.editor.usage') }}:</span>
            <NTag size="small" type="info">{{ formatVariableName(formData.name) }}</NTag>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-xs text-gray-500 min-w-[80px]">{{ t('variables.editor.resolvedValue') }}:</span>
            <div class="flex-1 text-xs max-h-20 overflow-y-auto p-2 bg-gray-50 rounded">{{ formData.value }}</div>
          </div>
        </NSpace>
      </NCard>
    </NForm>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="cancel" :disabled="loading">
          {{ t('common.cancel') }}
        </NButton>
        <NButton 
          type="primary"
          @click="save"
          :disabled="!isValid || loading"
          :loading="loading"
        >
          {{ isEditing ? t('common.save') : t('common.add') }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NModal, NForm, NFormItem, NInput, NButton, NCard, NSpace, NTag, type FormInst, type FormRules } from 'naive-ui'
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
const formRef = ref<FormInst>()
const formData = ref({
  name: '',
  value: ''
})

// 计算属性
const isEditing = computed(() => !!props.variable)

const isValid = computed(() => {
  return formData.value.name.trim() !== '' && 
         formData.value.value.trim() !== ''
})

// 表单验证规则
const formRules: FormRules = {
  name: [
    {
      required: true,
      message: () => t('variables.editor.errors.nameRequired'),
      trigger: ['input', 'blur']
    },
    {
      validator: (rule: any, value: string) => {
        if (value && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value.trim())) {
          return new Error(t('variables.editor.errors.nameInvalid'))
        }
        return true
      },
      trigger: ['input', 'blur']
    },
    {
      validator: (rule: any, value: string) => {
        const predefinedNames = ['originalPrompt', 'lastOptimizedPrompt', 'iterateInput']
        if (value && predefinedNames.includes(value.trim())) {
          return new Error(t('variables.editor.errors.namePredefined'))
        }
        return true
      },
      trigger: ['input', 'blur']
    },
    {
      validator: (rule: any, value: string) => {
        const existingNames = props.existingNames.filter(n => 
          isEditing.value ? n !== props.variable?.name : true
        )
        if (value && existingNames.includes(value.trim())) {
          return new Error(t('variables.editor.errors.nameExists'))
        }
        return true
      },
      trigger: ['input', 'blur']
    }
  ],
  value: [
    {
      required: true,
      message: () => t('variables.editor.errors.valueRequired'),
      trigger: ['input', 'blur']
    },
    {
      validator: (rule: any, value: string) => {
        if (value && value.trim().length > 5000) {
          return new Error(t('variables.editor.errors.valueTooLong'))
        }
        return true
      },
      trigger: ['input', 'blur']
    }
  ]
}

// 验证函数（保持兼容性）
const validateName = () => {
  formRef.value?.validate(['name'])
}

const validateValue = () => {
  formRef.value?.validate(['value'])
}

const formatVariableName = (name: string): string => {
  return `{{${name}}}`
}

// 事件处理
const save = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    loading.value = true
    emit('save', {
      name: formData.value.name.trim(),
      value: formData.value.value.trim()
    })
  } catch (error: unknown) {
    console.error('[VariableEditor] Validation error:', error)
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
})
</script>

<style scoped>
/* 移除所有自定义样式，完全依赖 theme.css 中的主题类 */
</style>
