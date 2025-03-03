<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 z-45 flex items-center justify-center"
    @click="emit('update:show', false)"
  >
    <div
      class="w-full max-w-4xl h-[90vh] theme-drawer transform transition-all duration-300 ease-in-out"
      :class="show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'"
      @click.stop
    >
      <div class="h-full flex flex-col">
        <div class="flex-none p-4 sm:p-6 theme-drawer-header flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h2 class="text-lg font-semibold theme-manager-text">历史记录</h2>
            <button
              v-if="sortedHistory && sortedHistory.length > 0"
              @click.stop="handleClear"
              class="text-sm theme-manager-text-secondary hover:theme-manager-text transition-colors px-2 py-1 rounded border border-gray-300/20 hover:border-gray-300/40"
            >
              清空
            </button>
          </div>
          <button
            @click.stop="emit('update:show', false)"
            class="theme-manager-text-secondary hover:theme-manager-text transition-colors text-xl"
          >
            ×
          </button>
        </div>
        
        <div class="flex-1 overflow-y-auto p-4 sm:p-6">
          <template v-if="sortedHistory && sortedHistory.length > 0">
            <div class="space-y-4">
              <div
                v-for="chain in sortedHistory"
                :key="chain.chainId"
                class="theme-history-card"
              >
                <!-- 历史记录头部信息 -->
                <div class="theme-history-card-header">
                  <div class="flex items-center justify-between mb-2">
                    <div class="text-sm theme-manager-text-secondary">
                      创建于 {{ formatDate(chain.rootRecord.timestamp) }}
                    </div>
                  </div>
                  <div class="text-sm theme-manager-text break-all">
                    {{ chain.rootRecord.originalPrompt }}
                  </div>
                </div>

                <!-- 版本列表 -->
                <div class="divide-y theme-manager-divider">
                  <div
                    v-for="record in chain.versions.slice().reverse()"
                    :key="record.id"
                    class="relative"
                  >
                    <!-- 版本标题栏 -->
                    <div
                      class="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-100/5 transition-colors"
                      @click="toggleVersion(record.id)"
                    >
                      <div class="flex items-center gap-3 overflow-hidden">
                        <span class="text-sm font-medium theme-manager-text flex-none">V{{ record.version }}</span>
                        <span class="text-xs theme-manager-text-secondary flex-none">{{ formatDate(record.timestamp) }}</span>
                        <span v-if="record.type === 'iterate' && record.iterationNote" class="text-xs theme-manager-text-secondary truncate">
                          - {{ truncateText(record.iterationNote, 30) }}
                        </span>
                      </div>
                      <div class="flex items-center gap-2 flex-none">
                        <span v-if="record.type === 'iterate'" class="text-xs theme-manager-tag">迭代</span>
                        <button
                          @click.stop="reuse(record, chain)"
                          class="text-xs theme-manager-button-secondary px-2 py-0.5"
                        >
                          使用
                        </button>
                        <button class="theme-manager-text-secondary hover:theme-manager-text transition-colors text-sm">
                          {{ expandedVersions[record.id] ? '收起' : '展开' }}
                        </button>
                      </div>
                    </div>

                    <!-- 版本详细内容 -->
                    <div
                      v-show="expandedVersions[record.id]"
                      class="p-4 theme-manager-card space-y-3"
                    >
                      <!-- 迭代说明 -->
                      <div v-if="record.iterationNote" class="text-xs">
                        <span class="theme-manager-text">迭代说明:</span>
                        <span class="theme-manager-text-secondary ml-1">{{ record.iterationNote }}</span>
                      </div>
                      <!-- 优化后的提示词 -->
                      <div class="space-y-1">
                        <div class="text-xs theme-manager-text-secondary">优化后:</div>
                        <div class="text-sm theme-manager-text whitespace-pre-wrap">{{ record.optimizedPrompt }}</div>
                      </div>
                      <!-- 使用按钮 -->
                      <div class="flex justify-end">
                        <button
                          @click="reuse(record, chain)"
                          class="text-xs theme-manager-button-secondary px-3 py-1"
                        >
                          使用此版本
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="flex flex-col items-center justify-center h-full py-12">
              <div class="text-4xl mb-4 theme-manager-text-secondary">📜</div>
              <div class="text-sm theme-manager-text-secondary">暂无历史记录</div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import type { PropType } from 'vue'
import type { PromptRecord, PromptRecordChain } from '@prompt-optimizer/core'
import { historyManager } from '@prompt-optimizer/core'
import { useToast } from '../composables/useToast'

const props = defineProps({
  show: Boolean
})

// 添加日志
console.log('HistoryDrawer props:', {
  show: props.show
})

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'reuse', context: { 
    record: PromptRecord, 
    chainId: string,
    rootPrompt: string 
  }): void
  (e: 'clear'): void
}>()

const toast = useToast()
const expandedVersions = ref<Record<string, boolean>>({})

// 添加排序后的历史记录计算属性
const sortedHistory = computed(() => {
  return historyManager.getAllChains().sort((a, b) => b.rootRecord.timestamp - a.rootRecord.timestamp)
})

// 切换版本展开/收起状态
const toggleVersion = (recordId: string) => {
  expandedVersions.value = {
    ...expandedVersions.value,
    [recordId]: !expandedVersions.value[recordId]
  }
}

// 清空历史记录
const handleClear = async () => {
  if (confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
    emit('clear')
    toast.success('历史记录已清空')
  }
}

// 监听显示状态变化
watch(() => props.show, (newShow) => {
  if (!newShow) {
    // 关闭时重置所有展开状态
    expandedVersions.value = {}
  }
})

onMounted(() => {
  console.log('HistoryDrawer mounted')
})

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}

const reuse = (record: PromptRecord, chain: PromptRecordChain) => {
  emit('reuse', {
    record,
    chainId: chain.chainId,
    rootPrompt: chain.rootRecord.originalPrompt
  })
  emit('update:show', false)
}

// 添加文本截断函数
const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...'
}
</script>

<style scoped>
</style> 