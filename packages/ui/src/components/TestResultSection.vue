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
        content-style="height: 100%; max-height: 100%; overflow: hidden;"
      >
        <template #header>
          <NText style="font-size: 16px; font-weight: 600;">
            {{ originalTitle }}
          </NText>
        </template>
        <slot name="original-result"></slot>
      </NCard>
      
      <!-- 优化结果 -->
      <NCard 
        size="small" 
        :style="{ 
          flex: 1, 
          height: '100%', 
          overflow: 'hidden' 
        }"
        content-style="height: 100%; max-height: 100%; overflow: hidden;"
      >
        <template #header>
          <NText style="font-size: 16px; font-weight: 600;">
            {{ optimizedTitle }}
          </NText>
        </template>
        <slot name="optimized-result"></slot>
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
      content-style="height: 100%; max-height: 100%; overflow: hidden;"
    >
      <template #header>
        <NText style="font-size: 16px; font-weight: 600;">
          {{ singleResultTitle }}
        </NText>
      </template>
      <slot name="single-result"></slot>
    </NCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NFlex, NCard, NText } from 'naive-ui'

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
  
  // 尺寸配置
  cardSize?: 'small' | 'medium' | 'large'
  
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
</style>