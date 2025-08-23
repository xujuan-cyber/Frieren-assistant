<template>
  <!-- 紧凑行式布局 -->
  <div class="compact-message-row" 
       :class="{ 'has-variables': detectedVariables.length > 0, 'has-missing': missingVariables.length > 0 }">
    
    <!-- 序号 -->
    <div class="message-index">
      <span class="text-xs theme-manager-text-secondary font-mono">
        #{{ index + 1 }}
      </span>
    </div>
    
    <!-- 角色选择 -->
    <div class="role-selector">
      <select 
        v-model="localMessage.role" 
        @change="handleRoleChange"
        class="theme-manager-input text-xs py-1 px-2"
        :disabled="disabled"
      >
        <option value="system">{{ t('conversation.roles.system') }}</option>
        <option value="user">{{ t('conversation.roles.user') }}</option>
        <option value="assistant">{{ t('conversation.roles.assistant') }}</option>
      </select>
    </div>
    
    <!-- 内容编辑区 - 动态高度 -->
    <div class="content-area flex-1">
      <!-- 编辑模式 -->
      <div v-if="!showPreview && !showFullscreen">
        <textarea
          ref="contentTextarea"
          v-model="localMessage.content"
          @input="handleContentChange"
          @blur="handleBlur"
          class="compact-textarea theme-manager-input w-full resize-none"
          :class="textareaClasses"
          :placeholder="contentPlaceholder"
          :disabled="disabled"
          :rows="dynamicRows"
        />
      </div>
      
      <!-- 预览模式 -->
      <div v-else-if="showPreview && !showFullscreen" class="preview-content">
        <div class="compact-preview" 
             :class="textareaClasses"
             v-html="previewHtml"></div>
      </div>
      
      <!-- 全屏编辑占位 -->
      <div v-else-if="showFullscreen" class="fullscreen-placeholder">
        <span class="text-xs theme-manager-text-secondary italic">
          {{ t('conversation.editingInFullscreen') }}
        </span>
      </div>
      
      <!-- 变量提示（缺失变量时显示） -->
      <div v-if="missingVariables.length > 0" class="variable-hint">
        <span class="text-xs text-amber-600">
          {{ t('conversation.missingVars') }}: 
          <span
            v-for="variable in missingVariables.slice(0, 3)"
            :key="variable"
            class="inline-flex items-center gap-1 mr-2"
          >
            <button
              @click="handleCreateVariableAndOpenManager(variable)"
              class="variable-missing-btn"
              :title="t('conversation.clickToCreateVariable')"
            >
              {{ variable }}
            </button>
            <button
              @click="copyVariableToClipboard(variable)"
              class="variable-copy-btn"
              :title="t('conversation.clickToCopyVariable')"
            >
              📋
            </button>
          </span>
          <span v-if="missingVariables.length > 3" class="text-xs text-amber-600">
            ... +{{ missingVariables.length - 3 }}
          </span>
        </span>
      </div>
    </div>
    
    <!-- 操作栏 -->
    <div class="action-bar">
      <!-- 预览切换 -->
      <button
        v-if="!disabled"
        @click="togglePreview"
        class="action-btn"
        :class="{ 'active': showPreview }"
        :title="showPreview ? t('conversation.hidePreview') : t('conversation.showPreview')"
      >
        👁️
      </button>
      
      <!-- 上移 -->
      <button
        v-if="!disabled && canMoveUp"
        @click="$emit('move-up')"
        class="action-btn"
        :title="t('conversation.moveUp')"
      >
        ↑
      </button>
      
      <!-- 下移 -->
      <button
        v-if="!disabled && canMoveDown"
        @click="$emit('move-down')"
        class="action-btn"
        :title="t('conversation.moveDown')"
      >
        ↓
      </button>
      
      <!-- 删除 -->
      <button
        v-if="!disabled && canDelete"
        @click="$emit('delete')"
        class="action-btn delete-btn"
        :title="t('conversation.deleteMessage')"
      >
        🗑️
      </button>
      
      <!-- 全屏编辑 -->
      <button
        v-if="!disabled"
        @click="openFullscreenEdit"
        class="action-btn"
        :title="t('conversation.fullscreenEdit')"
      >
        ⛶
      </button>
    </div>
  </div>
  
  <!-- 全屏编辑模态框 -->
  <div v-if="showFullscreen" class="fullscreen-modal">
    <div class="fullscreen-overlay" @click="closeFullscreenEdit"></div>
    <div class="fullscreen-content">
      <div class="fullscreen-header">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold theme-manager-text">
            {{ t('conversation.editMessage') }} #{{ index + 1 }} ({{ t(`conversation.roles.${localMessage.role}`) }})
          </h3>
          <div v-if="detectedVariables.length > 0" class="text-sm theme-manager-text-secondary">
            {{ t('conversation.variablesDetected') }}: {{ detectedVariables.join(', ') }}
          </div>
        </div>
        <div class="flex gap-2">
          <button @click="toggleFullscreenPreview" class="theme-manager-button-secondary">
            {{ showFullscreenPreview ? t('conversation.edit') : t('conversation.preview') }}
          </button>
          <button @click="closeFullscreenEdit" class="theme-manager-button-secondary">
            {{ t('common.close') }}
          </button>
        </div>
      </div>
      
      <div class="fullscreen-body">
        <div v-if="!showFullscreenPreview" class="edit-area">
          <textarea
            v-model="localMessage.content"
            @input="handleContentChange"
            class="theme-manager-input w-full h-full resize-none"
            :placeholder="contentPlaceholder"
          />
        </div>
        <div v-else class="preview-area theme-manager-code-block" v-html="previewHtml"></div>
        
        <!-- 变量信息 -->
        <div v-if="detectedVariables.length > 0" class="variable-info">
          <div class="text-sm theme-manager-text">
            <strong>{{ t('conversation.detectedVariables') }}:</strong> {{ detectedVariables.join(', ') }}
          </div>
          <div v-if="missingVariables.length > 0" class="text-sm text-amber-600 mt-1">
            <strong>{{ t('conversation.missingVariables') }}:</strong> {{ missingVariables.join(', ') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ConversationMessage } from '../types/variable'

const { t } = useI18n()

interface Props {
  message: ConversationMessage
  index: number
  disabled?: boolean
  canMoveUp?: boolean
  canMoveDown?: boolean
  canDelete?: boolean
  availableVariables?: Record<string, string>
  scanVariables?: (content: string) => string[]
  isPredefinedVariable?: (name: string) => boolean
  replaceVariables?: (content: string, variables?: Record<string, string>) => string
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  canMoveUp: false,
  canMoveDown: false,
  canDelete: true,
  availableVariables: () => ({}),
  scanVariables: () => [],
  isPredefinedVariable: () => false,
  replaceVariables: (content: string) => content
})

const emit = defineEmits<{
  'update:message': [message: ConversationMessage]
  'move-up': []
  'move-down': []
  'delete': []
  'create-variable': [name: string]
  'open-variable-manager': [variableName: string]
}>()

// 状态
const localMessage = ref<ConversationMessage>({ ...props.message })
const showPreview = ref(false)
const showMissingDetails = ref(false)
const showFullscreen = ref(false)
const showFullscreenPreview = ref(false)
const contentTextarea = ref<HTMLTextAreaElement | null>(null)

// 计算属性
const contentPlaceholder = computed(() => {
  switch (localMessage.value.role) {
    case 'system':
      return t('conversation.placeholders.system')
    case 'user':
      return t('conversation.placeholders.user')
    case 'assistant':
      return t('conversation.placeholders.assistant')
    default:
      return t('conversation.placeholders.default')
  }
})

const detectedVariables = computed(() => {
  if (!props.scanVariables) return []
  return props.scanVariables(localMessage.value.content)
})

const missingVariables = computed(() => {
  return detectedVariables.value.filter(variable => 
    props.availableVariables[variable] === undefined
  )
})

// 动态行数计算
const dynamicRows = computed(() => {
  const content = localMessage.value.content
  if (!content) return 1
  
  const lineCount = content.split('\n').length
  const charLength = content.length
  
  // 基于内容长度和换行数决定行数
  if (charLength <= 50 && lineCount <= 1) return 1
  if (charLength <= 150 && lineCount <= 2) return 2
  return Math.min(3, Math.max(lineCount, 2))
})

// 文本区域样式类
const textareaClasses = computed(() => ({
  'single-line': dynamicRows.value === 1,
  'two-lines': dynamicRows.value === 2,
  'three-lines': dynamicRows.value === 3
}))

const previewHtml = computed(() => {
  if (!props.replaceVariables) return localMessage.value.content
  
  const replaced = props.replaceVariables(
    localMessage.value.content, 
    props.availableVariables
  )
  
  // 简单的HTML转义和换行处理
  return replaced
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const trimmedName = varName.trim()
      if (props.availableVariables[trimmedName] !== undefined) {
        return `<span class="variable-replaced">${props.availableVariables[trimmedName]}</span>`
      } else {
        return `<span class="variable-missing">${match}</span>`
      }
    })
})

// 方法
const handleRoleChange = () => {
  emitUpdate()
}

const handleContentChange = () => {
  emitUpdate()
}

const handleBlur = () => {
  // 可以在这里添加验证逻辑
}

const emitUpdate = () => {
  emit('update:message', { ...localMessage.value })
}

const togglePreview = () => {
  showPreview.value = !showPreview.value
}

const openFullscreenEdit = () => {
  showFullscreen.value = true
  showFullscreenPreview.value = false
}

const closeFullscreenEdit = () => {
  showFullscreen.value = false
  showFullscreenPreview.value = false
}

const toggleFullscreenPreview = () => {
  showFullscreenPreview.value = !showFullscreenPreview.value
}

const handleCreateVariableAndOpenManager = (variableName: string) => {
  // 发出打开变量管理器的事件，并传递要创建的变量名
  emit('open-variable-manager', variableName)
}

// 复制变量名到剪贴板
const copyVariableToClipboard = async (variableName: string) => {
  try {
    const formattedVariable = `{{${variableName}}}`
    await navigator.clipboard.writeText(formattedVariable)
    
    // 简单的成功反馈 - 临时改变按钮文本
    const event = new CustomEvent('variable-copied', { 
      detail: { variableName, formattedVariable } 
    })
    document.dispatchEvent(event)
    
    console.log(`[ConversationMessageEditor] Variable copied: ${formattedVariable}`)
  } catch (error) {
    console.error('[ConversationMessageEditor] Failed to copy variable:', error)
    // 降级方案：选中文本让用户手动复制
    try {
      const textArea = document.createElement('textarea')
      textArea.value = `{{${variableName}}}`
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    } catch (fallbackError) {
      console.error('[ConversationMessageEditor] Fallback copy also failed:', fallbackError)
    }
  }
}

// 监听props变化
watch(() => props.message, (newMessage) => {
  localMessage.value = { ...newMessage }
}, { deep: true })

// 监听缺失变量，自动显示详情
watch(missingVariables, (newMissing) => {
  if (newMissing.length > 0 && !showMissingDetails.value) {
    showMissingDetails.value = true
  }
})
</script>

<style scoped>
/* 紧凑行式消息编辑器样式 */
.compact-message-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.compact-message-row:hover {
  background-color: #f8fafc;
  border-color: #e5e7eb;
}

.compact-message-row.has-missing {
  border-left: 3px solid #f59e0b;
}

/* 序号 */
.message-index {
  width: 24px;
  flex-shrink: 0;
  text-align: center;
  padding-top: 4px;
}

/* 角色选择器 */
.role-selector {
  width: 80px;
  flex-shrink: 0;
}

.role-selector select {
  width: 100%;
  min-height: 28px;
}

/* 内容区域 */
.content-area {
  flex: 1;
  min-width: 0;
}

.compact-textarea {
  border: 1px solid #d1d5db;
  font-size: 13px;
  line-height: 1.4;
  padding: 4px 8px;
  transition: all 0.2s;
}

.compact-textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.compact-textarea.single-line {
  min-height: 28px;
  max-height: 28px;
}

.compact-textarea.two-lines {
  min-height: 48px;
  max-height: 48px;
}

.compact-textarea.three-lines {
  min-height: 68px;
  max-height: 68px;
}

.compact-preview {
  border: 1px solid #d1d5db;
  font-size: 13px;
  line-height: 1.4;
  padding: 4px 8px;
  background-color: #f9fafb;
  border-radius: 4px;
}

.compact-preview.single-line {
  min-height: 28px;
}

.compact-preview.two-lines {
  min-height: 48px;
}

.compact-preview.three-lines {
  min-height: 68px;
}

.fullscreen-placeholder {
  padding: 4px 8px;
  border: 1px dashed #d1d5db;
  border-radius: 4px;
  background-color: #f9fafb;
  min-height: 28px;
  display: flex;
  align-items: center;
}

.variable-hint {
  margin-top: 2px;
  padding: 2px 4px;
  font-size: 11px;
}

.variable-missing-btn {
  background: none;
  border: none;
  color: #d97706;
  text-decoration: underline;
  cursor: pointer;
  font-size: 11px;
  padding: 0 2px;
  margin: 0 1px;
  border-radius: 2px;
  transition: all 0.2s;
}

.variable-missing-btn:hover {
  background-color: rgba(217, 119, 6, 0.1);
  color: #92400e;
}

/* 操作栏 */
.action-bar {
  display: flex;
  align-items: flex-start;
  gap: 2px;
  flex-shrink: 0;
  padding-top: 2px;
}

.action-btn {
  width: 24px;
  height: 24px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.action-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.action-btn.delete-btn:hover {
  background: #fecaca;
  border-color: #f87171;
}

/* 变量复制按钮样式 */
.variable-copy-btn {
  padding: 2px 4px;
  font-size: 12px;
  border: 1px solid #f59e0b;
  border-radius: 3px;
  background-color: #fef3c7;
  color: #92400e;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1;
  text-decoration: none;
}

.variable-copy-btn:hover {
  background-color: #fde68a;
  border-color: #d97706;
  color: #78350f;
  transform: scale(1.05);
}

.variable-copy-btn:active {
  transform: scale(0.95);
}

/* 全屏编辑模态框 */
.fullscreen-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
}

.fullscreen-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}

.fullscreen-content {
  position: absolute;
  top: 5vh;
  left: 5vw;
  right: 5vw;
  bottom: 5vh;
  background: white;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fullscreen-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9fafb;
}

.fullscreen-body {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.edit-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.edit-area textarea {
  flex: 1;
  min-height: 300px;
  font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 14px;
  line-height: 1.5;
}

.preview-area {
  flex: 1;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.5;
  padding: 16px;
}

.variable-info {
  margin-top: 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
}

/* 深色主题支持 */
.dark .compact-message-row:hover {
  background-color: #374151;
}

.dark .compact-textarea {
  background-color: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

.dark .compact-preview {
  background-color: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

.dark .fullscreen-placeholder {
  background-color: #374151;
  border-color: #4b5563;
  color: #9ca3af;
}

.dark .action-btn {
  background-color: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

.dark .action-btn:hover {
  background-color: #4b5563;
}

.dark .fullscreen-content {
  background-color: #111827;
}

.dark .fullscreen-header {
  background-color: #1f2937;
  border-color: #374151;
}

.dark .variable-info {
  background-color: #1f2937;
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