<template>
  <div class="modal-overlay" @click="cancel">
    <div class="modal-container" @click.stop>
      <!-- 弹窗头部 -->
      <div class="modal-header">
        <h3 class="modal-title">{{ t('variables.importer.title') }}</h3>
        <button class="close-button" @click="cancel" :title="t('common.cancel')">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
          </svg>
        </button>
      </div>

      <!-- 弹窗内容 -->
      <div class="modal-content">
        <!-- 导入方式选择 -->
        <div class="import-methods">
          <div class="method-tabs">
            <button 
              class="method-tab"
              :class="{ 'active': activeMethod === 'file' }"
              @click="activeMethod = 'file'"
            >
              {{ t('variables.importer.fromFile') }}
            </button>
            <button 
              class="method-tab"
              :class="{ 'active': activeMethod === 'text' }"
              @click="activeMethod = 'text'"
            >
              {{ t('variables.importer.fromText') }}
            </button>
          </div>
        </div>

        <!-- 文件导入 -->
        <div v-if="activeMethod === 'file'" class="import-section">
          <div class="file-drop-zone" 
               :class="{ 'dragover': isDragOver }"
               @drop="onFileDrop"
               @dragover="onDragOver"
               @dragleave="onDragLeave"
               @click="triggerFileInput">
            <input 
              ref="fileInput"
              type="file"
              accept=".json"
              style="display: none"
              @change="onFileSelect"
            />
            
            <div class="drop-zone-content">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="upload-icon">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              
              <div class="drop-zone-text">
                <p class="primary-text">
                  {{ t('variables.importer.dropFile') }}
                </p>
                <p class="secondary-text">
                  {{ t('variables.importer.orClickToSelect') }}
                </p>
              </div>
            </div>
          </div>
          
          <div class="file-requirements">
            <h4 class="requirements-title">{{ t('variables.importer.fileRequirements') }}</h4>
            <ul class="requirements-list">
              <li>{{ t('variables.importer.jsonFormat') }}</li>
              <li>{{ t('variables.importer.maxSize') }}</li>
              <li>{{ t('variables.importer.structureExample') }}</li>
            </ul>
          </div>
        </div>

        <!-- 文本导入 -->
        <div v-if="activeMethod === 'text'" class="import-section">
          <div class="form-group">
            <label for="importText" class="form-label">
              {{ t('variables.importer.jsonText') }}
            </label>
            <textarea
              id="importText"
              v-model="importText"
              class="form-textarea"
              :placeholder="t('variables.importer.jsonTextPlaceholder')"
              rows="10"
            ></textarea>
            <div class="help-text">
              {{ t('variables.importer.jsonTextHelp') }}
            </div>
          </div>
        </div>

        <!-- 导入预览 -->
        <div v-if="parsedVariables.length > 0" class="preview-section">
          <h4 class="preview-title">
            {{ t('variables.importer.previewTitle', { count: parsedVariables.length }) }}
          </h4>
          
          <div class="preview-list">
            <div 
              v-for="variable in parsedVariables" 
              :key="variable.name"
              class="preview-item"
              :class="{ 'conflict': variable.hasConflict }"
            >
              <div class="preview-name">
                <code>{{ formatVariableName(variable.name) }}</code>
                <span v-if="variable.hasConflict" class="conflict-badge">
                  {{ t('variables.importer.conflict') }}
                </span>
              </div>
              <div class="preview-value">
                {{ truncateValue(variable.value) }}
              </div>
            </div>
          </div>
          
          <div v-if="conflictCount > 0" class="conflict-warning">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" class="warning-icon">
              <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.19-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
            </svg>
            <span>{{ t('variables.importer.conflictWarning', { count: conflictCount }) }}</span>
          </div>
        </div>

        <!-- 错误信息 -->
        <div v-if="error" class="error-section">
          <div class="error-message">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" class="error-icon">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
            </svg>
            <span>{{ error }}</span>
          </div>
        </div>
      </div>

      <!-- 弹窗底部 -->
      <div class="modal-footer">
        <button 
          type="button" 
          class="btn-secondary" 
          @click="cancel"
          :disabled="loading"
        >
          {{ t('common.cancel') }}
        </button>
        <button 
          type="button"
          class="btn-primary" 
          @click="importVariables"
          :disabled="!canImport || loading"
        >
          <span v-if="loading" class="loading-spinner"></span>
          {{ t('variables.importer.import') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const emit = defineEmits<{
  'import': [variables: Record<string, string>]
  'cancel': []
}>()

// 状态管理
const loading = ref(false)
const activeMethod = ref<'file' | 'text'>('file')
const isDragOver = ref(false)
const importText = ref('')
const error = ref('')
const fileInput = ref<HTMLInputElement>()

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
const triggerFileInput = () => {
  fileInput.value?.click()
}

const onFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    handleFile(file)
  }
}

const onFileDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  
  const file = event.dataTransfer?.files[0]
  if (file) {
    handleFile(file)
  }
}

const onDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

const onDragLeave = () => {
  isDragOver.value = false
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
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 1rem;
}

.modal-container {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 1.5rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.close-button:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.modal-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.import-methods {
  margin-bottom: 1.5rem;
}

.method-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
}

.method-tab {
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.method-tab.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.method-tab:hover {
  color: #374151;
}

.import-section {
  margin-bottom: 1.5rem;
}

.file-drop-zone {
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 1rem;
}

.file-drop-zone:hover,
.file-drop-zone.dragover {
  border-color: #3b82f6;
  background-color: #f0f9ff;
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.upload-icon {
  color: #6b7280;
}

.drop-zone-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.primary-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin: 0;
}

.secondary-text {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
}

.file-requirements {
  padding: 1rem;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
}

.requirements-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin: 0 0 0.5rem;
}

.requirements-list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  resize: vertical;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.help-text {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.preview-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
}

.preview-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin: 0 0 0.75rem;
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.preview-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.25rem;
}

.preview-item.conflict {
  background-color: #fef2f2;
  border-color: #fecaca;
}

.preview-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.preview-name code {
  background-color: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 0.125rem;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.75rem;
  color: #7c3aed;
}

.conflict-badge {
  background-color: #dc2626;
  color: white;
  padding: 0.125rem 0.25rem;
  border-radius: 0.125rem;
  font-size: 0.625rem;
  font-weight: 500;
  text-transform: uppercase;
}

.preview-value {
  font-size: 0.75rem;
  color: #6b7280;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conflict-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.5rem;
  background-color: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  color: #92400e;
}

.warning-icon {
  color: #f59e0b;
  flex-shrink: 0;
}

.error-section {
  margin-bottom: 1rem;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #dc2626;
}

.error-icon {
  color: #dc2626;
  flex-shrink: 0;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background-color: #f9fafb;
}

.btn-primary, .btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: white;
  color: #374151;
  border-color: #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #f9fafb;
}

.btn-primary:disabled, .btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
