<template>
  <div class="variable-manager">
    <!-- 头部 -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold theme-text">
        {{ t('variables.title') }}
      </h3>
      <div class="flex items-center gap-2 text-sm theme-text-secondary">
        <span>{{ t('variables.total', { count: statistics.totalVariableCount }) }}</span>
        <button
          v-if="Object.keys(customVariables).length > 0"
          @click="showExportDialog = true"
          class="px-2 py-1 text-xs theme-button-secondary"
        >
          {{ t('variables.export') }}
        </button>
        <button
          @click="showImportDialog = true"
          class="px-2 py-1 text-xs theme-button-secondary"
        >
          {{ t('variables.import') }}
        </button>
      </div>
    </div>

    <!-- 变量列表 -->
    <div class="variable-list space-y-3 mb-4">
      <!-- 预定义变量 -->
      <div v-if="predefinedVariables.length > 0" class="predefined-section">
        <h4 class="text-sm font-medium theme-text-secondary mb-2">
          {{ t('variables.predefined') }}
        </h4>
        <div class="space-y-2">
          <div 
            v-for="(value, name) in predefinedVariables" 
            :key="`predefined-${name}`"
            class="variable-item predefined"
          >
            <div class="flex items-center gap-3">
              <div class="flex-1 grid grid-cols-12 gap-3 items-center">
                <div class="col-span-3">
                  <span class="variable-name">{{ name }}</span>
                  <span class="variable-badge predefined">
                    {{ t('variables.predefinedBadge') }}
                  </span>
                </div>
                <div class="col-span-8">
                  <div class="variable-value-display">
                    {{ value || t('variables.emptyValue') }}
                  </div>
                </div>
                <div class="col-span-1 text-right">
                  <span class="text-xs theme-text-muted">
                    {{ t('variables.readonly') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 自定义变量 -->
      <div class="custom-section">
        <h4 class="text-sm font-medium theme-text-secondary mb-2">
          {{ t('variables.custom') }}
        </h4>
        
        <div v-if="Object.keys(customVariables).length === 0" class="empty-state">
          <div class="text-center py-8 theme-text-muted">
            <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <p class="text-sm">{{ t('variables.noCustomVariables') }}</p>
            <p class="text-xs mt-1">{{ t('variables.addFirstVariable') }}</p>
          </div>
        </div>

        <div v-else class="space-y-2">
          <div 
            v-for="(value, name) in customVariables" 
            :key="`custom-${name}`"
            class="variable-item custom"
          >
            <div class="flex items-center gap-3">
              <div class="flex-1 grid grid-cols-12 gap-3 items-center">
                <div class="col-span-3">
                  <span class="variable-name">{{ name }}</span>
                  <span class="variable-badge custom">
                    {{ t('variables.customBadge') }}
                  </span>
                </div>
                <div class="col-span-7">
                  <input
                    v-if="editingVariable === name"
                    v-model="editingValue"
                    @keyup.enter="saveEdit"
                    @keyup.escape="cancelEdit"
                    @blur="saveEdit"
                    class="variable-value-input"
                    :placeholder="t('variables.valuePlaceholder')"
                    ref="editInput"
                  />
                  <div v-else class="variable-value-display" @click="startEdit(name, value)">
                    {{ value || t('variables.emptyValue') }}
                  </div>
                </div>
                <div class="col-span-2 flex items-center justify-end gap-1">
                  <button
                    v-if="editingVariable !== name"
                    @click="startEdit(name, value)"
                    class="action-btn edit"
                    :title="t('variables.edit')"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    v-if="editingVariable !== name"
                    @click="deleteVariable(name)"
                    class="action-btn delete"
                    :title="t('variables.delete')"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加变量表单 -->
    <div class="add-variable-form">
      <div class="border-t pt-4">
        <h4 class="text-sm font-medium theme-text-secondary mb-3">
          {{ t('variables.addNew') }}
        </h4>
        <div class="grid grid-cols-12 gap-3 items-end">
          <div class="col-span-4">
            <label class="text-xs font-medium theme-text-secondary block mb-1">
              {{ t('variables.name') }}
            </label>
            <input
              v-model="newVariableName"
              @keyup.enter="addVariable"
              class="w-full px-3 py-2 border rounded-md theme-input"
              :placeholder="t('variables.namePlaceholder')"
              :class="{ 'border-red-500': nameError }"
            />
            <div v-if="nameError" class="text-xs text-red-500 mt-1">
              {{ nameError }}
            </div>
          </div>
          <div class="col-span-6">
            <label class="text-xs font-medium theme-text-secondary block mb-1">
              {{ t('variables.value') }}
            </label>
            <input
              v-model="newVariableValue"
              @keyup.enter="addVariable"
              class="w-full px-3 py-2 border rounded-md theme-input"
              :placeholder="t('variables.valuePlaceholder')"
              :class="{ 'border-red-500': valueError }"
            />
            <div v-if="valueError" class="text-xs text-red-500 mt-1">
              {{ valueError }}
            </div>
          </div>
          <div class="col-span-2">
            <button
              @click="addVariable"
              :disabled="!canAddVariable"
              class="w-full px-4 py-2 theme-button-primary"
              :class="{ 'opacity-50 cursor-not-allowed': !canAddVariable }"
            >
              {{ t('variables.add') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 导出对话框 -->
    <div v-if="showExportDialog" class="modal-overlay" @click="showExportDialog = false">
      <div class="modal-content" @click.stop>
        <h3 class="text-lg font-semibold mb-4">{{ t('variables.exportTitle') }}</h3>
        <textarea
          :value="exportData"
          readonly
          class="w-full h-64 p-3 border rounded-md theme-input font-mono text-sm"
        ></textarea>
        <div class="flex justify-end gap-2 mt-4">
          <button @click="showExportDialog = false" class="px-4 py-2 theme-button-secondary">
            {{ t('common.cancel') }}
          </button>
          <button @click="copyExportData" class="px-4 py-2 theme-button-primary">
            {{ t('variables.copyData') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 导入对话框 -->
    <div v-if="showImportDialog" class="modal-overlay" @click="showImportDialog = false">
      <div class="modal-content" @click.stop>
        <h3 class="text-lg font-semibold mb-4">{{ t('variables.importTitle') }}</h3>
        <textarea
          v-model="importData"
          class="w-full h-64 p-3 border rounded-md theme-input font-mono text-sm"
          :placeholder="t('variables.importPlaceholder')"
        ></textarea>
        <div v-if="importError" class="text-sm text-red-500 mt-2">
          {{ importError }}
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button @click="showImportDialog = false" class="px-4 py-2 theme-button-secondary">
            {{ t('common.cancel') }}
          </button>
          <button 
            @click="importVariables" 
            :disabled="!importData.trim()"
            class="px-4 py-2 theme-button-primary"
            :class="{ 'opacity-50 cursor-not-allowed': !importData.trim() }"
          >
            {{ t('variables.import') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClipboard } from '../composables/useClipboard'
import type { IVariableManager } from '../types/variable'
import { VariableError } from '../types/variable'

const { t } = useI18n()
const { copyText } = useClipboard()

interface Props {
  variableManager: IVariableManager | null
  context?: any  // 用于获取预定义变量的当前值
}

const props = defineProps<Props>()

// 状态
const newVariableName = ref('')
const newVariableValue = ref('')
const editingVariable = ref<string | null>(null)
const editingValue = ref('')
const nameError = ref('')
const valueError = ref('')
const showExportDialog = ref(false)
const showImportDialog = ref(false)
const importData = ref('')
const importError = ref('')

// 获取变量数据
const customVariables = computed(() => {
  return props.variableManager?.listVariables() ?? {}
})

const predefinedVariables = computed(() => {
  if (!props.variableManager) return {}
  
  const allVariables = props.variableManager.resolveAllVariables(props.context)
  const predefined: Record<string, string> = {}
  
  // 只包含预定义变量
  for (const [name, value] of Object.entries(allVariables)) {
    if (props.variableManager.isPredefinedVariable(name)) {
      predefined[name] = value
    }
  }
  
  return predefined
})

const statistics = computed(() => {
  return props.variableManager?.getStatistics() ?? {
    customVariableCount: 0,
    predefinedVariableCount: 0,
    totalVariableCount: 0,
    advancedModeEnabled: false
  }
})

const exportData = computed(() => {
  return props.variableManager?.exportVariables() ?? ''
})

// 验证
const canAddVariable = computed(() => {
  return newVariableName.value.trim() && 
         newVariableValue.value.trim() && 
         !nameError.value && 
         !valueError.value
})

// 方法
const validateName = () => {
  const name = newVariableName.value.trim()
  
  if (!name) {
    nameError.value = ''
    return
  }
  
  if (!props.variableManager?.validateVariableName(name)) {
    nameError.value = t('variables.errors.invalidName')
    return
  }
  
  if (props.variableManager?.isPredefinedVariable(name)) {
    nameError.value = t('variables.errors.predefinedName')
    return
  }
  
  if (customVariables.value[name] !== undefined) {
    nameError.value = t('variables.errors.duplicateName')
    return
  }
  
  nameError.value = ''
}

const validateValue = () => {
  const value = newVariableValue.value
  
  if (value.length > 10000) {
    valueError.value = t('variables.errors.valueTooLong')
    return
  }
  
  valueError.value = ''
}

const addVariable = () => {
  if (!props.variableManager || !canAddVariable.value) return
  
  try {
    const name = newVariableName.value.trim()
    const value = newVariableValue.value.trim()
    
    props.variableManager.setVariable(name, value)
    
    // 清空表单
    newVariableName.value = ''
    newVariableValue.value = ''
    nameError.value = ''
    valueError.value = ''
    
    console.log(`[VariableManager] Added variable: ${name}`)
  } catch (error) {
    if (error instanceof VariableError) {
      if (error.code === 'INVALID_VARIABLE_NAME') {
        nameError.value = t('variables.errors.invalidName')
      } else if (error.code === 'PREDEFINED_VARIABLE_OVERRIDE') {
        nameError.value = t('variables.errors.predefinedName')
      } else if (error.code === 'VALUE_TOO_LONG') {
        valueError.value = t('variables.errors.valueTooLong')
      } else {
        nameError.value = error.message
      }
    } else {
      console.error('[VariableManager] Failed to add variable:', error)
    }
  }
}

const deleteVariable = (name: string) => {
  if (!props.variableManager) return
  
  try {
    props.variableManager.deleteVariable(name)
    console.log(`[VariableManager] Deleted variable: ${name}`)
  } catch (error) {
    console.error('[VariableManager] Failed to delete variable:', error)
  }
}

const startEdit = (name: string, value: string) => {
  editingVariable.value = name
  editingValue.value = value
  
  nextTick(() => {
    const input = document.querySelector('.variable-value-input') as HTMLInputElement
    if (input) {
      input.focus()
      input.select()
    }
  })
}

const saveEdit = () => {
  if (!props.variableManager || !editingVariable.value) return
  
  try {
    const name = editingVariable.value
    const value = editingValue.value.trim()
    
    props.variableManager.setVariable(name, value)
    
    editingVariable.value = null
    editingValue.value = ''
    
    console.log(`[VariableManager] Updated variable: ${name}`)
  } catch (error) {
    console.error('[VariableManager] Failed to update variable:', error)
    cancelEdit()
  }
}

const cancelEdit = () => {
  editingVariable.value = null
  editingValue.value = ''
}

const copyExportData = async () => {
  try {
    await copyText(exportData.value)
    showExportDialog.value = false
  } catch (error) {
    console.error('[VariableManager] Failed to copy export data:', error)
  }
}

const importVariables = () => {
  if (!props.variableManager || !importData.value.trim()) return
  
  try {
    props.variableManager.importVariables(importData.value)
    importData.value = ''
    importError.value = ''
    showImportDialog.value = false
    console.log('[VariableManager] Variables imported successfully')
  } catch (error) {
    if (error instanceof VariableError) {
      importError.value = error.message
    } else {
      importError.value = t('variables.errors.importFailed')
    }
    console.error('[VariableManager] Failed to import variables:', error)
  }
}

// 监听
watch(newVariableName, validateName)
watch(newVariableValue, validateValue)
</script>

<style scoped>
.variable-manager {
  @apply border rounded-lg p-4 theme-card;
}

.variable-item {
  @apply p-3 rounded-lg border;
}

.variable-item.predefined {
  @apply bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700;
}

.variable-item.custom {
  @apply bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors;
}

.variable-name {
  @apply font-mono text-sm font-medium theme-text;
}

.variable-badge {
  @apply inline-block px-2 py-0.5 text-xs rounded-full ml-2;
}

.variable-badge.predefined {
  @apply bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200;
}

.variable-badge.custom {
  @apply bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200;
}

.variable-value-display {
  @apply px-3 py-2 rounded border-0 bg-transparent theme-text text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors;
}

.variable-value-input {
  @apply w-full px-3 py-2 border rounded theme-input text-sm;
}

.action-btn {
  @apply p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors;
}

.action-btn.edit {
  @apply text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300;
}

.action-btn.delete {
  @apply text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300;
}

/* 浅色主题 */
.theme-card {
  background-color: white;
  border-color: #d1d5db;
}

.theme-text {
  color: #111827;
}

.theme-text-secondary {
  color: #374151;
}

.theme-text-muted {
  color: #6b7280;
}

.theme-input {
  background-color: white;
  border-color: #d1d5db;
  color: #111827;
}

.theme-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.theme-button-primary {
  background-color: #2563eb;
  color: white;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
  border: none;
  cursor: pointer;
}

.theme-button-primary:hover {
  background-color: #1d4ed8;
}

.theme-button-secondary {
  background-color: #e5e7eb;
  color: #374151;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
  border: none;
  cursor: pointer;
}

.theme-button-secondary:hover {
  background-color: #d1d5db;
}

/* 深色主题 */
.dark .theme-card {
  background-color: #111827;
  border-color: #4b5563;
}

.dark .theme-text {
  color: #f9fafb;
}

.dark .theme-text-secondary {
  color: #d1d5db;
}

.dark .theme-text-muted {
  color: #9ca3af;
}

.dark .theme-input {
  background-color: #1f2937;
  border-color: #374151;
  color: #f9fafb;
}

.dark .theme-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.dark .theme-button-primary {
  background-color: #3b82f6;
}

.dark .theme-button-primary:hover {
  background-color: #60a5fa;
}

.dark .theme-button-secondary {
  background-color: #374151;
  color: #d1d5db;
}

.dark .theme-button-secondary:hover {
  background-color: #4b5563;
}

.modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50;
}

.modal-content {
  @apply bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto;
}

.empty-state {
  @apply bg-gray-50 dark:bg-gray-800 rounded-lg;
}
</style>
