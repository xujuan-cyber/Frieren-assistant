<template>
  <!-- 紧凑行式布局 -->
  <NCard size="small" class="compact-message-row" 
       :class="{ 'has-variables': detectedVariables.length > 0, 'has-missing': missingVariables.length > 0 }">
    
    <!-- 消息头部信息 -->
    <div class="message-header flex items-center justify-between mb-2">
      <NSpace size="small" align="center">
        <!-- 序号 -->
        <NTag size="small" type="default">
          #{{ index + 1 }}
        </NTag>
        
        <!-- 角色选择 -->
        <NSelect 
          v-model:value="localMessage.role" 
          @update:value="handleRoleChange"
          size="small"
          style="width: 80px"
          :disabled="disabled"
          :options="[
            { label: t('conversation.roles.system'), value: 'system' },
            { label: t('conversation.roles.user'), value: 'user' },
            { label: t('conversation.roles.assistant'), value: 'assistant' }
          ]"
        />
        
        <!-- 变量信息显示 -->
        <NSpace v-if="detectedVariables.length > 0" size="small">
          <NTag size="tiny" type="info">
            变量: {{ detectedVariables.length }}
          </NTag>
          <NTag v-if="missingVariables.length > 0" size="tiny" type="warning">
            缺失: {{ missingVariables.length }}
          </NTag>
        </NSpace>
      </NSpace>
      
      <!-- 操作按钮组 -->
      <NButtonGroup size="tiny">
        <!-- 预览切换按钮 -->
        <NButton
          @click="togglePreview"
          :type="showPreview ? 'primary' : 'default'"
          title="切换预览"
        >
          👁️
        </NButton>
        <NButton
          v-if="canMoveUp"
          @click="$emit('move-up')"
          :disabled="disabled"
          title="上移"
        >
          ↑
        </NButton>
        <NButton
          v-if="canMoveDown"
          @click="$emit('move-down')"
          :disabled="disabled"
          title="下移"
        >
          ↓
        </NButton>
        <NButton
          @click="$emit('delete')"
          :disabled="disabled || !canDelete"
          type="error"
          title="删除"
        >
          🗑️
        </NButton>
        <NButton
          @click="openFullscreenEdit"
          title="全屏编辑"
        >
          ⛶
        </NButton>
      </NButtonGroup>
    </div>
    
    <!-- 内容编辑区 -->
    <div class="content-area">
      <!-- 编辑模式 -->
      <div v-if="!showPreview && !showFullscreen">
        <NInput
          ref="contentTextarea"
          v-model:value="localMessage.content"
          @input="handleContentChange"
          @blur="handleBlur"
          type="textarea"
          :placeholder="contentPlaceholder"
          :disabled="disabled"
          :autosize="{ minRows: dynamicRows, maxRows: 10 }"
          size="small"
        />
      </div>
      
      <!-- 预览模式 -->
      <div v-else-if="showPreview && !showFullscreen" class="preview-content">
        <NCard size="small" embedded class="compact-preview" v-html="previewHtml"></NCard>
      </div>
      
      <!-- 全屏编辑占位 -->
      <div v-else-if="showFullscreen" class="fullscreen-placeholder">
        <span class="text-xs italic">
          {{ t('conversation.editingInFullscreen') }}
        </span>
      </div>
      
      <!-- 变量提示（缺失变量时显示） -->
      <NCard v-if="missingVariables.length > 0" size="small" class="variable-hint mt-2">
        <NSpace size="small" align="center">
          <NTag size="tiny" type="warning">
            {{ t('conversation.missingVars') }}:
          </NTag>
          <NButton
            v-for="variable in missingVariables.slice(0, 3)"
            :key="variable"
            @click="handleCreateVariableAndOpenManager(variable)"
            size="tiny"
            text
            type="warning"
            :title="t('conversation.clickToCreateVariable')"
          >
            {{ variable }}
          </NButton>
          <NTag v-if="missingVariables.length > 3" size="tiny" type="warning">
            ... +{{ missingVariables.length - 3 }}
          </NTag>
        </NSpace>
      </NCard>
    </div>
    
  </NCard>
  
  <!-- 全屏编辑模态框 -->
  <div v-if="showFullscreen" class="fullscreen-modal">
    <div class="fullscreen-overlay" @click="closeFullscreenEdit"></div>
    <div class="fullscreen-content">
      <div class="fullscreen-header">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold">
            {{ t('conversation.editMessage') }} #{{ index + 1 }} ({{ t(`conversation.roles.${localMessage.role}`) }})
          </h3>
          <div v-if="detectedVariables.length > 0" class="text-sm text-gray-500">
            {{ t('conversation.variablesDetected') }}: {{ detectedVariables.join(', ') }}
          </div>
        </div>
        <div class="flex gap-2">
          <NButton @click="toggleFullscreenPreview" secondary size="small">
            {{ showFullscreenPreview ? t('conversation.edit') : t('conversation.preview') }}
          </NButton>
          <NButton @click="closeFullscreenEdit" secondary size="small">
            {{ t('common.close') }}
          </NButton>
        </div>
      </div>
      
      <div class="fullscreen-body">
        <div v-if="!showFullscreenPreview" class="edit-area">
          <NInput
            v-model:value="localMessage.content"
            @input="handleContentChange"
            type="textarea"
            :placeholder="contentPlaceholder"
            :autosize="{ minRows: 15, maxRows: 15 }"
            class="w-full"
          />
        </div>
        <div v-else class="preview-area" v-html="previewHtml"></div>
        
        <!-- 变量信息 -->
        <div v-if="detectedVariables.length > 0" class="variable-info">
          <div class="text-sm">
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
import { NCard, NSelect, NInput, NTag, NButton, NButtonGroup, NSpace } from 'naive-ui'
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
  if (!localMessage.value) return []
  
  const content = localMessage.value.content || ''
  return props.scanVariables(content)
})

const missingVariables = computed(() => {
  return detectedVariables.value.filter(variable => 
    props.availableVariables[variable] === undefined
  )
})

// 动态行数计算
const dynamicRows = computed(() => {
  if (!localMessage.value) return 1
  
  const content = localMessage.value.content
  if (!content || typeof content !== 'string') return 1
  
  const lineCount = content.split('\n').length
  const charLength = content.length
  
  // 基于内容长度和换行数决定行数
  if (charLength <= 50 && lineCount <= 1) return 1
  if (charLength <= 150 && lineCount <= 2) return 2
  return Math.min(3, Math.max(lineCount, 2))
})

// 文本区域样式类
// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
const _textareaClasses = computed(() => ({
  'single-line': dynamicRows.value === 1,
  'two-lines': dynamicRows.value === 2,
  'three-lines': dynamicRows.value === 3
}))

const previewHtml = computed(() => {
  if (!localMessage.value) return ''
  
  const content = localMessage.value.content || ''
  if (!props.replaceVariables) return content
  
  const replaced = props.replaceVariables(
    content, 
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
const _copyVariableToClipboard = async (variableName: string) => {
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
/* 紧凑行式消息编辑器样式 - 使用 Naive UI NCard 原生布局 */
.compact-message-row {
  /* 移除 display: flex，使用 Naive UI NCard 内置布局 */
  transition: all 0.2s;
}

/* NCard hover 效果由 Naive UI 控制 */
.compact-message-row:hover {
  /* 让 Naive UI NCard 处理 hover 效果 */
}

/* 变量缺失状态指示 */
.compact-message-row.has-missing {
  border-left: 3px solid #f59e0b;
}

/* 内容区域 */
.content-area {
  width: 100%;
}

/* 变量提示区域 */
.variable-hint {
  margin-top: 8px;
}

/* 全屏编辑占位符 */
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