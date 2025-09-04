<template>
  <div 
    v-if="visible"
    :style="{ 
      flexShrink: 0, 
      maxHeight: maxHeight, 
      overflow: 'hidden'
    }"
    class="conversation-section"
  >
    <!-- 简化版本：移除外层NCard，让内部组件直接处理滚动和样式 -->
    <div
      v-if="collapsible"
      :style="{ height: '100%' }"
      class="conversation-wrapper"
    >
      <!-- 可折叠标题栏 -->
      <NFlex justify="space-between" align="center" :style="{ marginBottom: '8px', padding: '8px 0' }">
        <NText style="font-size: 14px; font-weight: 500;">
          {{ title }}
        </NText>
        <NButton
          @click="handleToggleCollapse"
          size="small"
          text
          type="primary"
        >
          <template #icon>
            <NIcon>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                stroke-width="2"
                :style="{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </NIcon>
          </template>
        </NButton>
      </NFlex>

      <!-- 可折叠内容区域 -->
      <NCollapse :show="!collapsed">
        <div 
          :style="{ 
            maxHeight: contentMaxHeight,
            overflow: 'hidden'  /* 让内部组件自己处理滚动 */
          }"
        >
          <slot></slot>
        </div>
      </NCollapse>
    </div>
      
    <!-- 非折叠版本 -->
    <div 
      v-else
      :style="{ 
        height: '100%',
        maxHeight: contentMaxHeight,
        overflow: 'hidden'  /* 让内部组件自己处理滚动 */
      }"
    >
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NFlex, NText, NButton, NIcon, NCollapse } from 'naive-ui'

interface Props {
  // 显示控制
  visible?: boolean
  collapsed?: boolean
  collapsible?: boolean
  
  // 内容配置
  title?: string
  maxHeight?: string
  
  // 尺寸配置
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  collapsed: false,
  collapsible: true,
  title: '对话管理',
  maxHeight: '300px',
  size: 'medium'
})

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
  'toggle': [collapsed: boolean]
}>()

// 内部折叠状态
const internalCollapsed = ref(props.collapsed)

// 计算属性
const collapsed = computed({
  get: () => internalCollapsed.value,
  set: (value: boolean) => {
    internalCollapsed.value = value
    emit('update:collapsed', value)
  }
})

const contentMaxHeight = computed(() => {
  if (props.collapsible) {
    // 为collapsible组件留出标题栏空间
    const maxHeightNum = parseInt(props.maxHeight)
    const headerHeight = 48 // 估算标题栏高度
    return `${maxHeightNum - headerHeight}px`
  }
  return props.maxHeight
})

// 事件处理
const handleToggleCollapse = () => {
  collapsed.value = !collapsed.value
  emit('toggle', collapsed.value)
}
</script>

<style scoped>
.conversation-section {
  /* 确保正确的flex行为 */
  display: flex;
  flex-direction: column;
}
</style>