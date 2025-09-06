<template>
  <NFlex vertical :style="{ height: '100%' }">
    <!-- 测试输入区域 (仅在系统提示词优化模式下显示) -->
    <div v-if="showTestInput" :style="{ flexShrink: 0 }">
      <TestInputSection
        v-model="testContentProxy"
        :label="t('test.content')"
        :placeholder="t('test.placeholder')"
        :help-text="t('test.simpleMode.help')"
        :disabled="isTestRunning"
        :mode="adaptiveInputMode"
        :size="inputSize"
        :enable-fullscreen="enableFullscreen"
        :style="{ marginBottom: '16px' }"
      />
    </div>
    
    <!-- 控制工具栏 -->
    <div :style="{ flexShrink: 0 }">
      <TestControlBar
        :model-label="t('test.model')"
        :show-compare-toggle="enableCompareMode"
        :is-compare-mode="props.isCompareMode"
        :primary-action-text="primaryActionText"
        :primary-action-disabled="primaryActionDisabled"
        :primary-action-loading="isTestRunning"
        :layout="adaptiveControlBarLayout"
        :button-size="adaptiveButtonSize"
        @compare-toggle="handleCompareToggle"
        @primary-action="handleTest"
        :style="{ marginBottom: '16px' }"
      >
        <template #model-select>
          <slot name="model-select"></slot>
        </template>
        <template #secondary-controls>
          <slot name="secondary-controls"></slot>
        </template>
        <template #custom-actions>
          <slot name="custom-actions"></slot>
        </template>
      </TestControlBar>
    </div>

    <!-- 测试结果区域 -->
    <TestResultSection
      :is-compare-mode="props.isCompareMode && enableCompareMode"
      :vertical-layout="adaptiveResultVerticalLayout"
      :show-original="showOriginalResult"
      :original-title="originalResultTitle"
      :optimized-title="optimizedResultTitle"
      :single-result-title="singleResultTitle"
      :original-result="originalResult"
      :optimized-result="optimizedResult"
      :single-result="singleResult"
      :size="adaptiveButtonSize"
      :style="{ flex: 1, minHeight: 0 }"
    >
      <template #original-result>
        <div class="result-container">
          <!-- 原始结果的工具调用显示 - 移到正文之前 -->
          <ToolCallDisplay 
            v-if="originalToolCalls.length > 0"
            :tool-calls="originalToolCalls"
            :size="adaptiveButtonSize === 'large' ? 'medium' : 'small'"
            class="tool-calls-section"
          />
          
          <div class="result-body">
            <slot name="original-result"></slot>
          </div>
        </div>
      </template>
      <template #optimized-result>
        <div class="result-container">
          <!-- 优化结果的工具调用显示 - 移到正文之前 -->
          <ToolCallDisplay 
            v-if="optimizedToolCalls.length > 0"
            :tool-calls="optimizedToolCalls"
            :size="adaptiveButtonSize === 'large' ? 'medium' : 'small'"
            class="tool-calls-section"
          />
          
          <div class="result-body">
            <slot name="optimized-result"></slot>
          </div>
        </div>
      </template>
      <template #single-result>
        <div class="result-container">
          <!-- 单一结果的工具调用显示 - 移到正文之前（使用优化结果的数据） -->
          <ToolCallDisplay 
            v-if="optimizedToolCalls.length > 0"
            :tool-calls="optimizedToolCalls"
            :size="adaptiveButtonSize === 'large' ? 'medium' : 'small'"
            class="tool-calls-section"
          />
          
          <div class="result-body">
            <slot name="single-result"></slot>
          </div>
        </div>
      </template>
    </TestResultSection>
  </NFlex>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { NSpace, NGrid, NFlex } from 'naive-ui'
import type { OptimizationMode, AdvancedTestResult, ToolCallResult } from '@prompt-optimizer/core'
import { useResponsive } from '../composables/useResponsive'
import { usePerformanceMonitor } from '../composables/usePerformanceMonitor'
import { useDebounceThrottle } from '../composables/useDebounceThrottle'
import TestInputSection from './TestInputSection.vue'
import TestControlBar from './TestControlBar.vue'
import TestResultSection from './TestResultSection.vue'
import ToolCallDisplay from './ToolCallDisplay.vue'

const { t } = useI18n()

// 性能监控
const {
  recordUpdate,
  getPerformanceReport,
  performanceGrade
} = usePerformanceMonitor('TestAreaPanel')

// 防抖节流
const { debounce, throttle } = useDebounceThrottle()

// 响应式配置
const {
  shouldUseVerticalLayout,
  shouldUseCompactMode,
  spaceSize,
  buttonSize,
  inputSize,
  gridConfig
} = useResponsive()

interface Props {
  // 核心状态
  optimizationMode: OptimizationMode
  isTestRunning?: boolean
  advancedModeEnabled?: boolean
  
  // 测试内容
  testContent?: string
  isCompareMode?: boolean
  
  // 功能开关
  enableCompareMode?: boolean
  enableFullscreen?: boolean
  
  // 布局配置
  inputMode?: 'compact' | 'normal'
  controlBarLayout?: 'default' | 'compact' | 'minimal'
  buttonSize?: 'small' | 'medium' | 'large'
  
  // 结果显示配置
  showOriginalResult?: boolean
  resultVerticalLayout?: boolean
  originalResultTitle?: string
  optimizedResultTitle?: string
  singleResultTitle?: string
  
  // 高级功能：测试结果数据（支持工具调用显示）
  originalResult?: AdvancedTestResult
  optimizedResult?: AdvancedTestResult
  singleResult?: AdvancedTestResult
}

const props = withDefaults(defineProps<Props>(), {
  isTestRunning: false,
  advancedModeEnabled: false,
  testContent: '',
  isCompareMode: true,
  enableCompareMode: true,
  enableFullscreen: true,
  inputMode: 'normal',
  controlBarLayout: 'default',
  buttonSize: 'medium',
  showOriginalResult: true,
  resultVerticalLayout: false,
  originalResultTitle: '',
  optimizedResultTitle: '',
  singleResultTitle: ''
})

const emit = defineEmits<{
  'update:testContent': [value: string]
  'update:isCompareMode': [value: boolean]
  'test': []
  'compare-toggle': []
  // 高级功能事件
  'open-variable-manager': []
  'open-context-editor': []
  'variable-change': [name: string, value: string]
  'context-change': [messages: any[], variables: Record<string, string>]
  // 工具调用事件
  'tool-call': [toolCall: ToolCallResult, testType: 'original' | 'optimized']
  'tool-calls-updated': [toolCalls: ToolCallResult[], testType: 'original' | 'optimized']
}>()

// 内部状态管理 - 去除防抖，保证输入即时响应
const testContentProxy = computed({
  get: () => props.testContent,
  set: (value: string) => {
    emit('update:testContent', value)
    recordUpdate()
  }
})

// 工具调用状态管理
const originalToolCalls = ref<ToolCallResult[]>([])
const optimizedToolCalls = ref<ToolCallResult[]>([])

// 处理工具调用的方法
const handleToolCall = (toolCall: ToolCallResult, testType: 'original' | 'optimized') => {
  if (testType === 'original') {
    originalToolCalls.value.push(toolCall)
  } else {
    optimizedToolCalls.value.push(toolCall)
  }
  
  emit('tool-call', toolCall, testType)
  emit('tool-calls-updated', testType === 'original' ? originalToolCalls.value : optimizedToolCalls.value, testType)
  recordUpdate()
}

// 清除工具调用数据的方法
const clearToolCalls = (testType: 'original' | 'optimized' | 'both' = 'both') => {
  if (testType === 'original' || testType === 'both') {
    originalToolCalls.value = []
  }
  if (testType === 'optimized' || testType === 'both') {
    optimizedToolCalls.value = []
  }
}

// 移除结果缓存与相关节流逻辑，避免不必要的复杂度

// 关键计算属性：消除接口冗余，showTestInput取决于optimizationMode
const showTestInput = computed(() => props.optimizationMode === 'system')

// 响应式布局配置
const adaptiveInputMode = computed(() => {
  if (shouldUseCompactMode.value) return 'compact'
  return props.inputMode || 'normal'
})

const adaptiveControlBarLayout = computed(() => {
  if (shouldUseCompactMode.value) return 'minimal'
  if (shouldUseVerticalLayout.value) return 'compact'
  return props.controlBarLayout || 'default'
})

const adaptiveButtonSize = computed(() => {
  return buttonSize.value
})

const adaptiveResultVerticalLayout = computed(() => {
  return shouldUseVerticalLayout.value || props.resultVerticalLayout
})

// 主要操作按钮文本
const primaryActionText = computed(() => {
  if (props.isTestRunning) {
    return t('test.testing')
  }
  return props.isCompareMode && props.enableCompareMode 
    ? t('test.startCompare') 
    : t('test.startTest')
})

// 主要操作按钮禁用状态
const primaryActionDisabled = computed(() => {
  if (props.isTestRunning) return true
  
  // 系统提示词模式需要测试内容
  if (props.optimizationMode === 'system' && !props.testContent.trim()) {
    return true
  }
  
  return false
})

// 事件处理 - 立即切换对比模式，避免点击延迟
const handleCompareToggle = () => {
  const newValue = !props.isCompareMode
  emit('update:isCompareMode', newValue)
  emit('compare-toggle')
  recordUpdate()
}

const handleTest = throttle(() => {
  emit('test')
  recordUpdate()
}, 200, 'handleTest')

// 移除未使用的 props 变化防抖处理，避免多余复杂度

// 开发环境下的性能调试
if (import.meta.env.DEV) {
  const logPerformance = debounce(() => {
    const report = getPerformanceReport()
    if (report.grade.grade === 'F') {
      console.warn('TestAreaPanel 性能较差:', report)
    }
  }, 5000, false, 'performanceLog')
  
  // 定期检查性能
  setInterval(logPerformance, 10000)
}

// 暴露方法供父组件调用
defineExpose({
  handleToolCall,
  clearToolCalls,
  // 获取当前工具调用状态
  getToolCalls: () => ({
    original: originalToolCalls.value,
    optimized: optimizedToolCalls.value
  })
})
</script>

<style scoped>
.result-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.result-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.tool-calls-section {
  flex: 0 0 auto;
}

/* 当存在工具调用列表时，隐藏结果区中的空内容占位 */
/* 依赖同级容器存在 .tool-call-display 时，隐藏 Naive UI 的 NEmpty */
.result-container:has(.tool-call-display) :deep(.n-empty) {
  display: none;
}
</style>
