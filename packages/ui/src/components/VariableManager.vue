<template>
  <NCard class="variable-manager" size="medium">
    <!-- 头部 -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">
        {{ t('variables.title') }}
      </h3>
      <div class="flex items-center gap-2">
        <NTag size="small" type="info">
          {{ t('variables.total', { count: statistics.totalVariableCount }) }}
        </NTag>
        <NButton
          v-if="Object.keys(customVariables).length > 0"
          @click="showExportDialog = true"
          type="default"
          size="small"
        >
          {{ t('variables.export') }}
        </NButton>
        <NButton
          @click="showImportDialog = true"
          type="default"
          size="small"
        >
          {{ t('variables.import') }}
        </NButton>
      </div>
    </div>

    <!-- 变量列表 -->
    <div class="variable-list space-y-4 mb-4">
      <!-- 预定义变量 -->
      <div v-if="predefinedVariables.length > 0" class="predefined-section">
        <h4 class="text-sm font-medium text-gray-600 mb-3">
          {{ t('variables.predefined') }}
        </h4>
        <NCard size="small" class="space-y-2">
          <div 
            v-for="(value, name) in predefinedVariables" 
            :key="`predefined-${name}`"
            class="flex items-center justify-between p-2 rounded hover:bg-gray-50"
          >
            <div class="flex items-center gap-3 flex-1">
              <div class="flex items-center gap-2">
                <NTag size="tiny" type="info">
                  {{ name }}
                </NTag>
                <NTag size="tiny" type="default">
                  {{ t('variables.predefinedBadge') }}
                </NTag>
              </div>
              <div class="flex-1 text-sm text-gray-700 truncate">
                {{ value || t('variables.emptyValue') }}
              </div>
              <div class="text-xs text-gray-500">
                {{ t('variables.readonly') }}
              </div>
            </div>
          </div>
        </NCard>
      </div>

      <!-- 自定义变量 -->
      <div class="custom-section">
        <h4 class="text-sm font-medium text-gray-600 mb-3">
          {{ t('variables.custom') }}
        </h4>
        
        <div v-if="Object.keys(customVariables).length === 0" class="empty-state">
          <NCard size="small">
            <div class="text-center py-8 text-gray-500">
              <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <p class="text-sm">{{ t('variables.noCustomVariables') }}</p>
              <p class="text-xs mt-1">{{ t('variables.addFirstVariable') }}</p>
            </div>
          </NCard>
        </div>

        <NCard v-else size="small" class="space-y-2">
          <div 
            v-for="(value, name) in customVariables" 
            :key="`custom-${name}`"
            class="flex items-center justify-between p-2 rounded hover:bg-gray-50"
          >
            <div class="flex items-center gap-3 flex-1">
              <div class="flex items-center gap-2">
                <NTag size="tiny" type="success">
                  {{ name }}
                </NTag>
                <NTag size="tiny" type="warning">
                  {{ t('variables.customBadge') }}
                </NTag>
              </div>
              <div class="flex-1">
                <NInput
                  v-if="editingVariable === name"
                  v-model:value="editingValue"
                  @keyup.enter="saveEdit"
                  @keyup.escape="cancelEdit"
                  @blur="saveEdit"
                  :placeholder="t('variables.valuePlaceholder')"
                  size="small"
                  ref="editInput"
                />
                <div 
                  v-else 
                  class="text-sm text-gray-700 cursor-pointer px-2 py-1 rounded hover:bg-gray-100" 
                  @click="startEdit(name, value)"
                >
                  {{ value || t('variables.emptyValue') }}
                </div>
              </div>
              <div class="flex items-center gap-1">
                <NButton
                  v-if="editingVariable !== name"
                  @click="startEdit(name, value)"
                  size="tiny"
                  quaternary
                  type="info"
                  :title="t('variables.edit')"
                >
                  <template #icon>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </template>
                </NButton>
                <NButton
                  v-if="editingVariable !== name"
                  @click="deleteVariable(name)"
                  size="tiny"
                  quaternary
                  type="error"
                  :title="t('variables.delete')"
                >
                  <template #icon>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </template>
                </NButton>
              </div>
            </div>
          </div>
        </NCard>
      </div>
    </div>

    <!-- 添加变量表单 -->
    <NDivider />
    <div class="add-variable-form">
      <h4 class="text-sm font-medium text-gray-600 mb-3">
        {{ t('variables.addNew') }}
      </h4>
      <div class="grid grid-cols-12 gap-3 items-end">
        <div class="col-span-4">
          <label class="text-xs font-medium text-gray-600 block mb-1">
            {{ t('variables.name') }}
          </label>
          <NInput
            v-model:value="newVariableName"
            @keyup.enter="addVariable"
            :placeholder="t('variables.namePlaceholder')"
            :status="nameError ? 'error' : undefined"
            size="small"
          />
          <div v-if="nameError" class="text-xs text-red-500 mt-1">
            {{ nameError }}
          </div>
        </div>
        <div class="col-span-6">
          <label class="text-xs font-medium text-gray-600 block mb-1">
            {{ t('variables.value') }}
          </label>
          <NInput
            v-model:value="newVariableValue"
            @keyup.enter="addVariable"
            :placeholder="t('variables.valuePlaceholder')"
            :status="valueError ? 'error' : undefined"
            size="small"
          />
          <div v-if="valueError" class="text-xs text-red-500 mt-1">
            {{ valueError }}
          </div>
        </div>
        <div class="col-span-2">
          <NButton
            @click="addVariable"
            :disabled="!canAddVariable"
            type="primary"
            size="small"
            class="w-full"
          >
            {{ t('variables.add') }}
          </NButton>
        </div>
      </div>
    </div>

    <!-- 导出对话框 -->
    <NModal 
      v-model:show="showExportDialog" 
      preset="dialog" 
      :title="t('variables.exportTitle')"
      :show-icon="false"
      style="width: 600px"
    >
      <template #default>
        <NInput
          :value="exportData"
          readonly
          type="textarea"
          :autosize="{ minRows: 16, maxRows: 16 }"
          class="font-mono text-sm"
        />
      </template>
      <template #action>
        <div class="flex justify-end gap-2">
          <NButton @click="showExportDialog = false" type="default">
            {{ t('common.cancel') }}
          </NButton>
          <NButton @click="copyExportData" type="primary">
            {{ t('variables.copyData') }}
          </NButton>
        </div>
      </template>
    </NModal>

    <!-- 导入对话框 -->
    <NModal 
      v-model:show="showImportDialog" 
      preset="dialog" 
      :title="t('variables.importTitle')"
      :show-icon="false"
      style="width: 600px"
    >
      <template #default>
        <NInput
          v-model:value="importData"
          type="textarea"
          :autosize="{ minRows: 16, maxRows: 16 }"
          :placeholder="t('variables.importPlaceholder')"
          class="font-mono text-sm"
        />
        <div v-if="importError" class="text-sm text-red-500 mt-2">
          {{ importError }}
        </div>
      </template>
      <template #action>
        <div class="flex justify-end gap-2">
          <NButton @click="showImportDialog = false" type="default">
            {{ t('common.cancel') }}
          </NButton>
          <NButton 
            @click="importVariables" 
            :disabled="!importData.trim()"
            type="primary"
          >
            {{ t('variables.import') }}
          </NButton>
        </div>
      </template>
    </NModal>
  </NCard>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NButton, NCard, NTag, NModal, NInput, NDivider } from 'naive-ui'
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
/* 仅保留必要的样式，其余由 Naive UI 提供 */
.variable-manager {
  /* Naive UI NCard 提供所有样式 */
}
</style>
