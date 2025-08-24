<template>
  <NModal 
    :show="true" 
    preset="card" 
    :title="t('variables.importer.title')"
    size="large"
    :segmented="{ content: true }"
    style="width: 700px;"
    @close="cancel"
    :mask-closable="false"
  >

    <!-- 导入方式选择 -->
    <NTabs v-model:value="activeMethod" type="segment" class="mb-4">
      <NTabPane name="file" :tab="t('variables.importer.fromFile')">
        <!-- 文件导入内容将在下面 -->
      </NTabPane>
      <NTabPane name="text" :tab="t('variables.importer.fromText')">
        <!-- 文本导入内容将在下面 -->
      </NTabPane>
    </NTabs>

    <!-- 文件导入 -->
    <div v-show="activeMethod === 'file'" class="mb-4">
      <NUpload
        ref="uploadRef"
        :file-list="[]"
        :max="1"
        accept=".json"
        :custom-request="handleCustomUpload"
        :show-file-list="false"
        @before-upload="handleBeforeUpload"
      >
        <NUploadDragger>
          <div class="text-center p-8">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="mx-auto mb-4 text-gray-400">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            
            <NText class="text-base mb-2">
              {{ t('variables.importer.dropFile') }}
            </NText>
            <NText depth="3" class="text-sm">
              {{ t('variables.importer.orClickToSelect') }}
            </NText>
          </div>
        </NUploadDragger>
      </NUpload>
      
      <NAlert type="info" class="mt-4">
        <template #header>
          {{ t('variables.importer.fileRequirements') }}
        </template>
        <NUl>
          <NLi>{{ t('variables.importer.jsonFormat') }}</NLi>
          <NLi>{{ t('variables.importer.maxSize') }}</NLi>
          <NLi>{{ t('variables.importer.structureExample') }}</NLi>
        </NUl>
      </NAlert>
    </div>

    <!-- 文本导入 -->
    <div v-show="activeMethod === 'text'" class="mb-4">
      <NFormItem :label="t('variables.importer.jsonText')" label-placement="top">
        <NInput
          v-model:value="importText"
          type="textarea"
          :placeholder="t('variables.importer.jsonTextPlaceholder')"
          :autosize="{ minRows: 10, maxRows: 15 }"
          :input-props="{ style: 'font-family: Monaco, Consolas, monospace; font-size: 13px;' }"
        />
        <template #feedback>
          <NText depth="3" class="text-xs">
            {{ t('variables.importer.jsonTextHelp') }}
          </NText>
        </template>
      </NFormItem>
    </div>

    <!-- 导入预览 -->
    <div v-if="parsedVariables.length > 0" class="mb-4">
      <NCard size="small" embedded>
        <template #header>
          <NText class="font-medium">
            {{ t('variables.importer.previewTitle', { count: parsedVariables.length }) }}
          </NText>
        </template>
        
        <NScrollbar style="max-height: 250px;">
          <NSpace vertical size="small">
            <div 
              v-for="variable in parsedVariables" 
              :key="variable.name"
              class="flex items-center justify-between p-3 rounded transition-colors"
              :class="variable.hasConflict ? 'bg-red-50' : 'bg-gray-50'"
            >
              <div class="flex items-center gap-2">
                <NTag size="small" :type="variable.hasConflict ? 'error' : 'info'">
                  {{ formatVariableName(variable.name) }}
                </NTag>
                <NTag v-if="variable.hasConflict" size="small" type="error">
                  {{ t('variables.importer.conflict') }}
                </NTag>
              </div>
              <NText depth="3" class="text-sm max-w-xs truncate">
                {{ truncateValue(variable.value) }}
              </NText>
            </div>
          </NSpace>
        </NScrollbar>
        
        <div v-if="conflictCount > 0" class="mt-3">
          <NAlert type="warning" size="small">
            <template #icon>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.19-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
              </svg>
            </template>
            {{ t('variables.importer.conflictWarning', { count: conflictCount }) }}
          </NAlert>
        </div>
      </NCard>
    </div>

    <!-- 错误信息 -->
    <div v-if="error" class="mb-4">
      <NAlert type="error" size="small">
        <template #icon>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
          </svg>
        </template>
        {{ error }}
      </NAlert>
    </div>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="cancel" :disabled="loading">
          {{ t('common.cancel') }}
        </NButton>
        <NButton 
          type="primary"
          @click="importVariables"
          :disabled="!canImport || loading"
          :loading="loading"
        >
          {{ t('variables.importer.import') }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { 
  NModal, NButton, NTabs, NTabPane, NUpload, NUploadDragger, NText, 
  NAlert, NUl, NLi, NFormItem, NInput, NCard, NScrollbar, NSpace, NTag 
} from 'naive-ui'
import type { UploadFileInfo, UploadCustomRequestOptions } from 'naive-ui'

const { t } = useI18n()

const emit = defineEmits<{
  'import': [variables: Record<string, string>]
  'cancel': []
}>()

// 状态管理
const loading = ref(false)
const activeMethod = ref<'file' | 'text'>('file')
const importText = ref('')
const error = ref('')
const uploadRef = ref()

interface ParsedVariable {
  name: string
  value: string
  hasConflict: boolean
}

const parsedVariables = ref<ParsedVariable[]>([])

// 计算属性
const conflictCount = computed(() => {
  return parsedVariables.value.filter(v => v.hasConflict).length
})

const canImport = computed(() => {
  return parsedVariables.value.length > 0 && !error.value
})

// 工具函数
const truncateValue = (value: string, maxLength: number = 60): string => {
  if (value.length <= maxLength) return value
  return value.substring(0, maxLength) + '...'
}

const parseVariables = (data: unknown): Record<string, string> => {
  if (typeof data !== 'object' || data === null) {
    throw new Error(t('variables.importer.errors.invalidFormat'))
  }

  const obj = data as Record<string, unknown>
  
  // 检查是否是导出的格式
  if ('variables' in obj && typeof obj.variables === 'object') {
    return parseVariables(obj.variables)
  }
  
  // 直接的变量对象
  const variables: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof key !== 'string' || typeof value !== 'string') {
      throw new Error(t('variables.importer.errors.invalidVariableFormat', { key }))
    }
    
    // 验证变量名格式
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      throw new Error(t('variables.importer.errors.invalidVariableName', { name: key }))
    }
    
    variables[key] = value
  }
  
  return variables
}

const processVariables = (data: string) => {
  try {
    error.value = ''
    const jsonData = JSON.parse(data)
    const variables = parseVariables(jsonData)
    
    // 检查冲突（与预定义变量）
    const predefinedNames = ['originalPrompt', 'lastOptimizedPrompt', 'iterateInput']
    
    parsedVariables.value = Object.entries(variables).map(([name, value]) => ({
      name,
      value,
      hasConflict: predefinedNames.includes(name)
    }))
    
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : t('variables.importer.errors.parseError')
    parsedVariables.value = []
  }
}

// 文件处理
const handleBeforeUpload = (data: { file: UploadFileInfo, fileList: UploadFileInfo[] }) => {
  const file = data.file.file
  if (file) {
    handleFile(file)
  }
  return false // 阻止自动上传
}

const handleCustomUpload = (options: UploadCustomRequestOptions) => {
  // 自定义上传处理，这里不需要实际上传到服务器
  const file = options.file.file
  if (file) {
    handleFile(file)
  }
}

const handleFile = (file: File) => {
  if (!file.type.includes('json')) {
    error.value = t('variables.importer.errors.invalidFileType')
    return
  }
  
  if (file.size > 1024 * 1024) { // 1MB
    error.value = t('variables.importer.errors.fileTooLarge')
    return
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    importText.value = content
    processVariables(content)
  }
  reader.onerror = () => {
    error.value = t('variables.importer.errors.fileReadError')
  }
  reader.readAsText(file)
}

// 事件处理
const cancel = () => {
  emit('cancel')
}

const importVariables = () => {
  if (!canImport.value) return
  
  const variables: Record<string, string> = {}
  parsedVariables.value
    .filter(v => !v.hasConflict) // 排除冲突的变量
    .forEach(v => {
      variables[v.name] = v.value
    })
  
  emit('import', variables)
}

const formatVariableName = (name: string): string => {
  return `{{${name}}}`
}

// 监听文本变化
watch(importText, (newText) => {
  if (newText.trim()) {
    processVariables(newText)
  } else {
    parsedVariables.value = []
    error.value = ''
  }
})

// 监听方法切换
watch(activeMethod, () => {
  error.value = ''
  parsedVariables.value = []
  if (activeMethod.value === 'file') {
    importText.value = ''
  }
})
</script>

<style scoped>
/* Pure Naive UI implementation - no custom theme CSS needed */
</style>
