<template>
  <div
    class="test-result-section"
    :style="{ 
      flex: 1, 
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column'
    }"
  >
    <!-- 对比模式：双列布局 -->
    <NFlex 
      v-if="isCompareMode && showOriginal"
      :vertical="verticalLayout"
      justify="space-between" 
      :style="{ 
        flex: 1, 
        overflow: 'hidden', 
        height: '100%',
        gap: '12px'
      }"
    >
      <!-- 原始结果 -->
      <NCard 
        size="small" 
        :style="{ 
          flex: 1, 
          height: '100%', 
          overflow: 'hidden' 
        }"
        content-style="height: 100%; max-height: 100%; overflow: hidden; display: flex; flex-direction: column;"
      >
        <template #header>
          <NText style="font-size: 16px; font-weight: 600;">
            {{ originalTitle }}
          </NText>
        </template>
        <div class="result-body">
          <slot name="original-result"></slot>
        </div>
        <!-- 原始结果的工具调用 -->
        <ToolCallDisplay 
          v-if="originalResult?.toolCalls"
          :tool-calls="originalResult.toolCalls"
          :size="size"
          class="tool-calls-section"
        />
      </NCard>
      
      <!-- 优化结果 -->
      <NCard 
        size="small" 
        :style="{ 
          flex: 1, 
          height: '100%', 
          overflow: 'hidden' 
        }"
        content-style="height: 100%; max-height: 100%; overflow: hidden; display: flex; flex-direction: column;"
      >
        <template #header>
          <NText style="font-size: 16px; font-weight: 600;">
            {{ optimizedTitle }}
          </NText>
        </template>
        <div class="result-body">
          <slot name="optimized-result"></slot>
        </div>
        <!-- 优化结果的工具调用 -->
        <ToolCallDisplay 
          v-if="optimizedResult?.toolCalls"
          :tool-calls="optimizedResult.toolCalls"
          :size="size"
          class="tool-calls-section"
        />
      </NCard>
    </NFlex>
    
    <!-- 单一模式：单列布局 -->
    <NCard 
      v-else
      size="small"
      :style="{ 
        flex: 1, 
        height: '100%', 
        overflow: 'hidden' 
      }"
      content-style="height: 100%; max-height: 100%; overflow: hidden; display: flex; flex-direction: column;"
    >
      <template #header>
        <NText style="font-size: 16px; font-weight: 600;">
          {{ singleResultTitle }}
        </NText>
      </template>
      <div class="result-body">
        <slot name="single-result"></slot>
      </div>
      <!-- 单一结果的工具调用 -->
      <ToolCallDisplay 
        v-if="singleResult?.toolCalls"
        :tool-calls="singleResult.toolCalls"
        :size="size"
        class="tool-calls-section"
      />
    </NCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from 'vue-i18n'
import { NFlex, NCard, NText } from 'naive-ui'
import ToolCallDisplay from './ToolCallDisplay.vue'
import type { AdvancedTestResult } from '@prompt-optimizer/core'

const { t } = useI18n()

interface Props {
  // 布局模式
  isCompareMode?: boolean
  verticalLayout?: boolean
  showOriginal?: boolean
  
  // 标题配置
  originalTitle?: string
  optimizedTitle?: string
  singleResultTitle?: string
  
  // 测试结果数据（用于工具调用显示）
  originalResult?: AdvancedTestResult
  optimizedResult?: AdvancedTestResult
  singleResult?: AdvancedTestResult
  
  // 尺寸配置
  cardSize?: 'small' | 'medium' | 'large'
  size?: 'small' | 'medium' | 'large'
  
  // 间距配置
  gap?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  isCompareMode: false,
  verticalLayout: false,
  showOriginal: true,
  originalTitle: '',
  optimizedTitle: '',
  singleResultTitle: '',
  cardSize: 'small',
  size: 'small',
  gap: 12
})

// 计算属性
const originalTitle = computed(() => 
  props.originalTitle || t('test.originalResult', '原始结果')
)

const optimizedTitle = computed(() => 
  props.optimizedTitle || t('test.optimizedResult', '优化结果')
)

const singleResultTitle = computed(() => 
  props.singleResultTitle || t('test.testResult', '测试结果')
)
</script>

<style scoped>
.test-result-section {
  /* 确保正确的flex行为和高度管理 */
  min-height: 0;
  max-height: 100%;
}

/* 三段式布局样式 */
.result-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  /* 为正文区域提供独立滚动 */
}

.tool-calls-section {
  flex: 0 0 auto;
  /* 工具调用区域根据内容自适应高度 */
}
</style>