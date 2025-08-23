<template>
  <div class="conversation-manager theme-manager-card border theme-manager-border rounded-lg p-3">
    <!-- 紧凑型头部：一行显示标题、消息数量和操作按钮 -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-3">
        <h3 class="text-base font-semibold theme-manager-text">
          上下文管理
        </h3>
        <span class="text-xs theme-manager-text-secondary px-2 py-0.5 theme-manager-tag rounded">
          {{ t('conversation.messageCount', { count: messages.length }) }}
        </span>
        <!-- 变量统计紧凑显示 -->
        <div v-if="messages.length > 0" class="flex items-center gap-2 text-xs theme-manager-text-secondary">
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
        </div>
      </div>
      
      <!-- 操作按钮组 -->
      <div class="flex items-center gap-1">
        <!-- 快速模板下拉菜单 -->
        <div class="relative" ref="templateDropdownRef">
          <button
            @click="showTemplateDropdown = !showTemplateDropdown"
            class="px-2 py-1 text-xs theme-manager-button-secondary flex items-center gap-1"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            {{ t('conversation.quickTemplates') }}
          </button>
          <!-- 下拉菜单 -->
          <div v-if="showTemplateDropdown" class="absolute right-0 top-full mt-1 w-40 theme-manager-card theme-manager-border border rounded-lg shadow-lg z-10">
            <div class="p-1">
              <button
                v-for="template in quickTemplates"
                :key="template.id"
                @click="applyTemplate(template); showTemplateDropdown = false"
                class="w-full text-left px-2 py-1 text-xs theme-manager-button-secondary hover:theme-manager-button-primary rounded"
              >
                {{ t(`conversation.templates.${template.id}`) }}
              </button>
              <div class="border-t theme-manager-border my-1"></div>
              <button
                @click="clearAllMessages(); showTemplateDropdown = false"
                :disabled="messages.length === 0"
                class="w-full text-left px-2 py-1 text-xs theme-manager-button-danger rounded"
                :class="{ 'opacity-50 cursor-not-allowed': messages.length === 0 }"
              >
                {{ t('conversation.clearAll') }}
              </button>
            </div>
          </div>
        </div>
        
        <!-- 导入按钮 -->
        <button
          @click="showImportDialog = true"
          class="px-2 py-1 text-xs theme-manager-button-secondary"
        >
          {{ t('conversation.import') }}
        </button>
        
        <!-- 导出按钮 -->
        <button
          v-if="messages.length > 0"
          @click="showExportDialog = true"
          class="px-2 py-1 text-xs theme-manager-button-secondary"
        >
          {{ t('conversation.export') }}
        </button>
        
        <!-- 同步到测试按钮 -->
        <button
          v-if="showSyncToTest && messages.length > 0"
          @click="handleSyncToTest"
          class="px-2 py-1 text-xs theme-manager-button-primary"
          title="将当前会话同步到测试区域"
        >
          <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m0-4l-4-4" />
          </svg>
          同步到测试
        </button>
        
        <!-- 折叠/展开按钮 -->
        <button
          v-if="collapsible"
          @click="toggleCollapse"
          class="px-2 py-1 text-xs theme-manager-button-secondary"
          :title="isCollapsed ? t('common.expand', '展开') : t('common.collapse', '收起')"
        >
          <svg 
            class="w-3 h-3 transition-transform duration-200"
            :class="{ 'rotate-180': isCollapsed }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 消息列表：限制最大高度并集成添加功能 -->
    <div v-if="!isCollapsed" class="conversation-container" :style="containerStyle">
      <!-- 滚动消息列表 -->
      <div class="message-list" :class="{ 'has-messages': messages.length > 0 }">
        <div v-if="messages.length === 0" class="empty-state">
          <div class="text-center py-8 theme-manager-text-secondary">
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
      <div class="add-message-row theme-manager-card">
        <!-- 序号占位 -->
        <div class="message-index">
          <span class="text-xs theme-manager-text-secondary font-mono">
            #{{ messages.length + 1 }}
          </span>
        </div>
        
        <!-- 角色选择 -->
        <div class="role-selector">
          <select 
            v-model="newMessageRole" 
            class="theme-manager-input text-xs py-1 px-2"
            :disabled="disabled"
          >
            <option value="system">{{ t('conversation.roles.system') }}</option>
            <option value="user">{{ t('conversation.roles.user') }}</option>
            <option value="assistant">{{ t('conversation.roles.assistant') }}</option>
          </select>
        </div>
        
        <!-- 添加按钮区域 -->
        <div class="add-content-area flex-1">
          <button
            @click="addMessage"
            :disabled="disabled"
            class="add-message-btn theme-manager-button-secondary w-full"
            :class="{ 'disabled': disabled }"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>{{ t('conversation.addMessage') }}</span>
          </button>
        </div>
        
        <!-- 占位区域，保持布局一致 -->
        <div class="action-placeholder">
          <!-- 预留给未来功能的空间 -->
        </div>
      </div>
    </div>


    <!-- 导出对话框 -->
    <div v-if="showExportDialog" class="modal-overlay" @click="showExportDialog = false">
      <div class="modal-content" @click.stop>
        <h3 class="text-lg font-semibold mb-4">{{ t('conversation.exportTitle') }}</h3>
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
            {{ t('conversation.copyData') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 导入对话框 -->
    <div v-if="showImportDialog" class="modal-overlay" @click="showImportDialog = false">
      <div class="modal-content" @click.stop>
        <h3 class="text-lg font-semibold mb-4">{{ t('conversation.importTitle') }}</h3>
        <textarea
          v-model="importData"
          class="w-full h-64 p-3 border rounded-md theme-input font-mono text-sm"
          :placeholder="t('conversation.importPlaceholder')"
        ></textarea>
        <div v-if="importError" class="text-sm text-red-500 mt-2">
          {{ importError }}
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button @click="showImportDialog = false" class="px-4 py-2 theme-button-secondary">
            {{ t('common.cancel') }}
          </button>
          <button 
            @click="importMessages" 
            :disabled="!importData.trim()"
            class="px-4 py-2 theme-button-primary"
            :class="{ 'opacity-50 cursor-not-allowed': !importData.trim() }"
          >
            {{ t('conversation.import') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClipboard } from '../composables/useClipboard'
import ConversationMessageEditor from './ConversationMessageEditor.vue'
import type { ConversationMessage } from '../types/variable'
import { quickTemplateManager } from '../data/quickTemplates'

const { t, locale } = useI18n()
const { copyText } = useClipboard()

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
  'sync-to-test': [messages: ConversationMessage[]]
}>()

// 状态
const newMessageRole = ref<'system' | 'user' | 'assistant'>('user')
const showExportDialog = ref(false)
const showImportDialog = ref(false)
const importData = ref('')
const importError = ref('')
const showTemplateDropdown = ref(false)
const templateDropdownRef = ref<HTMLElement | null>(null)
const isCollapsed = ref(false) // 折叠状态

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
    const messageVars = props.scanVariables?.(message.content) || []
    messageVars.forEach(v => variables.add(v))
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

const handleSyncToTest = () => {
  emit('sync-to-test', [...props.messages])
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
    const data = JSON.parse(importData.value)
    
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
    importData.value = ''
    importError.value = ''
    showImportDialog.value = false
    
    console.log('[ConversationManager] Messages imported successfully')
  } catch (error) {
    importError.value = error.message || t('conversation.importError')
    console.error('[ConversationManager] Failed to import messages:', error)
  }
}

// 监听消息变化，重置导入错误
watch(() => props.messages, () => {
  importError.value = ''
}, { deep: true })

// 处理点击外部关闭下拉菜单
const handleClickOutside = (event: MouseEvent) => {
  if (templateDropdownRef.value && !templateDropdownRef.value.contains(event.target as Node)) {
    showTemplateDropdown.value = false
  }
}

// 生命周期
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
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

/* 集成的添加消息行 */
.add-message-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  margin-top: 4px;
  flex-shrink: 0;
}

.add-message-row .message-index {
  width: 24px;
  flex-shrink: 0;
  text-align: center;
}

.add-message-row .role-selector {
  width: 80px;
  flex-shrink: 0;
}

.add-message-row .role-selector select {
  width: 100%;
  min-height: 28px;
}

.add-content-area {
  flex: 1;
  min-width: 0;
}

.add-message-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 4px 12px;
  min-height: 28px;
  border: 1px dashed;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-message-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-placeholder {
  width: 120px;
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
}

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
