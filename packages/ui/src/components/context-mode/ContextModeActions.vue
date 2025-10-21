<template>
  <NFlex align="center" :wrap="false" :size="12">
    <!-- 快捷操作按钮 -->
    <!-- 全局变量 - 两种模式都显示 -->
    <NButton
      size="small"
      type="default"
      @click="$emit('open-global-variables')"
      :title="$t('contextMode.actions.globalVariables')"
    >
      <template #icon>
        <span>📊</span>
      </template>
      {{ $t('contextMode.actions.globalVariables') }}
    </NButton>

    <!-- 会话变量 - 两种模式都显示 -->
    <NButton
      size="small"
      type="default"
      @click="$emit('open-context-variables')"
      :title="$t('contextMode.actions.contextVariables')"
    >
      <template #icon>
        <span>📝</span>
      </template>
      {{ $t('contextMode.actions.contextVariables') }}
    </NButton>

    <!-- 工具管理 - 仅用户模式显示 -->
    <NButton
      v-if="contextMode === 'user'"
      size="small"
      type="default"
      @click="$emit('open-tool-manager')"
      :title="$t('contextMode.actions.tools')"
    >
      <template #icon>
        <span>🔧</span>
      </template>
      {{ $t('contextMode.actions.tools') }}
    </NButton>
  </NFlex>
</template>

<script setup lang="ts">
import { NButton, NFlex } from 'naive-ui'
import { type ContextMode } from '@prompt-optimizer/core'

const props = defineProps<{
  contextMode: ContextMode
}>()

const emit = defineEmits<{
  'open-global-variables': []
  'open-context-variables': []
  'open-tool-manager': []
}>()
</script>

<style scoped>
/* 确保按钮组在小屏幕上也能正常显示 */
</style>
