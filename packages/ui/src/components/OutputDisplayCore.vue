<template>
  <div 
    class="output-display-core theme-card flex flex-col h-full relative !p-0" 
    :class="displayClasses"
  >
    <!-- 统一顶层工具栏 -->
    <div v-if="hasToolbar" class="theme-toolbar-bg flex items-center justify-between px-3 py-2 border-b" :class="themeToolbarBorder">
      <!-- 左侧：视图控制按钮组 -->
      <div class="flex items-center border rounded-md" :class="themeToolbarBorder">
        <button 
          @click="internalViewMode = 'render'" 
          :disabled="internalViewMode === 'render'"
          class="px-3 py-1.5 text-sm rounded-r-none border-r"
          :class="[themeToolbarButton, themeToolbarBorder, { [themeToolbarButtonActive]: internalViewMode === 'render' }]"
        >
          {{ t('common.render') }}
        </button>
        <button 
          @click="internalViewMode = 'source'" 
          :disabled="internalViewMode === 'source'"
          class="px-3 py-1.5 text-sm rounded-none"
          :class="[themeToolbarButton, { [themeToolbarButtonActive]: internalViewMode === 'source' }]"
        >
          {{ t('common.source') }}
        </button>
        <button 
          v-if="isActionEnabled('diff')"
          @click="internalViewMode = 'diff'" 
          :disabled="internalViewMode === 'diff' || !originalContent"
          :title="!originalContent ? t('messages.noOriginalContentForDiff') : ''"
          class="px-3 py-1.5 text-sm rounded-l-none border-l"
          :class="[themeToolbarButton, themeToolbarBorder, { [themeToolbarButtonActive]: internalViewMode === 'diff' }]"
        >
          {{ t('common.compare') }}
        </button>
      </div>
      
      <!-- 右侧：操作按钮 -->
      <div class="flex items-center gap-2">
        <button v-if="isActionEnabled('copy')" @click="handleCopy('content')" class="theme-icon-button" :title="t('actions.copy')">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.125 0 1.13.094 1.976 1.057 1.976 2.192V7.5M8.25 7.5h7.5M8.25 7.5h-1.5a1.5 1.5 0 00-1.5 1.5v11.25c0 .828.672 1.5 1.5 1.5h10.5a1.5 1.5 0 001.5-1.5V9a1.5 1.5 0 00-1.5-1.5h-1.5" />
          </svg>
        </button>
        <button v-if="isActionEnabled('fullscreen')" @click="handleFullscreen" class="theme-icon-button" :title="t('actions.fullscreen')">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 推理内容区域 -->
    <div v-if="shouldShowReasoning">
      <!-- 推理面板标题栏 -->
      <div 
        class="reasoning-header flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
        @click="toggleReasoning"
      >
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('common.reasoning') }}
        </span>
        <div class="flex items-center gap-2">
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
        </div>
      </div>
      
      <!-- 推理内容区 -->
      <div 
        v-if="isReasoningExpanded" 
        class="output-display__reasoning"
        :class="{ 'streaming': streaming }"
      >
        <div class="reasoning-content" ref="reasoningContentRef">
          <MarkdownRenderer 
            v-if="displayReasoning" 
            :content="displayReasoning"
            :streaming="streaming"
            class="prose prose-sm max-w-none px-3 py-2"
          />
          <div v-else-if="streaming" class="text-gray-500 text-sm italic px-3 py-2">
            {{ t('common.generatingReasoning') }}
          </div>
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

      <!-- 原文模式 -->
      <div v-else-if="internalViewMode === 'source'" class="h-full">
        <textarea
          :value="content"
          @input="handleSourceInput"
          :readonly="mode !== 'editable' || streaming"
          class="w-full h-full theme-input resize-none px-3 py-2 !border-none !shadow-none"
          :placeholder="placeholder"
        ></textarea>
      </div>

      <!-- 渲染模式（默认） -->
      <div v-else class="h-full overflow-auto"
           :class="isEmpty ? 'theme-input !border-none !shadow-none !p-0' : 'theme-content-container !border-none !shadow-none'">
        <MarkdownRenderer
          v-if="displayContent"
          :content="displayContent"
          :streaming="streaming"
          class="px-3 py-2"
        />
        <div v-else-if="loading || streaming" class="loading-placeholder px-3 py-2">
          {{ placeholder || t('common.loading') }}
        </div>
        <div v-else class="empty-placeholder px-3 py-2">
          {{ placeholder || t('common.noContent') }}
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
const isReasoningExpanded = ref(false)
const reasoningContentRef = ref<HTMLDivElement | null>(null)

// 新的视图状态机
const internalViewMode = ref<'render' | 'source' | 'diff'>('render')
const compareResult = ref<CompareResult | undefined>()

const isActionEnabled = (action: ActionName) => props.enabledActions.includes(action)

const hasToolbar = computed(() =>
  ['diff', 'copy', 'fullscreen', 'edit'].some(action => isActionEnabled(action as ActionName))
)

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

const isEmpty = computed(() => !hasContent.value && !props.loading && !props.streaming)

const displayClasses = computed(() => ({
  'output-display-core--loading': props.loading,
  'output-display-core--streaming': props.streaming
}))

const computedHeight = computed(() => {
  if (typeof props.height === 'number') {
    return `${props.height}px`
  }
  return props.height
})

// 处理原文模式输入
const handleSourceInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit('update:content', target.value)
}

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

// 智能自动切换逻辑
const previousViewMode = ref<'render' | 'source' | 'diff' | null>(null)

watch(() => props.streaming, (isStreaming) => {
  if (isStreaming) {
    // 记住当前模式，并强制切换到原文模式
    if (internalViewMode.value !== 'source') {
      previousViewMode.value = internalViewMode.value
      internalViewMode.value = 'source'
    }
  } else {
    // 流式结束后，恢复之前的模式
    if (previousViewMode.value) {
      internalViewMode.value = previousViewMode.value
      previousViewMode.value = null
    }
  }
})

watch(internalViewMode, updateCompareResult, { immediate: true })
watch(() => [props.content, props.originalContent], () => {
  if (internalViewMode.value === 'diff') {
    updateCompareResult()
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

// 强制退出编辑状态 - 重构为强制切换到渲染模式
const forceExitEditing = () => {
  internalViewMode.value = 'render'
}

// 保持向后兼容的方法
const forceRefreshContent = () => {
  // V2版本中这个方法不再需要，但保留以确保向后兼容
}

const themeToolbarBg = 'theme-toolbar-bg'
const themeToolbarBorder = 'theme-toolbar-border'
const themeToolbarButton = 'theme-toolbar-button'
const themeToolbarButtonActive = 'theme-toolbar-button-active'

defineExpose({ resetReasoningState, forceRefreshContent, forceExitEditing })
</script>

<style scoped>
/* 顶层工具栏样式 */
.output-display-toolbar {
  @apply flex-none bg-gray-50 dark:bg-gray-800;
}

/* 推理面板标题栏样式 */
.reasoning-header {
  @apply flex-none bg-gray-50 dark:bg-gray-800;
}

.output-display__reasoning {
  @apply flex-none mt-0;
}

.reasoning-content {
  @apply overflow-y-auto mt-0;
  max-height: 30vh;
  padding: 0;
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
</style> 