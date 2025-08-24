<template>
  <div class="context-editor-fullscreen h-screen w-screen">
    <!-- 顶部工具栏 -->
    <NCard class="editor-header" size="small" :bordered="false">
      <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <h3 class="text-xl font-semibold">上下文编辑器</h3>
        <NSpace size="small">
          <NTag size="small" type="info">{{ messages.length }} 条消息</NTag>
          <NTag v-if="messages.length > 0" size="small" type="success" :title="allUsedVariables.length > 0 ? `使用的变量: ${allUsedVariables.join(', ')}` : '暂无使用变量'">
            变量: {{ allUsedVariables.length }}
          </NTag>
        </NSpace>
      </div>
      
      <NSpace size="small">
        <!-- 导入导出按钮 -->
        <NButton
          @click="showImportDialog = true"
          size="small"
          secondary
          title="导入数据"
        >
          导入
        </NButton>
        
        <NButton
          @click="showExportDialog = true"
          size="small"
          secondary
          :disabled="messages.length === 0"
          title="导出数据"
        >
          导出
        </NButton>
        
        <NButton
          @click="addMessage"
          size="small"
          type="primary"
          title="添加消息"
        >
          添加消息
        </NButton>

        <!-- 保存和关闭 -->
        <NDivider vertical />
        <NButtonGroup>
          <NButton
            @click="handleSave"
            size="small"
            type="success"
          >
            保存
          </NButton>
          <NButton
            @click="handleClose"
            size="small"
            secondary
          >
            关闭
          </NButton>
        </NButtonGroup>
      </NSpace>
      </div>
    </NCard>

    <!-- 主编辑区域 -->
    <div class="editor-content flex-1 overflow-hidden flex flex-col">
      <div class="flex-1 p-6 overflow-y-auto">
        <!-- 空状态 -->
        <div v-if="messages.length === 0" class="empty-state text-center py-16">
          <NCard size="large" class="max-w-md mx-auto">
            <div class="text-center">
              <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.471L3 21l2.471-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
              </svg>
              <h3 class="text-xl font-semibold mb-2">开始编辑上下文</h3>
              <p class="text-sm mb-4">添加消息来构建对话上下文，支持变量提取和模板化</p>
              <NButton
                @click="addMessage"
                type="primary"
                size="medium"
              >
                添加第一条消息
              </NButton>
            </div>
          </NCard>
        </div>

        <!-- 消息列表 -->
        <div v-else class="w-full space-y-4">
          <NCard
            v-for="(message, index) in messages"
            :key="`message-${index}`"
            size="medium"
            class="message-item"
          >
            <!-- 消息头部 -->
            <div class="message-header flex items-center justify-between mb-3">
              <NSpace size="medium" align="center">
                <NTag size="small" type="default">#{{ index + 1 }}</NTag>
                <NSelect 
                  v-model:value="message.role"
                  size="small"
                  style="width: 100px"
                  :options="[
                    { label: '系统', value: 'system' },
                    { label: '用户', value: 'user' },
                    { label: '助手', value: 'assistant' }
                  ]"
                />
                
                <!-- 变量信息显示 -->
                <NSpace v-if="getMessageVariables(index).detected.length > 0" size="small">
                  <NTag size="tiny" type="info">
                    变量: {{ getMessageVariables(index).detected.length }}
                  </NTag>
                  <NTag v-if="getMessageVariables(index).missing.length > 0" size="tiny" type="warning">
                    缺失: {{ getMessageVariables(index).missing.length }}
                  </NTag>
                </NSpace>
              </NSpace>
              
              <NButtonGroup size="small">
                <!-- 预览切换按钮 -->
                <NButton
                  @click="togglePreview(index)"
                  :type="previewMode[index] ? 'primary' : 'default'"
                  title="切换预览"
                >
                  👁️
                </NButton>
                <NButton
                  v-if="index > 0"
                  @click="moveMessage(index, -1)"
                  title="上移"
                >
                  ↑
                </NButton>
                <NButton
                  v-if="index < messages.length - 1"
                  @click="moveMessage(index, 1)"
                  title="下移"
                >
                  ↓
                </NButton>
                <NButton
                  @click="deleteMessage(index)"
                  :disabled="messages.length <= 1"
                  type="error"
                  title="删除"
                >
                  🗑️
                </NButton>
              </NButtonGroup>
            </div>

            <!-- 消息内容编辑区 -->
            <div class="message-content relative">
              <!-- 编辑模式 -->
              <div v-if="!previewMode[index]">
                <NInput
                  v-model:value="message.content"
                  type="textarea"
                  :placeholder="getPlaceholderText(message.role)"
                  :autosize="{ minRows: 5, maxRows: 20 }"
                  @select="handleTextSelection($event, index)"
                />
              </div>
              
            </div>
          </NCard>
        </div>
      </div>
    </div>

    <!-- 工具管理面板 -->
    <NCard v-if="tools.length > 0 || showToolsPanel" size="small" class="tools-panel">
      <div class="tools-header flex items-center justify-between mb-3">
        <NSpace align="center">
          <h4 class="text-base font-semibold">工具定义</h4>
          <NTag size="small" type="info">
            {{ tools.length }} 个工具
          </NTag>
        </NSpace>
        <NSpace size="small">
          <NButton
            @click="addNewTool"
            size="small"
            type="primary"
          >
            添加工具
          </NButton>
          <NButton
            @click="toggleToolsPanel"
            size="small"
            :type="showToolsPanel ? 'default' : 'primary'"
          >
            {{ showToolsPanel ? '收起' : '展开' }}
          </NButton>
        </NSpace>
      </div>
      
      <div v-if="showToolsPanel" class="tools-content space-y-3">
        <!-- 工具列表 -->
        <NCard v-for="(tool, index) in tools" :key="`tool-${index}`" size="small" class="tool-item">
          <div class="tool-header flex items-center justify-between mb-2">
            <NSpace align="center">
              <NTag type="primary" size="small">{{ tool.function.name }}</NTag>
            </NSpace>
            <NButtonGroup size="small">
              <NButton
                @click="editTool(index)"
                title="编辑工具"
              >
                ✏️
              </NButton>
              <NButton
                @click="copyTool(index)"
                title="复制工具"
              >
                📋
              </NButton>
              <NButton
                @click="deleteTool(index)"
                type="error"
                title="删除工具"
              >
                🗑️
              </NButton>
            </NButtonGroup>
          </div>
          <div class="tool-description text-xs mb-2">
            {{ tool.function.description || '无描述' }}
          </div>
          <div class="text-xs">
            <NTag size="tiny">参数: {{ Object.keys(tool.function.parameters?.properties || {}).length }} 个</NTag>
          </div>
        </NCard>
        
        <!-- 空状态 -->
        <div v-if="tools.length === 0" class="empty-tools text-center py-8">
          <NCard size="large">
            <div class="text-center">
              <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p class="text-sm mb-3">尚未定义工具</p>
              <p class="text-xs">工具可以让AI调用外部功能，如搜索、计算、API调用等</p>
            </div>
          </NCard>
        </div>
      </div>
    </NCard>

    <!-- 导入对话框 -->
    <NModal 
      v-model:show="showImportDialog" 
      preset="dialog" 
      title="导入数据"
      style="width: 600px"
    >
      <template #default>
        <!-- 格式选择 -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">导入格式：</label>
          <NSpace size="small" class="mb-2">
            <NButton
              v-for="format in importFormats"
              :key="format.id"
              @click="selectedImportFormat = format.id"
              size="small"
              :type="selectedImportFormat === format.id ? 'primary' : 'default'"
            >
              {{ format.name }}
            </NButton>
          </NSpace>
          <p class="text-xs text-gray-500">
            {{ importFormats.find(f => f.id === selectedImportFormat)?.description }}
          </p>
        </div>

        <!-- 文件上传或文本输入 -->
        <div class="mb-4">
          <NSpace size="small" class="mb-2">
            <input
              type="file"
              ref="fileInput"
              accept=".json,.txt"
              @change="handleFileUpload"
              class="hidden"
            >
            <NButton
              @click="fileInput?.click()"
              size="small"
            >
              选择文件
            </NButton>
            <span class="text-sm text-gray-500">或在下方粘贴文本</span>
          </NSpace>
        </div>

        <NInput
          v-model:value="importData"
          type="textarea"
          :autosize="{ minRows: 10, maxRows: 10 }"
          :placeholder="getImportPlaceholder()"
          class="font-mono text-sm"
        />
        <div v-if="importError" class="text-sm text-red-500 mt-2">
          {{ importError }}
        </div>
      </template>
      <template #action>
        <NSpace justify="end">
          <NButton @click="showImportDialog = false">取消</NButton>
          <NButton 
            @click="handleImport" 
            :disabled="!importData.trim()"
            type="primary"
          >
            导入
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- 导出对话框 -->
    <NModal 
      v-model:show="showExportDialog" 
      preset="dialog" 
      title="导出数据"
      style="width: 600px"
    >
      <template #default>
        <NInput
          :value="exportData"
          readonly
          type="textarea"
          :autosize="{ minRows: 10, maxRows: 10 }"
          class="font-mono text-sm"
        />
      </template>
      <template #action>
        <NSpace justify="end">
          <NButton @click="showExportDialog = false">关闭</NButton>
          <NButton @click="copyExportData" type="primary">复制</NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- 工具编辑对话框 -->
    <NModal 
      v-model:show="showToolEditDialog" 
      preset="card" 
      :title="editingToolIndex >= 0 ? '编辑工具' : '新建工具'"
      style="width: 800px; max-height: 80vh"
      size="huge"
      :bordered="false"
      :segmented="false"
    >
      <template #default>
        <!-- 工具编辑表单 -->
        <div class="space-y-4 overflow-y-auto" style="max-height: 60vh">
          <!-- 基础信息 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">函数名称 *</label>
              <NInput
                v-model:value="editingTool.function.name"
                placeholder="例如: search_web"
                :status="toolValidationErrors.name ? 'error' : undefined"
              />
              <p v-if="toolValidationErrors.name" class="text-xs text-red-500 mt-1">
                {{ toolValidationErrors.name }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">函数描述</label>
              <NInput
                v-model:value="editingTool.function.description"
                placeholder="例如: 在网络上搜索信息"
              />
            </div>
          </div>
          
          <!-- 参数定义 -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <label class="block text-sm font-medium">参数定义 (JSON Schema)</label>
              <NSpace size="small">
                <NButton
                  @click="addParameterExample"
                  size="small"
                  title="添加示例参数"
                >
                  + 示例
                </NButton>
                <NButton
                  @click="validateToolParameters"
                  size="small"
                  title="验证JSON格式"
                >
                  验证
                </NButton>
              </NSpace>
            </div>
            
            <NInput
              v-model:value="toolParametersJson"
              type="textarea"
              :autosize="{ minRows: 12, maxRows: 12 }"
              :status="toolValidationErrors.parameters ? 'error' : undefined"
              placeholder="请输入JSON Schema格式的参数定义..."
              @input="updateToolParameters"
              class="font-mono text-sm"
            />
            <p v-if="toolValidationErrors.parameters" class="text-xs text-red-500 mt-1">
              {{ toolValidationErrors.parameters }}
            </p>
          </div>
          
          <!-- 预览区域 -->
          <div>
            <label class="block text-sm font-medium mb-2">工具预览</label>
            <NCard size="small" embedded>
              <pre class="text-xs whitespace-pre-wrap">{{ getToolPreview() }}</pre>
            </NCard>
          </div>
        </div>
      </template>
      <template #action>
        <NSpace justify="end">
          <NButton @click="showToolEditDialog = false">取消</NButton>
          <NButton 
            @click="saveEditingTool" 
            :disabled="!isToolValid"
            type="primary"
          >
            {{ editingToolIndex >= 0 ? '保存' : '创建' }}
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { NCard, NButton, NTag, NModal, NInput, NDivider, NSelect, NSpace, NButtonGroup } from 'naive-ui'
import { useClipboard } from '../composables/useClipboard'
import { useContextEditor } from '../composables/useContextEditor'
import type { StandardPromptData, StandardMessage, ToolDefinition } from '../types'

const { copyText } = useClipboard()
const contextEditor = useContextEditor()

interface Props {
  initialData?: StandardPromptData | null
  availableVars?: Record<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  availableVars: () => ({})
})

const emit = defineEmits<{
  close: [data?: StandardPromptData]
  save: [data: StandardPromptData]
  'create-variable': [name: string, defaultValue?: string]
}>()

// 状态
const messages = ref<StandardMessage[]>([])
const tools = ref<ToolDefinition[]>([])
const showImportDialog = ref(false)
const showExportDialog = ref(false)
const importData = ref('')
const importError = ref('')
const selectedImportFormat = ref('conversation')
const fileInput = ref<HTMLInputElement | null>(null)

// 工具编辑器状态
const showToolEditDialog = ref(false)
const editingToolIndex = ref(-1)
const editingTool = ref<ToolDefinition>({
  type: 'function',
  function: {
    name: '',
    description: '',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
})
const toolParametersJson = ref('')
const toolValidationErrors = ref<Record<string, string>>({})

// 导入格式选项
const importFormats = [
  {
    id: 'conversation',
    name: '会话格式',
    description: '标准的会话消息格式，包含 role 和 content 字段'
  },
  {
    id: 'langfuse',
    name: 'LangFuse',
    description: 'LangFuse 追踪数据格式，自动提取消息和变量'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI API 请求格式，支持工具调用'
  },
  {
    id: 'smart',
    name: '智能识别',
    description: '自动检测格式并转换'
  }
]

// 变量提取相关状态
const selectedText = ref('')
const selectedMessageIndex = ref(-1)
const selectedVariableName = ref('')
const variableSuggestions = ref<Array<{ name: string; confidence: number }>>([])
const textSelection = ref<{ start: number; end: number } | null>(null)

// 变量检测和预览相关
const previewMode = ref<Record<number, boolean>>({})
const availableVariables = ref<Record<string, string>>({})

// 工具管理相关状态
const showToolsPanel = ref(true) // 默认展开，有工具时显示

// 变量扫描函数
const scanVariables = (content: string): string[] => {
  const matches = content.match(/\{\{\s*([^}]+)\s*\}\}/g)
  if (!matches) return []
  
  return matches.map(match => {
    const varName = match.replace(/\{\{\s*|\s*\}\}/g, '')
    return varName
  })
}


// 检测指定消息的变量
const getMessageVariables = (messageIndex: number) => {
  const message = messages.value[messageIndex]
  if (!message) return { detected: [], missing: [] }
  
  const detected = scanVariables(message.content)
  const missing = detected.filter(varName => 
    availableVariables.value[varName] === undefined
  )
  
  return { detected, missing }
}

// 替换变量内容用于预览
const replaceVariables = (content: string, variables?: Record<string, string>): string => {
  const vars = variables || availableVariables.value
  
  return content.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, varName) => {
    const trimmedName = varName.trim()
    if (vars[trimmedName] !== undefined) {
      return vars[trimmedName]
    }
    return match // 保持原样如果变量不存在
  })
}



// 生成预览HTML（包含高亮）
const getPreviewHtml = (messageIndex: number): string => {
  const message = messages.value[messageIndex]
  if (!message) return ''
  
  const replaced = replaceVariables(message.content, availableVariables.value)
  
  return replaced
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const trimmedName = varName.trim()
      if (availableVariables.value[trimmedName] !== undefined) {
        return `<span class="variable-replaced">${availableVariables.value[trimmedName]}</span>`
      } else {
        return `<span class="variable-missing">${match}</span>`
      }
    })
}

// 初始化数据
onMounted(() => {
  if (props.initialData && props.initialData.messages) {
    messages.value = [...props.initialData.messages]
  }
  if (props.initialData && props.initialData.tools) {
    tools.value = [...props.initialData.tools]
  }
  // 初始化可用变量
  availableVariables.value = { ...props.availableVars }
})

// 监听可用变量变化
watch(() => props.availableVars, (newVars) => {
  availableVariables.value = { ...newVars }
}, { deep: true })

// 计算属性
const allUsedVariables = computed(() => {
  const variables = new Set<string>()
  
  // 扫描消息中的变量
  messages.value.forEach(message => {
    const messageVars = scanVariables(message.content)
    messageVars.forEach(v => variables.add(v))
  })
  
  
  return Array.from(variables)
})

const exportData = computed(() => {
  const data: StandardPromptData = {
    messages: messages.value,
    tools: tools.value.length > 0 ? tools.value : undefined,
    metadata: {
      source: 'context_editor',
      variables: {},
      tools_count: tools.value.length,
      exported_at: new Date().toISOString()
    }
  }
  return JSON.stringify(data, null, 2)
})

// 方法
const getPlaceholderText = (role: string) => {
  switch (role) {
    case 'system':
      return '请输入系统消息（定义AI行为和上下文）...'
    case 'user':
      return '请输入用户消息（您的输入或问题）...'
    case 'assistant':
      return '请输入助手消息（AI的回复）...'
    default:
      return '请输入消息内容...'
  }
}

const addMessage = () => {
  messages.value.push({
    role: 'user',
    content: ''
  })
}

const deleteMessage = (index: number) => {
  if (messages.value.length > 1) {
    messages.value.splice(index, 1)
  }
}

const moveMessage = (index: number, direction: number) => {
  const newIndex = index + direction
  if (newIndex >= 0 && newIndex < messages.value.length) {
    const temp = messages.value[index]
    messages.value[index] = messages.value[newIndex]
    messages.value[newIndex] = temp
  }
}

const autoResize = (textarea: HTMLTextAreaElement) => {
  textarea.style.height = 'auto'
  textarea.style.height = Math.max(120, textarea.scrollHeight) + 'px'
}

// 工具管理方法
const toggleToolsPanel = () => {
  showToolsPanel.value = !showToolsPanel.value
}

const addNewTool = () => {
  resetToolEditor()
  showToolEditDialog.value = true
}

const deleteTool = (index: number) => {
  if (confirm('确定要删除这个工具吗？')) {
    tools.value.splice(index, 1)
  }
}

const copyTool = (index: number) => {
  const originalTool = tools.value[index]
  const copiedTool: ToolDefinition = {
    type: 'function',
    function: {
      name: `${originalTool.function.name}_copy`,
      description: originalTool.function.description,
      parameters: JSON.parse(JSON.stringify(originalTool.function.parameters || {}))
    }
  }
  tools.value.splice(index + 1, 0, copiedTool)
}

const editTool = (index: number) => {
  editingToolIndex.value = index
  const tool = tools.value[index]
  editingTool.value = {
    type: 'function',
    function: {
      name: tool.function.name,
      description: tool.function.description || '',
      parameters: JSON.parse(JSON.stringify(tool.function.parameters || {
        type: 'object',
        properties: {},
        required: []
      }))
    }
  }
  toolParametersJson.value = JSON.stringify(editingTool.value.function.parameters, null, 2)
  toolValidationErrors.value = {}
  showToolEditDialog.value = true
}

// 工具编辑器方法
const updateToolParameters = () => {
  try {
    const parsed = JSON.parse(toolParametersJson.value)
    editingTool.value.function.parameters = parsed
    if (toolValidationErrors.value.parameters) {
      delete toolValidationErrors.value.parameters
    }
  } catch (error) {
    // JSON解析错误，但不立即显示错误，等验证时显示
  }
}

const validateToolParameters = () => {
  toolValidationErrors.value = {}
  
  // 验证函数名
  if (!editingTool.value.function.name.trim()) {
    toolValidationErrors.value.name = '函数名称不能为空'
  } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(editingTool.value.function.name)) {
    toolValidationErrors.value.name = '函数名称只能包含字母、数字和下划线，且不能以数字开头'
  }
  
  // 验证参数JSON
  if (toolParametersJson.value.trim()) {
    try {
      const parsed = JSON.parse(toolParametersJson.value)
      editingTool.value.function.parameters = parsed
    } catch (error) {
      toolValidationErrors.value.parameters = `JSON格式错误: ${error.message}`
    }
  }
  
  return Object.keys(toolValidationErrors.value).length === 0
}

const addParameterExample = () => {
  const example = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索查询词'
      },
      count: {
        type: 'number',
        description: '返回结果数量',
        default: 10
      }
    },
    required: ['query']
  }
  toolParametersJson.value = JSON.stringify(example, null, 2)
  updateToolParameters()
}

const isToolValid = computed(() => {
  return editingTool.value.function.name.trim() !== '' && 
         !/\S/.test(toolValidationErrors.value.name || '') &&
         !/\S/.test(toolValidationErrors.value.parameters || '')
})

const getToolPreview = () => {
  return JSON.stringify(editingTool.value, null, 2)
}

const saveEditingTool = () => {
  if (!validateToolParameters()) {
    return
  }
  
  if (editingToolIndex.value >= 0) {
    // 更新现有工具
    tools.value[editingToolIndex.value] = { ...editingTool.value }
  } else {
    // 添加新工具
    tools.value.push({ ...editingTool.value })
  }
  
  showToolEditDialog.value = false
  resetToolEditor()
}

const resetToolEditor = () => {
  editingToolIndex.value = -1
  // 🆕 提供内置天气获取工具作为默认示例
  editingTool.value = {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather information for a specific location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The location to get weather for (e.g., "Beijing", "New York")'
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'Temperature unit',
            default: 'celsius'
          }
        },
        required: ['location']
      }
    }
  }
  toolParametersJson.value = JSON.stringify(editingTool.value.function.parameters, null, 2)
  toolValidationErrors.value = {}
}

// 切换预览模式
const togglePreview = (messageIndex: number) => {
  previewMode.value[messageIndex] = !previewMode.value[messageIndex]
}

// 创建缺失变量
const createMissingVariable = (variableName: string) => {
  // 生成默认值
  let defaultValue = ''
  if (variableName.toLowerCase().includes('name')) {
    defaultValue = 'Example Name'
  } else if (variableName.toLowerCase().includes('question')) {
    defaultValue = 'Your question here'
  } else if (variableName.toLowerCase().includes('description')) {
    defaultValue = 'Description here'
  } else {
    defaultValue = `Value for ${variableName}`
  }
  
  emit('create-variable', variableName, defaultValue)
}

// 文本选择处理
const handleTextSelection = (event: Event, messageIndex: number) => {
  const textarea = event.target as HTMLTextAreaElement
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  
  if (start !== end) {
    selectedText.value = textarea.value.substring(start, end)
    selectedMessageIndex.value = messageIndex
    textSelection.value = { start, end }
    selectedVariableName.value = ''
    
    // 生成变量名建议
    variableSuggestions.value = contextEditor.suggestVariableNames(selectedText.value)
    if (variableSuggestions.value.length > 0) {
      selectedVariableName.value = variableSuggestions.value[0].name
    }
  }
}

const extractSelectedVariable = () => {
  if (!selectedText.value || !selectedVariableName.value.trim() || !textSelection.value) {
    return
  }
  
  const message = messages.value[selectedMessageIndex.value]
  const { start, end } = textSelection.value
  
  // 替换选中文本为变量占位符
  const before = message.content.substring(0, start)
  const after = message.content.substring(end)
  message.content = before + `{{${selectedVariableName.value}}}` + after
  
  // 发出创建变量事件，这样变量会被注入到变量管理系统中
  emit('create-variable', selectedVariableName.value, selectedText.value)
  
  cancelVariableExtraction()
}

const cancelVariableExtraction = () => {
  selectedText.value = ''
  selectedMessageIndex.value = -1
  selectedVariableName.value = ''
  variableSuggestions.value = []
  textSelection.value = null
}

const handleImport = () => {
  try {
    let data: any
    
    // 根据选择的格式处理数据
    switch (selectedImportFormat.value) {
      case 'smart':
        // 使用智能导入
        const result = contextEditor.smartImport(JSON.parse(importData.value))
        if (result.success && result.data) {
          // 转换为会话格式
          const importedMessages = result.data.messages.map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content
          }))
          messages.value = importedMessages
          // 导入工具数据
          if (result.data.tools) {
            tools.value = [...result.data.tools]
          }
        } else {
          throw new Error(result.error || '智能导入失败')
        }
        break
        
      case 'langfuse':
        // LangFuse 格式导入
        const langfuseResult = contextEditor.convertFromLangFuse(JSON.parse(importData.value))
        if (langfuseResult.success && langfuseResult.data) {
          const importedMessages = langfuseResult.data.messages.map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content
          }))
          messages.value = importedMessages
          // 导入工具数据
          if (langfuseResult.data.tools) {
            tools.value = [...langfuseResult.data.tools]
          }
        } else {
          throw new Error(langfuseResult.error || 'LangFuse 导入失败')
        }
        break
        
      case 'openai':
        // OpenAI 格式导入
        const openaiResult = contextEditor.convertFromOpenAI(JSON.parse(importData.value))
        if (openaiResult.success && openaiResult.data) {
          const importedMessages = openaiResult.data.messages.map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content
          }))
          messages.value = importedMessages
          // 导入工具数据
          if (openaiResult.data.tools) {
            tools.value = [...openaiResult.data.tools]
          }
        } else {
          throw new Error(openaiResult.error || 'OpenAI 导入失败')
        }
        break
        
      case 'conversation':
      default:
        // 标准会话格式
        data = JSON.parse(importData.value)
        
        if (!Array.isArray(data.messages)) {
          throw new Error('Invalid format: messages must be an array')
        }
        
        // 验证消息格式
        for (const message of data.messages) {
          if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
            throw new Error(`Invalid message role: ${message.role}`)
          }
          if (typeof message.content !== 'string') {
            throw new Error('Invalid message content: must be string')
          }
        }
        
        messages.value = data.messages
        // 导入工具数据（如果存在）
        if (data.tools) {
          tools.value = [...data.tools]
        }
        break
    }
    
    importData.value = ''
    importError.value = ''
    showImportDialog.value = false
    
    console.log('[ContextEditor] Messages imported successfully')
  } catch (error) {
    importError.value = error.message || '导入失败'
    console.error('[ContextEditor] Failed to import messages:', error)
  }
}

const copyExportData = async () => {
  try {
    await copyText(exportData.value)
    showExportDialog.value = false
  } catch (error) {
    console.error('复制失败:', error)
  }
}

const handleSave = () => {
  const data: StandardPromptData = {
    messages: messages.value,
    tools: tools.value.length > 0 ? tools.value : undefined,
    metadata: {
      source: 'context_editor',
      variables: {},
      tools_count: tools.value.length,
      saved_at: new Date().toISOString()
    }
  }
  emit('save', data)
}

const handleClose = () => {
  emit('close')
}

// 文件上传处理
const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    importData.value = e.target?.result as string
  }
  reader.readAsText(file)
}

// 获取导入占位符
const getImportPlaceholder = () => {
  switch (selectedImportFormat.value) {
    case 'langfuse':
      return 'LangFuse 追踪数据，例如：\n{\n  "input": {\n    "messages": [...]\n  },\n  "output": {...}\n}'
    case 'openai':
      return 'OpenAI API 请求格式，例如：\n{\n  "messages": [...],\n  "model": "gpt-4",\n  "tools": [...]\n}'
    case 'smart':
      return '粘贴任意支持格式的 JSON 数据，系统将自动识别'
    default:
      return '标准会话格式，例如：\n{\n  "messages": [\n    {"role": "system", "content": "..."},\n    {"role": "user", "content": "..."}\n  ]\n}'
  }
}

// 监听文本区域自动调整高度
watch(messages, () => {
  nextTick(() => {
    const textareas = document.querySelectorAll('textarea')
    textareas.forEach(textarea => {
      autoResize(textarea as HTMLTextAreaElement)
    })
  })
}, { deep: true })
</script>

<style scoped>
.context-editor-fullscreen {
  display: flex;
  flex-direction: column;
}

.editor-content {
  flex: 1;
  min-height: 0;
}

.message-item {
  position: relative;
}

.variable-extraction-panel {
  width: 320px;
  min-width: 280px;
}

/* 变量高亮 */
:deep(.variable-replaced) {
  background-color: rgba(22, 101, 52, 0.2);
  color: #166534;
  padding: 0 0.25rem;
  border-radius: 0.25rem;
}

:deep(.variable-missing) {
  background-color: rgba(220, 38, 38, 0.2);
  color: #dc2626;
  padding: 0 0.25rem;
  border-radius: 0.25rem;
}

.dark :deep(.variable-replaced) {
  background-color: rgba(22, 101, 52, 0.3);
  color: #86efac;
}

.dark :deep(.variable-missing) {
  background-color: rgba(220, 38, 38, 0.3);
  color: #fca5a5;
}
</style>