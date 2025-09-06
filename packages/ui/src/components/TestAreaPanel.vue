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
        :mode="inputMode"
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
        :layout="controlBarLayout"
        :button-size="buttonSize"
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

    <!-- 对话管理区域 (仅在高级模式下显示) -->
    <ConversationSection
      v-if="showConversationSection"
      :visible="advancedModeEnabled"
      :collapsible="true"
      :title="t('conversation.title', '对话管理')"
      :max-height="conversationMaxHeight"
      :style="{ marginBottom: '16px', flexShrink: 0 }"
    >
      <slot name="conversation-manager"></slot>
    </ConversationSection>

    <!-- 测试结果区域 -->
    <TestResultSection
      :is-compare-mode="props.isCompareMode && enableCompareMode"
      :vertical-layout="resultVerticalLayout"
      :show-original="showOriginalResult"
      :original-title="originalResultTitle"
      :optimized-title="optimizedResultTitle"
      :single-result-title="singleResultTitle"
    >
      <template #original-result>
        <slot name="original-result"></slot>
      </template>
      <template #optimized-result>
        <slot name="optimized-result"></slot>
      </template>
      <template #single-result>
        <slot name="single-result"></slot>
      </template>
    </TestResultSection>
  </NFlex>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NFlex } from 'naive-ui'
import type { OptimizationMode } from '@prompt-optimizer/core'
import TestInputSection from './TestInputSection.vue'
import TestControlBar from './TestControlBar.vue'
import ConversationSection from './ConversationSection.vue'
import TestResultSection from './TestResultSection.vue'

const { t } = useI18n()

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
  conversationMaxHeight?: string
  
  // 结果显示配置
  showOriginalResult?: boolean
  resultVerticalLayout?: boolean
  originalResultTitle?: string
  optimizedResultTitle?: string
  singleResultTitle?: string
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
  conversationMaxHeight: '300px',
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
}>()

// 内部状态管理 - 使用更安全的ref绑定方式
const testContentProxy = computed({
  get: () => props.testContent,
  set: (value: string) => emit('update:testContent', value)
})

// 关键计算属性：消除接口冗余，showTestInput取决于optimizationMode
const showTestInput = computed(() => props.optimizationMode === 'system')

// 显示控制
const showConversationSection = computed(() => props.advancedModeEnabled)

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

// 事件处理
const handleCompareToggle = () => {
  // 使用emit直接发送新的值，避免直接修改computed属性
  const newValue = !props.isCompareMode
  emit('update:isCompareMode', newValue)
  emit('compare-toggle')
}

const handleTest = () => {
  emit('test')
}
</script>

