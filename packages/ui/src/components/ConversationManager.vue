<template>
  <NCard class="conversation-manager" size="small">
    <!-- 紧凑型头部：一行显示标题、消息数量和操作按钮 -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-3">
        <h3 class="text-base font-semibold">
          上下文管理
        </h3>
        <NTag size="small" type="info">
          {{ t('conversation.messageCount', { count: messages.length }) }}
        </NTag>
        <!-- 变量和工具统计紧凑显示 -->
        <div v-if="messages.length > 0" class="flex items-center gap-2 text-xs text-gray-500">
          <span 
            class="flex items-center gap-1 cursor-help"
            :title="allUsedVariables.length > 0 ? `使用的变量: ${allUsedVariables.join(', ')}` : '暂无使用变量'"
          >
            <svg class="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            变量: {{ allUsedVariables.length }}
          </span>
          <span v-if="allMissingVariables.length > 0" class="flex items-center gap-1 text-amber-600">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            缺失: {{ allMissingVariables.length }}
          </span>
          <!-- 🆕 工具数量统计 -->
          <span 
            class="flex items-center gap-1 cursor-help"
            :title="currentTools.length > 0 ? `使用的工具: ${currentTools.map(t => t.function.name).join(', ')}` : '暂无使用工具'"
          >
            <svg class="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            工具: {{ currentTools.length }}
          </span>
        </div>
      </div>
      
      <!-- 操作按钮组 -->
      <div class="flex items-center gap-1">
        <!-- 快速模板下拉菜单 -->
        <NDropdown 
          :options="templateDropdownOptions"
          @select="handleTemplateDropdownSelect"
        >
          <NButton size="small" secondary>
            <template #icon>
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </template>
            {{ t('conversation.quickTemplates') }}
          </NButton>
        </NDropdown>
        
        <!-- 编辑按钮 -->
        <NButton
          v-if="messages.length > 0"
          @click="openContextEditor"
          size="small"
          type="primary"
          title="在全屏编辑器中编辑上下文和提取变量"
        >
          <template #icon>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </template>
          编辑
        </NButton>
        
        <!-- 导入按钮 -->
        <NButton
          @click="showImportDialog = true"
          size="small"
          secondary
        >
          {{ t('conversation.import') }}
        </NButton>
        
        <!-- 导出按钮 -->
        <NButton
          v-if="messages.length > 0"
          @click="showExportDialog = true"
          size="small"
          secondary
        >
          {{ t('conversation.export') }}
        </NButton>
        
        <!-- 同步到测试按钮 -->
        <NButton
          v-if="showSyncToTest && messages.length > 0"
          @click="handleSyncToTest"
          size="small"
          type="primary"
          title="将当前会话同步到测试区域"
        >
          <template #icon>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m0-4l-4-4" />
            </svg>
          </template>
          同步到测试
        </NButton>
        
        <!-- 折叠/展开按钮 -->
        <NButton
          v-if="collapsible"
          @click="toggleCollapse"
          size="small"
          secondary
          :title="isCollapsed ? t('common.expand', '展开') : t('common.collapse', '收起')"
        >
          <template #icon>
            <svg 
              class="w-3 h-3 transition-transform duration-200"
              :class="{ 'rotate-180': isCollapsed }"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </template>
        </NButton>
      </div>
    </div>

    <!-- 消息列表：限制最大高度并集成添加功能 -->
    <div v-if="!isCollapsed" class="conversation-container" :style="containerStyle">
      <!-- 滚动消息列表 -->
      <div class="message-list" :class="{ 'has-messages': messages.length > 0 }">
        <div v-if="messages.length === 0" class="empty-state">
          <div class="text-center py-8 text-gray-500">
            <svg class="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.471L3 21l2.471-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
            </svg>
            <p class="text-sm">{{ t('conversation.noMessages') }}</p>
          </div>
        </div>
        
        <div v-else>
          <ConversationMessageEditor
            v-for="(message, index) in messages"
            :key="`message-${index}`"
            :message="message"
            :index="index"
            :disabled="disabled"
            :can-move-up="index > 0"
            :can-move-down="index < messages.length - 1"
            :can-delete="messages.length > 1"
            :available-variables="availableVariables"
            :scan-variables="scanVariables"
            :is-predefined-variable="isPredefinedVariable"
            :replace-variables="replaceVariables"
            @update:message="updateMessage(index, $event)"
            @move-up="moveMessage(index, -1)"
            @move-down="moveMessage(index, 1)"
            @delete="deleteMessage(index)"
            @create-variable="handleCreateVariable"
            @open-variable-manager="handleOpenVariableManager"
          />
        </div>
      </div>
      
      <!-- 集成的添加消息行 -->
      <NCard size="small" :bordered="false" class="mt-2">
        <NSpace align="center" :wrap="false" size="small">
          <!-- 序号 -->
          <div class="w-6 text-center">
            <NText depth="3" class="text-xs font-mono">
              #{{ messages.length + 1 }}
            </NText>
          </div>
          
          <!-- 角色选择 -->
          <NSelect 
            v-model:value="newMessageRole" 
            :options="roleOptions"
            size="small"
            :disabled="disabled"
            style="width: 100px;"
          />
          
          <!-- 添加按钮 -->
          <div class="flex-1">
            <NButton
              @click="addMessage"
              :disabled="disabled"
              type="primary"
              size="small"
              dashed
              block
            >
              <template #icon>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </template>
              {{ t('conversation.addMessage') }}
            </NButton>
          </div>
          
          <!-- 操作区域占位 -->
          <div class="w-16"></div>
        </NSpace>
      </NCard>
    </div>


    <!-- 导出对话框 -->
    <NModal 
      v-model:show="showExportDialog" 
      preset="dialog" 
      :title="t('conversation.exportTitle')"
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
            {{ t('conversation.copyData') }}
          </NButton>
        </div>
      </template>
    </NModal>

    <!-- 导入对话框 -->
    <NModal 
      v-model:show="showImportDialog" 
      preset="dialog" 
      :title="t('conversation.importTitle')"
      :show-icon="false"
      style="width: 600px"
    >
      <template #default>
        <!-- 格式选择 -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">导入格式：</label>
          <NButtonGroup size="small">
            <NButton
              v-for="format in importFormats"
              :key="format.id"
              @click="selectedImportFormat = format.id"
              :type="selectedImportFormat === format.id ? 'primary' : 'default'"
              size="small"
            >
              {{ format.name }}
            </NButton>
          </NButtonGroup>
          <p class="text-xs text-gray-500 mt-2">
            {{ importFormats.find(f => f.id === selectedImportFormat)?.description }}
          </p>
        </div>

        <!-- 文件上传或文本输入 -->
        <div class="mb-4">
          <div class="flex gap-2 mb-2">
            <input
              type="file"
              ref="fileInput"
              accept=".json,.txt"
              @change="handleFileUpload"
              class="hidden"
            >
            <NButton
              @click="$refs.fileInput?.click()"
              secondary
              size="small"
            >
              <template #icon>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </template>
              选择文件
            </NButton>
            <span class="text-sm text-gray-500">或在下方粘贴文本</span>
          </div>
        </div>

        <NInput
          v-model:value="importData"
          type="textarea"
          :autosize="{ minRows: 16, maxRows: 16 }"
          :placeholder="getImportPlaceholder()"
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
            @click="importMessages" 
            :disabled="!importData.trim()"
            type="primary"
          >
            {{ t('conversation.import') }}
          </NButton>
        </div>
      </template>
    </NModal>
    
    <!-- 全屏上下文编辑器 -->
    <div v-if="showContextEditor" class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center" @click="handleContextEditorClose()">
      <div class="w-full h-full" @click.stop>
        <ContextEditor
          :initial-data="{
            messages: props.messages,
            tools: currentTools,
            metadata: {
              source: 'conversation_manager',
              timestamp: new Date().toISOString()
            }
          }"
          :available-vars="props.availableVariables"
          @close="handleContextEditorClose"
          @save="handleContextEditorClose"
          @create-variable="handleCreateVariable"
        />
      </div>
    </div>
  </NCard>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NButton, NCard, NTag, NDropdown, NModal, NInput, NButtonGroup, NSelect, NSpace, NText } from 'naive-ui'
import { useClipboard } from '../composables/useClipboard'
import { useContextEditor } from '../composables/useContextEditor'
import ConversationMessageEditor from './ConversationMessageEditor.vue'
import ContextEditor from './ContextEditor.vue'
import type { ConversationMessage } from '../types/variable'
import type { ToolDefinition } from '../types/standard-prompt'
import { quickTemplateManager } from '../data/quickTemplates'

const { t, locale } = useI18n()
const { copyText } = useClipboard()
const contextEditor = useContextEditor()

interface Props {
  messages: ConversationMessage[]
  disabled?: boolean
  availableVariables?: Record<string, string>
  scanVariables?: (content: string) => string[]
  isPredefinedVariable?: (name: string) => boolean
  replaceVariables?: (content: string, variables?: Record<string, string>) => string
  showSyncToTest?: boolean // 是否显示同步到测试按钮
  optimizationMode?: 'system' | 'user' // 优化模式，用于区分模板
  collapsible?: boolean // 是否可折叠
  maxHeight?: number // 最大高度（像素）
  tools?: ToolDefinition[] // 🆕 工具定义支持（向后兼容）
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  availableVariables: () => ({}),
  scanVariables: () => [],
  isPredefinedVariable: () => false,
  replaceVariables: (content: string) => content,
  showSyncToTest: false,
  optimizationMode: 'system',
  collapsible: false,
  maxHeight: undefined
})

const emit = defineEmits<{
  'update:messages': [messages: ConversationMessage[]]
  'create-variable': [name: string, defaultValue?: string]
  'open-variable-manager': [variableName: string]
  'sync-to-test': [syncData: { messages: ConversationMessage[], tools: ToolDefinition[] }]  // 🆕 更新为包含工具的结构化数据
  'update:tools': [tools: ToolDefinition[]]  // 🆕 工具更新事件（向后兼容）
}>()

// 状态
const newMessageRole = ref<'system' | 'user' | 'assistant'>('user')
const showExportDialog = ref(false)
const showImportDialog = ref(false)
const showContextEditor = ref(false)
const importData = ref('')
const importError = ref('')

// 角色选择选项
const roleOptions = computed(() => [
  { label: t('conversation.roles.system'), value: 'system' },
  { label: t('conversation.roles.user'), value: 'user' },
  { label: t('conversation.roles.assistant'), value: 'assistant' }
])

// 🆕 工具管理状态（向后兼容）
const currentTools = ref<ToolDefinition[]>(props.tools || [])
const isCollapsed = ref(false) // 折叠状态
const selectedImportFormat = ref('conversation')

// 模板下拉菜单选项
const templateDropdownOptions = computed(() => {
  const options = quickTemplates.value.map(template => ({
    label: t(`conversation.templates.${template.id}`),
    key: template.id,
    template
  }))
  
  // 添加分隔符和清除选项
  options.push({
    type: 'divider',
    key: 'divider'
  })
  
  options.push({
    label: t('conversation.clearAll'),
    key: 'clear',
    disabled: props.messages.length === 0
  })
  
  return options
})

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

// 动态快速模板 - 根据优化模式和语言获取
const quickTemplates = computed(() => {
  const currentLanguage = locale.value || 'zh-CN'
  return quickTemplateManager.getTemplates(props.optimizationMode, currentLanguage)
})

// 折叠控制
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// 容器样式
const containerStyle = computed(() => {
  const style: Record<string, any> = {}
  
  if (props.maxHeight && !isCollapsed.value) {
    style.maxHeight = `${props.maxHeight}px`
    style.overflowY = 'auto'
  }
  
  return style
})

// 计算属性
const allUsedVariables = computed(() => {
  const variables = new Set<string>()
  props.messages.forEach(message => {
    const content = message?.content || ''
    if (content && props.scanVariables) {
      const messageVars = props.scanVariables(content) || []
      messageVars.forEach(v => variables.add(v))
    }
  })
  return Array.from(variables)
})

const allMissingVariables = computed(() => {
  return allUsedVariables.value.filter(variable => 
    props.availableVariables[variable] === undefined
  )
})

const exportData = computed(() => {
  const exportObj = {
    messages: props.messages,
    exportTime: new Date().toISOString(),
    totalMessages: props.messages.length,
    usedVariables: allUsedVariables.value,
    missingVariables: allMissingVariables.value
  }
  return JSON.stringify(exportObj, null, 2)
})

// 方法
const updateMessage = (index: number, message: ConversationMessage) => {
  const newMessages = [...props.messages]
  newMessages[index] = message
  emit('update:messages', newMessages)
}

const moveMessage = (index: number, direction: number) => {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= props.messages.length) return
  
  const newMessages = [...props.messages]
  const temp = newMessages[index]
  newMessages[index] = newMessages[newIndex]
  newMessages[newIndex] = temp
  
  emit('update:messages', newMessages)
}

const deleteMessage = (index: number) => {
  if (props.messages.length <= 1) return // 至少保留一条消息
  
  const newMessages = props.messages.filter((_, i) => i !== index)
  emit('update:messages', newMessages)
}

const addMessage = () => {
  const newMessage: ConversationMessage = {
    role: newMessageRole.value,
    content: ''
  }
  
  const newMessages = [...props.messages, newMessage]
  emit('update:messages', newMessages)
}

const applyTemplate = (template: any) => {
  emit('update:messages', [...template.messages])
}

// 处理模板下拉菜单选择
const handleTemplateDropdownSelect = (key: string, option: any) => {
  if (key === 'clear') {
    clearAllMessages()
  } else if (option.template) {
    applyTemplate(option.template)
  }
}

const handleSyncToTest = () => {
  // 🆕 同步消息和工具到测试阶段
  const syncData = {
    messages: [...props.messages],
    tools: [...currentTools.value]
  }
  emit('sync-to-test', syncData)
}

const clearAllMessages = () => {
  if (confirm(t('conversation.confirmClear'))) {
    emit('update:messages', [])
  }
}

const handleCreateVariable = (name: string) => {
  // 基于变量名生成一个合理的默认值
  let defaultValue = ''
  if (name.toLowerCase().includes('name')) {
    defaultValue = 'John Doe'
  } else if (name.toLowerCase().includes('request') || name.toLowerCase().includes('question')) {
    defaultValue = 'Your question here'
  } else if (name.toLowerCase().includes('description')) {
    defaultValue = 'Description here'
  } else {
    defaultValue = `Value for ${name}`
  }
  
  emit('create-variable', name, defaultValue)
}

const handleOpenVariableManager = (variableName: string) => {
  // 先创建变量，然后打开变量管理器
  handleCreateVariable(variableName)
  // 发出打开变量管理器的事件
  emit('open-variable-manager', variableName)
}

const copyExportData = async () => {
  try {
    await copyText(exportData.value)
    showExportDialog.value = false
  } catch (error) {
    console.error('[ConversationManager] Failed to copy export data:', error)
  }
}

const importMessages = () => {
  try {
    let data: any
    
    // 根据选择的格式处理数据
    switch (selectedImportFormat.value) {
      case 'smart':
        // 使用智能导入
        const result = contextEditor.smartImport(JSON.parse(importData.value))
        if (result.success && result.data) {
          // 转换为会话格式
          const messages = result.data.messages.map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content
          }))
          emit('update:messages', messages)
        } else {
          throw new Error(result.error || '智能导入失败')
        }
        break
        
      case 'langfuse':
        // LangFuse 格式导入
        const langfuseResult = contextEditor.convertFromLangFuse(JSON.parse(importData.value))
        if (langfuseResult.success && langfuseResult.data) {
          const messages = langfuseResult.data.messages.map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content
          }))
          emit('update:messages', messages)
        } else {
          throw new Error(langfuseResult.error || 'LangFuse 导入失败')
        }
        break
        
      case 'openai':
        // OpenAI 格式导入
        const openaiResult = contextEditor.convertFromOpenAI(JSON.parse(importData.value))
        if (openaiResult.success && openaiResult.data) {
          const messages = openaiResult.data.messages.map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content
          }))
          emit('update:messages', messages)
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
        
        emit('update:messages', data.messages)
        break
    }
    
    importData.value = ''
    importError.value = ''
    showImportDialog.value = false
    
    console.log('[ConversationManager] Messages imported successfully')
  } catch (error) {
    importError.value = error.message || t('conversation.importError')
    console.error('[ConversationManager] Failed to import messages:', error)
  }
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

// 打开上下文编辑器
const openContextEditor = () => {
  // 转换当前消息为标准格式
  const standardData = {
    messages: props.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    metadata: {
      source: 'conversation_manager',
      variables: props.availableVariables || {}
    }
  }
  
  contextEditor.setData(standardData)
  showContextEditor.value = true
}

// 关闭上下文编辑器并处理结果
const handleContextEditorClose = (updatedData?: any) => {
  showContextEditor.value = false
  
  if (updatedData && updatedData.messages) {
    // 转换回会话消息格式
    const messages = updatedData.messages.map((msg: any) => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content
    }))
    emit('update:messages', messages)
    
    // 🆕 处理工具数据更新（向后兼容）
    if (updatedData.tools) {
      currentTools.value = [...updatedData.tools]
      emit('update:tools', currentTools.value)
    }
    
    // 如果有新变量，发出创建变量事件
    if (updatedData.metadata?.variables) {
      const existingVars = new Set(Object.keys(props.availableVariables || {}))
      const newVars = Object.keys(updatedData.metadata.variables).filter(
        name => !existingVars.has(name)
      )
      
      newVars.forEach(name => {
        emit('create-variable', name, updatedData.metadata.variables[name])
      })
    }
  }
}

// 监听消息变化，重置导入错误
watch(() => props.messages, () => {
  importError.value = ''
}, { deep: true })

// 🆕 监听工具数据变化（向后兼容）
watch(() => props.tools, (newTools) => {
  if (newTools) {
    currentTools.value = [...newTools]
  }
}, { deep: true, immediate: true })
</script>

<style scoped>
/* ConversationManager specific styles - using centralized theme system */
.conversation-container {
  /* 限制整个会话管理区域的最大高度 */
  max-height: 40vh;
  min-height: 120px;
  display: flex;
  flex-direction: column;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 transparent;
}

.message-list::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-track {
  background: transparent;
}

.message-list::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.message-list::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

.message-list.has-messages {
  border-bottom: 1px solid #e5e7eb;
}

/* 集成的添加消息行 - 使用 Pure Naive UI */

.dark .message-list::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.dark .message-list::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

.modal-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal-content {
  background-color: white;
  backdrop-filter: blur(4px);
  border-radius: 0.75rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid #d1d5db;
  padding: 1rem;
}

.dark .modal-content {
  background-color: #111827;
  border-color: #4b5563;
}
</style>
