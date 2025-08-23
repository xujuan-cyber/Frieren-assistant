<template>
  <div v-if="visible" class="fixed inset-0 theme-mask z-[60] flex items-center justify-center p-4" @click="onOverlayClick">
    <div class="relative theme-manager-container w-full max-w-4xl max-h-[90vh] overflow-y-auto z-10" @click.stop>
      <!-- 弹窗头部 -->
      <div class="flex items-center justify-between p-6 border-b theme-manager-border flex-none">
        <h2 class="text-xl font-semibold theme-manager-text">{{ t('variables.management.title') }}</h2>
        <button class="theme-manager-text-secondary hover:theme-manager-text transition-colors text-xl" @click="close" :title="t('common.close')">
          ×
        </button>
      </div>

      <!-- 弹窗内容 -->
      <div class="flex-1 min-h-0 p-6 overflow-y-auto">
        <!-- 工具栏 -->
        <div class="flex items-center gap-3 mb-6">
          <button 
            class="theme-manager-button-primary inline-flex items-center gap-2" 
            @click="showAddVariable"
            :disabled="loading"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5A.5.5 0 018 2z"/>
            </svg>
            {{ t('variables.management.addVariable') }}
          </button>
          
          <div class="flex-1"></div>
          
          <button 
            class="theme-manager-button-secondary" 
            @click="showImportModal"
            :disabled="loading"
          >
            {{ t('variables.management.import') }}
          </button>
          
          <button 
            class="theme-manager-button-secondary" 
            @click="exportVariables"
            :disabled="loading"
          >
            {{ t('variables.management.export') }}
          </button>
        </div>

        <!-- 变量列表 -->
        <div class="theme-manager-card overflow-hidden">
          <div class="grid grid-cols-4 gap-4 p-4 theme-manager-card-header border-b theme-manager-border font-semibold theme-manager-text text-sm">
            <div>{{ t('variables.management.variableName') }}</div>
            <div>{{ t('variables.management.value') }}</div>
            <div>{{ t('variables.management.sourceLabel') }}</div>
            <div>{{ t('common.actions') }}</div>
          </div>
          
          <div class="max-h-[400px] overflow-y-auto">
            <div 
              v-for="variable in allVariables" 
              :key="variable.name"
              class="grid grid-cols-4 gap-4 p-4 border-b theme-manager-border theme-manager-row-hover transition-colors"
              :class="{ 'theme-manager-row-predefined': variable.source === 'predefined' }"
            >
              <div class="flex items-center">
                <code class="px-2 py-1 rounded theme-manager-code font-mono text-sm">{{ formatVariableName(variable.name) }}</code>
              </div>
              
              <div class="theme-manager-text truncate" :title="variable.value">
                {{ truncateValue(variable.value) }}
              </div>
              
              <div>
                <span 
                  class="px-2 py-1 rounded text-xs font-medium"
                  :class="{
                    'theme-manager-tag-predefined': variable.source === 'predefined',
                    'theme-manager-tag-custom': variable.source === 'custom'
                  }"
                >
                  {{ t(`variables.management.source.${variable.source}`) }}
                </span>
              </div>
              
              <div class="flex items-center gap-2">
                <button 
                  v-if="variable.source === 'custom'"
                  class="theme-manager-button-edit text-sm inline-flex items-center gap-1"
                  @click="editVariable(variable)"
                  :title="t('common.edit')"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M12.146.146a.5.5 0 01.708 0l3 3a.5.5 0 010 .708L9.708 9.708a.5.5 0 01-.168.11l-5 2a.5.5 0 01-.65-.65l2-5a.5.5 0 01.11-.168L12.146.146zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.5h.293L12.793 5.5zM9.208 5.5L8.5 6.208V7H7v-.5a.5.5 0 00-.5-.5H6v-.5a.5.5 0 00-.5-.5H5v-.293L8.207 2.5 9.208 5.5z"/>
                  </svg>
                </button>
                
                <button 
                  v-if="variable.source === 'custom'"
                  class="theme-manager-button-danger text-sm inline-flex items-center gap-1"
                  @click="deleteVariable(variable.name)"
                  :title="t('common.delete')"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M6.5 1h3a.5.5 0 01.5.5v1H6v-1a.5.5 0 01.5-.5zM11 2.5v-1A1.5 1.5 0 009.5 0h-3A1.5 1.5 0 005 1.5v1H2.506a.58.58 0 000 1.152H3.5l.5 9A1.5 1.5 0 005.5 14h5a1.5 1.5 0 001.5-1.348l.5-9h.994a.58.58 0 000-1.152H11zM4.988 3.684L5.5 12.5a.5.5 0 00.5.5h4a.5.5 0 00.5-.5l.512-8.816H4.988z"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <div v-if="allVariables.length === 0" class="p-8 text-center theme-manager-text-secondary">
              <p>{{ t('variables.management.noVariables') }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 弹窗底部 -->
      <div class="flex items-center justify-between p-6 border-t theme-manager-border flex-none">
        <div class="text-sm theme-manager-text-secondary">
          {{ t('variables.management.totalCount', { count: allVariables.length }) }}
        </div>
        <button class="theme-manager-button-secondary" @click="close">
          {{ t('common.close') }}
        </button>
      </div>
    </div>

    <!-- 添加/编辑变量子弹窗 -->
    <VariableEditor
      v-if="showEditor"
      :variable="editingVariable"
      :existing-names="existingVariableNames"
      @save="onVariableSave"
      @cancel="onEditorCancel"
    />

    <!-- 导入弹窗 -->
    <VariableImporter
      v-if="showImporter"
      @import="onVariablesImport"
      @cancel="showImporter = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Variable } from '../types/variable'
import type { VariableManagerHooks } from '../composables/useVariableManager'
import VariableEditor from './VariableEditor.vue'
import VariableImporter from './VariableImporter.vue'

const { t } = useI18n()

interface Props {
  visible: boolean
  variableManager: VariableManagerHooks | null
  focusVariable?: string  // 要聚焦编辑的变量名
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  'close': []
}>()

// 状态管理
const loading = ref(false)
const showEditor = ref(false)
const showImporter = ref(false)
const editingVariable = ref<Variable | null>(null)

// 计算属性
const allVariables = computed(() => {
  if (!props.variableManager?.variableManager.value) return []
  
  // 获取所有变量并构建Variable对象
  try {
    const variables = props.variableManager.variableManager.value.resolveAllVariables()
    return Object.entries(variables).map(([name, value]) => ({
      name,
      value,
      source: props.variableManager.variableManager.value!.getVariableSource(name)
    }))
  } catch (error) {
    console.error('[VariableManagerModal] Failed to resolve variables:', error)
    return []
  }
})

const existingVariableNames = computed(() => {
  return allVariables.value.map(v => v.name)
})

// 工具函数
const truncateValue = (value: string, maxLength: number = 60): string => {
  if (value.length <= maxLength) return value
  return value.substring(0, maxLength) + '...'
}

const formatVariableName = (name: string): string => {
  return `{{${name}}}`
}

// 事件处理 - 修复弹窗层级问题
const close = () => {
  emit('update:visible', false)
  emit('close')
}

const onOverlayClick = (event: MouseEvent) => {
  // 只有点击蒙层本身才关闭弹窗，避免子弹窗的点击事件冒泡
  if (event.target === event.currentTarget) {
    close()
  }
}

const showAddVariable = () => {
  editingVariable.value = null
  showEditor.value = true
}

const editVariable = (variable: Variable) => {
  editingVariable.value = variable
  showEditor.value = true
}

const deleteVariable = async (name: string) => {
  if (!props.variableManager?.variableManager.value) return
  
  if (confirm(t('variables.management.deleteConfirm', { name }))) {
    try {
      loading.value = true
      props.variableManager.deleteVariable(name)
    } catch (error: unknown) {
      console.error('[VariableManagerModal] Failed to delete variable:', error)
    } finally {
      loading.value = false
    }
  }
}

const onVariableSave = async (variable: { name: string; value: string }) => {
  if (!props.variableManager?.variableManager.value) return
  
  try {
    loading.value = true
    props.variableManager.addVariable(variable.name, variable.value)
    showEditor.value = false
    editingVariable.value = null
  } catch (error: unknown) {
    console.error('[VariableManagerModal] Failed to save variable:', error)
    // 错误处理由子组件处理
  } finally {
    loading.value = false
  }
}

const onEditorCancel = () => {
  showEditor.value = false
  editingVariable.value = null
}

const exportVariables = () => {
  if (!props.variableManager?.variableManager.value) return
  
  try {
    const customVariables = props.variableManager.variableManager.value.listCustomVariables()
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      variables: customVariables
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `variables_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (error: unknown) {
    console.error('[VariableManagerModal] Failed to export variables:', error)
  }
}

const showImportModal = () => {
  showImporter.value = true
}

const onVariablesImport = (variables: Record<string, string>) => {
  if (!props.variableManager) return
  
  try {
    loading.value = true
    Object.entries(variables).forEach(([name, value]) => {
      props.variableManager!.addVariable(name, value)
    })
    showImporter.value = false
  } catch (error: unknown) {
    console.error('[VariableManagerModal] Failed to import variables:', error)
  } finally {
    loading.value = false
  }
}

// 监听visible变化，处理ESC键
watch(() => props.visible, (visible) => {
  if (visible) {
    document.addEventListener('keydown', onKeydown)
    // 如果有指定要聚焦的变量，自动打开编辑器
    if (props.focusVariable) {
      const targetVariable = allVariables.value.find(v => v.name === props.focusVariable)
      if (targetVariable) {
        editingVariable.value = targetVariable
        showEditor.value = true
      } else {
        // 如果变量不存在，创建新变量
        editingVariable.value = {
          name: props.focusVariable,
          value: '',
          source: 'custom'
        }
        showEditor.value = true
      }
    }
  } else {
    document.removeEventListener('keydown', onKeydown)
  }
})

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    close()
  }
}
</script>

<style scoped>
/* 移除所有自定义样式，完全依赖 theme.css 中的主题类 */
</style>
