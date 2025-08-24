<template>
  <NModal 
    v-model:show="localVisible" 
    :mask-closable="!showEditor && !showImporter"
    preset="card" 
    :title="t('variables.management.title')"
    size="huge"
    :segmented="{ content: true }"
    style="width: 90vw; max-width: 1200px;"
    @after-leave="$emit('close')"
  >

    <!-- 工具栏 -->
    <NSpace justify="space-between" class="mb-4">
      <NButton 
        type="primary"
        @click="showAddVariable"
        :disabled="loading"
      >
        <template #icon>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5A.5.5 0 018 2z"/>
          </svg>
        </template>
        {{ t('variables.management.addVariable') }}
      </NButton>
      
      <NSpace>
        <NButton 
          @click="showImportModal"
          :disabled="loading"
        >
          {{ t('variables.management.import') }}
        </NButton>
        
        <NButton 
          @click="exportVariables"
          :disabled="loading"
        >
          {{ t('variables.management.export') }}
        </NButton>
      </NSpace>
    </NSpace>

    <!-- 变量列表 -->
    <NDataTable
      :columns="tableColumns"
      :data="allVariables"
      :max-height="400"
      :bordered="false"
      size="small"
      :row-props="() => ({ style: 'cursor: pointer;' })"
    />

    <template #footer>
      <NSpace justify="space-between">
        <div class="text-sm text-gray-500">
          {{ t('variables.management.totalCount', { count: allVariables.length }) }}
        </div>
        <NButton @click="close">
          {{ t('common.close') }}
        </NButton>
      </NSpace>
    </template>

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
  </NModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { NModal, NButton, NSpace, NCard, NTag, NDataTable } from 'naive-ui'
import type { Variable } from '../types/variable'
import type { VariableManagerHooks } from '../composables/useVariableManager'
import type { DataTableColumns } from 'naive-ui'
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

// 双向绑定本地可见状态
const localVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

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

// 表格列配置
const tableColumns = computed<DataTableColumns<Variable>>(() => [
  {
    title: t('variables.management.variableName'),
    key: 'name',
    width: 200,
    render: (row: Variable) => {
      return h(NTag, 
        { size: 'small', type: 'default' },
        { default: () => formatVariableName(row.name) }
      )
    }
  },
  {
    title: t('variables.management.value'),
    key: 'value',
    ellipsis: {
      tooltip: true
    },
    render: (row: Variable) => {
      return h('span', 
        { class: 'text-sm' },
        truncateValue(row.value)
      )
    }
  },
  {
    title: t('variables.management.sourceLabel'),
    key: 'source',
    width: 120,
    render: (row: Variable) => {
      return h(NTag, 
        { 
          size: 'small', 
          type: row.source === 'predefined' ? 'info' : 'success'
        },
        { default: () => t(`variables.management.source.${row.source}`) }
      )
    }
  },
  {
    title: t('common.actions'),
    key: 'actions',
    width: 120,
    render: (row: Variable) => {
      if (row.source !== 'custom') return null
      
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(NButton, 
            {
              size: 'small',
              quaternary: true,
              title: t('common.edit'),
              onClick: () => editVariable(row)
            },
            {
              icon: () => h('svg', 
                { 
                  width: '16', 
                  height: '16', 
                  viewBox: '0 0 16 16', 
                  fill: 'currentColor' 
                },
                h('path', { 
                  d: 'M12.146.146a.5.5 0 01.708 0l3 3a.5.5 0 010 .708L9.708 9.708a.5.5 0 01-.168.11l-5 2a.5.5 0 01-.65-.65l2-5a.5.5 0 01.11-.168L12.146.146z' 
                })
              )
            }
          ),
          h(NButton, 
            {
              size: 'small',
              quaternary: true,
              type: 'error',
              title: t('common.delete'),
              onClick: () => deleteVariable(row.name)
            },
            {
              icon: () => h('svg', 
                { 
                  width: '16', 
                  height: '16', 
                  viewBox: '0 0 16 16', 
                  fill: 'currentColor' 
                },
                h('path', { 
                  d: 'M6.5 1h3a.5.5 0 01.5.5v1H6v-1a.5.5 0 01.5-.5zM11 2.5v-1A1.5 1.5 0 009.5 0h-3A1.5 1.5 0 005 1.5v1H2.506a.58.58 0 000 1.152H3.5l.5 9A1.5 1.5 0 005.5 14h5a1.5 1.5 0 001.5-1.348l.5-9h.994a.58.58 0 000-1.152H11z' 
                })
              )
            }
          )
        ]
      })
    }
  }
])

// 工具函数
const truncateValue = (value: string, maxLength: number = 60): string => {
  if (value.length <= maxLength) return value
  return value.substring(0, maxLength) + '...'
}

const formatVariableName = (name: string): string => {
  return `{{${name}}}`
}

// 事件处理
const close = () => {
  localVisible.value = false
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

// 监听visible变化，处理焦点变量
watch(() => props.visible, (visible) => {
  if (visible && props.focusVariable) {
    // 如果有指定要聚焦的变量，自动打开编辑器
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
})
</script>

<style scoped>
/* Pure Naive UI implementation - no custom theme CSS needed */
</style>
