<template>
  <div 
    class="output-display-core theme-card flex flex-col h-full relative !p-0" 
    :class="displayClasses"
    @mouseenter="isHovering = true"
    @mouseleave="isHovering = false"
  >
    <!-- 悬浮工具栏 -->
    <transition name="fade-slide">
      <div 
        v-show="isHovering && hasActions" 
        class="theme-dropdown min-w-fit absolute top-2 right-2 z-10 flex items-center gap-2 px-3 py-2 shadow-lg"
      >
        <!-- 思考过程展开/折叠按钮 -->
        <button
          v-if="isActionEnabled('reasoning') && shouldShowReasoning"
          @click="toggleReasoning"
          class="toolbar-btn"
          :title="isReasoningExpanded ? t('common.collapseReasoning') : t('common.expandReasoning')"
        >
          <svg viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-4 h-5">
            <path d="M12 2 C6.5 2 2 6.5 2 12 C2 17 6 21 12 21 C18 21 22 17 22 12 C22 6.5 17.5 2 12 2 Z"/>
            <rect x="9" y="21" width="6" height="5"/>
            <rect x="10" y="26" width="4" height="2"/>
          </svg>
          <div v-if="isReasoningStreaming" class="streaming-indicator">
            <span class="text-xs">{{ t('common.generating') }}</span>
          </div>
          <svg 
            class="reasoning-toggle w-4 h-4 transition-transform duration-200" 
            :class="{ 'rotate-180': isReasoningExpanded }"
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            stroke-width="2"
          >
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </button>
        
        <!-- 切换视图按钮 -->
        <button
          v-if="mode === 'editable' && isActionEnabled('edit') && !streaming"
          @click="handleManualViewToggle"
          class="toolbar-btn"
          :class="{ 'text-gray-400': isEditing }"
          :title="!isEditing ? t('common.switchToTextView') : t('common.switchToMarkdownView')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 335.03 257.27" fill="currentColor">
            <path d="M310.91,2.5H24.12C12.18,2.5,2.5,12.18,2.5,24.12v209.04c0,11.94,9.68,21.62,21.62,21.62h286.8c11.94,0,21.62-9.68,21.62-21.62V24.12c0-11.94-9.68-21.62-21.62-21.62ZM169.68,189.91h-25.89v-70.01h-.86l-23.88,39.01h-20.14l-23.88-38.4h-.86v69.39h-25.89v-121.82h23.73l36.54,60.29h.86l36.54-60.29h23.73v121.82ZM294.42,136.67l-45.07,49.94c-2.3,2.55-6.31,2.55-8.61,0l-45.07-49.94c-3.37-3.73-.72-9.69,4.31-9.69h30.17v-60.1h29.81v60.1h30.17c5.03,0,7.68,5.96,4.31,9.69Z"></path>
          </svg>
        </button>
        
        <!-- 对比按钮 -->
        <button
          v-if="isActionEnabled('diff') && originalContent && content"
          @click="toggleDiffView"
          class="toolbar-btn"
          :title="internalViewMode === 'diff' ? t('prompt.diff.exit') : t('prompt.diff.compare')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h18m-9.75-14.25L21 6.75m0 0L16.5 12M21 6.75H3" />
          </svg>
        </button>
        
        <!-- 复制按钮 -->
        <button
          v-if="isActionEnabled('copy') && hasContent"
          @click="handleCopy('content')"
          class="toolbar-btn"
          :title="t('common.copy')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.125 0 1.13.094 1.976 1.057 1.976 2.192V7.5M8.25 7.5h7.5M8.25 7.5h-1.5a1.5 1.5 0 00-1.5 1.5v11.25c0 .828.672 1.5 1.5 1.5h10.5a1.5 1.5 0 001.5-1.5V9a1.5 1.5 0 00-1.5-1.5h-1.5" />
          </svg>
        </button>
        
        <!-- 全屏按钮 -->
        <button
          v-if="isActionEnabled('fullscreen') && hasContent"
          @click="handleFullscreen"
          class="toolbar-btn"
          :title="t('common.expand')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
    </transition>

    <!-- 推理内容区域 -->
    <div>
      <div 
        v-if="shouldShowReasoning && isReasoningExpanded" 
        class="output-display__reasoning"
        :class="{ 'streaming': streaming }"
      >
        <div class="reasoning-content" ref="reasoningContentRef">
          <MarkdownRenderer 
            v-if="displayReasoning" 
            :content="displayReasoning"
            :streaming="streaming"
            class="prose prose-sm max-w-none"
          />
          <div v-else-if="streaming" class="text-gray-500 text-sm italic">
            {{ t('common.generatingReasoning') }}
          </div>
        </div>
        
        <!-- 推理内容操作按钮 -->
        <div v-if="isActionEnabled('copy') && hasReasoning" class="reasoning-actions">
          <button
            @click="handleCopy('reasoning')"
            class="text-xs px-2 py-1 theme-button-secondary"
          >
            {{ t('common.copyReasoning') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="output-display__content flex flex-col" :style="{ height: computedHeight }">
      <!-- 对比模式 -->
      <TextDiffUI
        v-if="internalViewMode === 'diff' && content && originalContent"
        :originalText="originalContent"
        :optimizedText="content"
        :compareResult="compareResult"
        :isEnabled="true"
        :showHeader="false"
        displayMode="optimized"
        class="w-full flex-1 min-h-0"
      />

      <!-- 只读模式 -->
      <div v-else-if="mode === 'readonly'"
           class="readonly-view h-full overflow-hidden"
           :class="isEmpty ? 'theme-input !border-none !shadow-none' : 'theme-card !border-none !shadow-none'">
        <MarkdownRenderer
          v-if="displayContent"
          :content="displayContent"
          :streaming="streaming"
        />
        <div v-else-if="loading || streaming" class="loading-placeholder">
          {{ placeholder || t('common.loading') }}
        </div>
        <div v-else class="empty-placeholder">
          {{ placeholder || t('common.noContent') }}
        </div>
      </div>

      <!-- 编辑模式 -->
      <div v-else class="editable-view h-full relative">
        <!-- 编辑状态：显示 textarea -->
        <textarea
          v-if="isEditing"
          ref="editTextarea"
          :value="editingContent"
          @input="handleInput"
          @blur="handleTextareaBlur"
          @keydown.esc="stopEditing"
          class="w-full h-full theme-input resize-none px-3 py-2 !border-none !shadow-none"
          :placeholder="placeholder"
        ></textarea>
        
        <!-- 非编辑状态：显示渲染内容，点击可编辑 -->
        <div 
          v-else 
          class="h-full overflow-hidden !p-0" 
          :class="[
            streaming ? 'cursor-not-allowed' : (manualToggleActive ? '' : 'cursor-text'),
            isEmpty ? 'theme-input !border-none !shadow-none' : 'theme-card !border-none !shadow-none'
          ]"
          @click="handleContainerClick"
          :title="streaming ? t('common.editingDisabledDuringStream') : (manualToggleActive ? '' : t('common.clickToEdit'))"
        >
          <MarkdownRenderer
            v-if="displayContent"
            :content="displayContent"
          />
          <div v-else class="empty-placeholder text-gray-500 italic">
            {{ placeholder || t('common.clickToEdit') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClipboard } from '../composables/useClipboard'
import MarkdownRenderer from './MarkdownRenderer.vue'
import TextDiffUI from './TextDiff.vue'
import { compareService } from '@prompt-optimizer/core'
import type { CompareResult } from '@prompt-optimizer/core'

type ActionName = 'fullscreen' | 'diff' | 'copy' | 'edit' | 'reasoning'

const { t } = useI18n()
const { copyText } = useClipboard()

// 组件 Props
interface Props {
  // 内容相关
  content?: string
  originalContent?: string
  reasoning?: string
  
  // 显示模式
  mode: 'readonly' | 'editable'
  reasoningMode?: 'show' | 'hide' | 'auto'
  
  // 功能开关
  enabledActions?: ActionName[]
  
  // 样式配置
  height?: string | number
  placeholder?: string
  
  // 状态
  loading?: boolean
  streaming?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  originalContent: '',
  reasoning: '',
  mode: 'readonly',
  reasoningMode: 'auto',
  enabledActions: () => ['fullscreen', 'diff', 'copy', 'edit', 'reasoning'],
  height: '100%',
  placeholder: ''
})

// 事件定义
const emit = defineEmits<{
  'update:content': [content: string]
  'update:reasoning': [reasoning: string]
  'copy': [content: string, type: 'content' | 'reasoning' | 'all']
  'fullscreen': []
  'edit-start': []
  'edit-end': []
  'reasoning-toggle': [expanded: boolean]
  'view-change': [mode: 'base' | 'diff']
}>()

// 内部状态
const isEditing = ref(false)
const editingContent = ref('')
const isReasoningExpanded = ref(false)
const editTextarea = ref<HTMLTextAreaElement | null>(null)
const isHovering = ref(false)
const manualToggleActive = ref(false)
const viewStateBeforeDiff = ref<{ isEditing: boolean, manualToggleActive: boolean } | null>(null)

// 推理区域自动滚动
const reasoningContentRef = ref<HTMLDivElement | null>(null)

// 对比模式状态
const internalViewMode = ref<'base' | 'diff'>('base')
const compareResult = ref<CompareResult | undefined>()

const isActionEnabled = (action: ActionName) => props.enabledActions.includes(action)

// 计算属性
const displayContent = computed(() => (props.content || '').trim())
const displayReasoning = computed(() => (props.reasoning || '').trim())

const hasContent = computed(() => !!displayContent.value)
const hasReasoning = computed(() => !!displayReasoning.value)

const isReasoningStreaming = computed(() => {
  return props.streaming && hasReasoning.value && !hasContent.value
})

const shouldShowReasoning = computed(() => {
  if (!isActionEnabled('reasoning')) return false
  if (props.reasoningMode === 'hide') return false
  if (props.reasoningMode === 'show') return true
  return hasReasoning.value || props.streaming
})

const hasActions = computed(() => {
  const reasoningButtonVisible = isActionEnabled('reasoning') && shouldShowReasoning.value
  const viewToggleButtonVisible = props.mode === 'editable' && isActionEnabled('edit') && !props.streaming
  const diffButtonVisible = isActionEnabled('diff') && !!props.originalContent && !!props.content
  const copyButtonVisible = isActionEnabled('copy') && hasContent.value
  const fullscreenButtonVisible = isActionEnabled('fullscreen') && hasContent.value

  return reasoningButtonVisible || viewToggleButtonVisible || diffButtonVisible || copyButtonVisible || fullscreenButtonVisible
})

const isEmpty = computed(() => !hasContent.value && !props.loading && !props.streaming)

const displayClasses = computed(() => ({
  'output-display-core--loading': props.loading,
  'output-display-core--streaming': props.streaming,
  'output-display-core--editable': props.mode === 'editable' && isEditing.value
}))

const computedHeight = computed(() => {
  if (typeof props.height === 'number') {
    return `${props.height}px`
  }
  return props.height
})

// 复制功能
const handleCopy = (type: 'content' | 'reasoning' | 'all') => {
  let textToCopy = ''
  let emitType: 'content' | 'reasoning' | 'all' = type
  
  switch (type) {
    case 'content':
      textToCopy = displayContent.value
      break
    case 'reasoning':
      textToCopy = displayReasoning.value
      break
    case 'all':
      textToCopy = [
        displayReasoning.value && `推理过程：\n${displayReasoning.value}`,
        `主要内容：\n${displayContent.value}`
      ].filter(Boolean).join('\n\n')
      break
  }
  
  if (textToCopy) {
    copyText(textToCopy)
    emit('copy', textToCopy, emitType)
  }
}

// 全屏功能
const handleFullscreen = () => {
  emit('fullscreen')
}

// 编辑功能
const handleManualViewToggle = () => {
  manualToggleActive.value = true
  if (isEditing.value) {
    stopEditing()
  } else {
    startEditing()
  }
}

const handleContainerClick = () => {
  if (manualToggleActive.value) return
  startEditing()
}

const startEditing = () => {
  if (props.streaming) return // 流式传输期间禁止编辑
  if (!isActionEnabled('edit') || props.mode !== 'editable' || internalViewMode.value === 'diff') return
  
  editingContent.value = props.content || ''
  isEditing.value = true
  emit('edit-start')
  
  nextTick(() => {
    editTextarea.value?.focus()
  })
}

const stopEditing = () => {
  if (!isEditing.value) return
  
  if (editingContent.value !== props.content) {
    emit('update:content', editingContent.value)
  }
  
  isEditing.value = false
  emit('edit-end')
}

const handleTextareaBlur = () => {
  if (manualToggleActive.value) return

  setTimeout(() => {
    if (isEditing.value) {
      stopEditing()
    }
  }, 200)
}

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  editingContent.value = target.value
}

// 推理内容
const toggleReasoning = () => {
  isReasoningExpanded.value = !isReasoningExpanded.value
  emit('reasoning-toggle', isReasoningExpanded.value)
}

const scrollReasoningToBottom = () => {
  if (reasoningContentRef.value) {
    nextTick(() => {
      if (reasoningContentRef.value) {
        reasoningContentRef.value.scrollTop = reasoningContentRef.value.scrollHeight
      }
    })
  }
}

// 对比功能
const toggleDiffView = () => {
  const isEnteringDiff = internalViewMode.value === 'base'

  if (isEnteringDiff) {
    viewStateBeforeDiff.value = {
      isEditing: isEditing.value,
      manualToggleActive: manualToggleActive.value,
    }
    if (isEditing.value) {
      stopEditing()
    }
    internalViewMode.value = 'diff'
  } else { // Exiting diff
    internalViewMode.value = 'base'
    if (viewStateBeforeDiff.value) {
      manualToggleActive.value = viewStateBeforeDiff.value.manualToggleActive
      if (viewStateBeforeDiff.value.isEditing) {
        startEditing()
      }
      viewStateBeforeDiff.value = null
    }
  }
  emit('view-change', internalViewMode.value)
}

const updateCompareResult = async () => {
  if (internalViewMode.value === 'diff' && props.originalContent && props.content) {
    try {
      compareResult.value = await compareService.compareTexts(
        props.originalContent,
        props.content
      )
    } catch (error) {
      console.error('Error calculating diff:', error)
    }
  } else {
    compareResult.value = undefined
  }
}

watch(internalViewMode, updateCompareResult, { immediate: true })
watch(() => [props.content, props.originalContent], () => {
  if (internalViewMode.value === 'diff') {
    updateCompareResult()
  }
})

// 监听编辑内容变化，实时同步到父组件
watch(editingContent, (newContent) => {
  // 只有在编辑状态下才触发更新
  if (isEditing.value && newContent !== props.content) {
    emit('update:content', newContent)
  }
}, { immediate: false })

// 监听props.content变化，同步到编辑内容
watch(() => props.content, (newContent, oldContent) => {
  if (!isEditing.value) {
    editingContent.value = newContent || ''
  }
})

watch(() => props.streaming, (newStreaming, oldStreaming) => {
  if (newStreaming && !oldStreaming && isEditing.value) {
    stopEditing()
  }
})

watch(() => props.reasoning, (newReasoning, oldReasoning) => {
  // 当推理内容从无到有，且没有主要内容时，自动展开思考过程
  if (!oldReasoning && newReasoning && !hasContent.value) {
    isReasoningExpanded.value = true
    emit('reasoning-toggle', true)
  }
  
  // 如果思考过程已展开，滚动到底部
  if (isReasoningExpanded.value) {
    scrollReasoningToBottom()
  }
})

// 暴露方法给父组件
const resetReasoningState = (initialState: boolean) => {
  isReasoningExpanded.value = initialState
}

// 强制刷新内容 - 用于版本切换时确保内容同步
const forceRefreshContent = () => {
  // 如果正在编辑，强制停止编辑
  if (isEditing.value) {
    isEditing.value = false
    emit('edit-end')
  }
  
  // 强制同步 props.content 到内部状态
  editingContent.value = props.content || ''
  
  // 重置手动切换状态
  manualToggleActive.value = false
}

// 强制退出编辑状态 - 用于开始优化/迭代前
const forceExitEditing = () => {
  if (isEditing.value) {
    // 保存当前编辑的内容
    if (editingContent.value !== props.content) {
      emit('update:content', editingContent.value)
    }
    
    isEditing.value = false
    emit('edit-end')
  }
}

defineExpose({ resetReasoningState, forceRefreshContent, forceExitEditing })
</script>

<style scoped>
/* .output-display-core {
  @apply flex flex-col h-full border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 relative;
} */

/* Duplicated styles from OutputDisplay */
.toolbar-btn {
  @apply flex items-center gap-1 px-2 py-1 text-sm rounded transition-colors;
  @apply hover:bg-gray-100 dark:hover:bg-gray-700;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50;
}

/* 悬浮工具栏动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease-out;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.output-display__reasoning {
  @apply flex-none mt-4;
}

.reasoning-content {
  @apply overflow-y-auto mt-0;
  max-height: 30vh;
  padding: 0; /* 移除所有内边距，让推理内容贴边显示 */
}

.reasoning-actions {
  @apply flex justify-end mt-2;
}

.streaming-indicator {
  @apply inline-flex items-center gap-1 text-blue-500;
}

.streaming-indicator::before {
  content: '';
  @apply w-2 h-2 rounded-full bg-blue-500 animate-pulse;
}

.output-display__content {
  @apply flex-1 min-h-0;
}

.loading-placeholder,
.empty-placeholder {
  @apply flex items-center justify-center h-full text-gray-500 text-sm italic;
}

/* ... other shared styles ... */
</style> 