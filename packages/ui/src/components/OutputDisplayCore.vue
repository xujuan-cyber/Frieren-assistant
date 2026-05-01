<template>
  <NCard
    :bordered="false"
    class="output-display-core h-full  max-height: 100% "
    content-style="padding: 0; height: 100%; max-height: 100%; display: flex; flex-direction: column; overflow: hidden;"
    :data-testid="testId"
  >
    <NFlex vertical style="height: 100%; min-height: 0; overflow: hidden;">
      <!-- 统一顶层工具栏 -->
      <NFlex v-if="hasToolbar" justify="space-between" align="center" style="flex: 0 0 auto;">
        <!-- 左侧：视图控制按钮组 -->
        <NButtonGroup>
          <NButton 
            @click="internalViewMode = 'render'"
            :disabled="internalViewMode === 'render'"
            size="small"
            :type="internalViewMode === 'render' ? 'primary' : 'default'"
          >
            {{ t('common.render') }}
          </NButton>
          <NButton 
            @click="internalViewMode = 'source'"
            :disabled="internalViewMode === 'source'"
            size="small"
            :type="internalViewMode === 'source' ? 'primary' : 'default'"
          >
            {{ t('common.source') }}
          </NButton>
          <NButton 
            v-if="isActionEnabled('diff') && originalContent"
            @click="internalViewMode = 'diff'"
            :disabled="internalViewMode === 'diff' || !originalContent"
            size="small"
            :type="internalViewMode === 'diff' ? 'primary' : 'default'"
          >
            {{ t('common.compare') }}
          </NButton>
        </NButtonGroup>
        
        <!-- 右侧：操作按钮 -->
        <NFlex align="center" :size="6" :wrap="false" class="output-toolbar-actions">
          <slot name="toolbar-right-extra"></slot>
          <NButtonGroup class="output-toolbar-action-group">
          <NButton
            v-if="isActionEnabled('favorite')"
            :data-testid="testId ? `${testId}-favorite` : 'output-favorite'"
            @click="handleFavorite"
            size="small"
            quaternary
            circle
          >
            <template #icon>
              <NIcon>
                <Star />
              </NIcon>
            </template>
          </NButton>
          <NButton
            v-if="isActionEnabled('copy')"
            @click="handleCopy('content')"
            size="small"
            quaternary
            circle
          >
            <template #icon>
              <NIcon>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.125 0 1.13.094 1.976 1.057 1.976 2.192V7.5M8.25 7.5h7.5M8.25 7.5h-1.5a1.5 1.5 0 00-1.5 1.5v11.25c0 .828.672 1.5 1.5 1.5h10.5a1.5 1.5 0 001.5-1.5V9a1.5 1.5 0 00-1.5-1.5h-1.5" />
                </svg>
              </NIcon>
            </template>
          </NButton>
          <NButton
            v-if="isActionEnabled('fullscreen')"
            @click="handleFullscreen"
            size="small"
            quaternary
            circle
          >
            <template #icon>
              <NIcon>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </NIcon>
            </template>
          </NButton>
          </NButtonGroup>
        </NFlex>
      </NFlex>

      <!-- 推理内容区域 -->
      <NFlex v-if="shouldShowReasoning" style="flex: 0 0 auto;">
        <NCollapse v-model:expanded-names="reasoningExpandedNames" style="width: 100%;">
          <NCollapseItem name="reasoning">
            <template #header>
              <NFlex justify="space-between" align="center" style="width: 100%;">
                <NText class="text-sm font-medium">
                  {{ t('common.reasoning') }}
                </NText>
                <NFlex v-if="isReasoningStreaming" align="center" :size="4">
                  <NSpin :size="12" />
                  <NText class="text-xs">{{ t('common.generating') }}</NText>
                </NFlex>
              </NFlex>
            </template>
            
            <NScrollbar class="reasoning-content" ref="reasoningContentRef" style="max-height: clamp(160px, 28vh, 360px); overflow: auto;">
              <MarkdownRenderer
                v-if="displayReasoning"
                :content="displayReasoning"
                :streaming="streaming"
                :disableInternalScroll="true"
                class="prose-sm max-w-none px-3 py-2"
              />
              <NSpace v-else-if="streaming" class="text-gray-500 text-sm italic px-3 py-2">
                <NText>{{ t('common.generatingReasoning') }}</NText>
              </NSpace>
            </NScrollbar>
          </NCollapseItem>
        </NCollapse>
      </NFlex>
      <!-- 主要内容区域 -->
      <NFlex vertical style="flex: 1; min-height: 0; max-height: 100%; overflow: hidden;">
        <!-- 对比模式 -->
        <TextDiffUI v-if="internalViewMode === 'diff' && content && originalContent"
          :originalText="originalContent"
          :optimizedText="content"
          :compareResult="compareResult"
          class="w-full"
          style="height: 100%; min-height: 0; overflow: auto;"
        />

        <!-- 原文模式 -->
        <template v-if="internalViewMode === 'source'">
          <!-- 🆕 Pro 模式：使用变量感知输入框 -->
          <VariableAwareInput
            v-if="shouldEnableVariables && variableData"
            :model-value="content"
            @update:model-value="handleSourceInput"
            :readonly="mode !== 'editable' || streaming"
            :placeholder="placeholder"
            :autosize="true"
            v-bind="variableData"
            @variable-extracted="handleVariableExtracted"
            @add-missing-variable="handleAddMissingVariable"
            style="height: 100%; min-height: 0;"
          />

          <!-- Basic/Image 模式：使用普通输入框 -->
          <NInput
            v-else
            :value="content"
            @input="handleSourceInput"
            :readonly="mode !== 'editable' || streaming"
            type="textarea"
            :placeholder="placeholder"
            :autosize="{ minRows: 10 }"
            style="height: 100%; min-height: 0;"
          />
        </template>

        <!-- 渲染模式（默认） -->
        <NFlex v-else
          vertical
          :align="displayContent ? 'stretch' : 'center'"
          :justify="displayContent ? 'start' : 'center'"
          style="flex: 1; min-height: 0; overflow: hidden;"
        >
          <XmlRenderer
            v-if="displayContent && renderContentType === 'xml'"
            :content="displayContent"
            style="flex: 1; min-height: 0; overflow: auto;"
          />
          <MarkdownRenderer
            v-else-if="displayContent"
            :content="displayContent"
            :streaming="streaming"
            style="flex: 1; min-height: 0; overflow: auto;"
          />
          <NEmpty
            v-else-if="!loading && !streaming"
            :description="placeholder || t('common.noContent')"
            class="flex items-center justify-center"
            style="height: 100%;"
          />
          <NText  v-else class="ml-2">{{ placeholder || t('common.loading') }}</NText>
        </NFlex>
      </NFlex>
  
    </NFlex>
  </NCard>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, inject, type Ref } from 'vue'

import { useI18n } from 'vue-i18n'
import {
  NCard, NButton, NButtonGroup, NIcon, NCollapse, NCollapseItem,
  NInput, NEmpty, NSpin, NScrollbar, NFlex, NText, NSpace
} from 'naive-ui'
import { useToast } from '../composables/ui/useToast'
import { Star } from '@vicons/tabler'
import { useClipboard } from '../composables/ui/useClipboard'
import MarkdownRenderer from './MarkdownRenderer.vue'
import XmlRenderer from './XmlRenderer.vue'
import TextDiffUI from './TextDiff.vue'
import type { CompareResult, ICompareService } from '@prompt-optimizer/core'
import { VariableAwareInput } from './variable-extraction'
import { useTemporaryVariables } from '../composables/variable/useTemporaryVariables'
import { useVariableAwareInputBridge } from '../composables/variable/useVariableAwareInputBridge'
import { useVariableManager } from '../composables/prompt/useVariableManager'
import type { AppServices } from '../types/services'
import { router as routerInstance } from '../router'
import { isValidXmlContent } from '../utils/xml-renderer'

type ActionName = 'fullscreen' | 'diff' | 'copy' | 'edit' | 'reasoning' | 'favorite'

const { t } = useI18n()
const { copyText } = useClipboard()

const message = useToast()

// 🆕 注入 services（用于变量管理）
const services = inject<Ref<AppServices | null>>('services') ?? ref<AppServices | null>(null)

// 移除收藏状态管理(改由父组件处理)

// 组件 Props
interface Props {
  // 内容相关
  content?: string
  originalContent?: string
  reasoning?: string

  /** E2E/测试定位用的 data-testid（挂在组件根节点） */
  testId?: string
  
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
  
  // 服务
  compareService?: ICompareService
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  originalContent: '',
  reasoning: '',
  testId: undefined,
  mode: 'readonly',
  reasoningMode: 'auto',
  enabledActions: () => ['fullscreen', 'diff', 'copy', 'edit', 'reasoning', 'favorite'],
  height: '100%',
  placeholder: ''
})

const testId = computed(() => props.testId || undefined)

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
  'save-favorite': [data: { content: string; originalContent?: string }]
}>()

// 🆕 变量管理功能（Pro / Image 模式）
// 当前架构以路由为单一真源；不要依赖 legacy 的 Preference-based functionMode。
const routeFunctionMode = computed<'basic' | 'pro' | 'image'>(() => {
  const path = routerInstance.currentRoute.value.path || ''
  if (path.startsWith('/pro')) return 'pro'
  if (path.startsWith('/image')) return 'image'
  return 'basic'
})

const shouldEnableVariables = computed(() => routeFunctionMode.value === 'pro' || routeFunctionMode.value === 'image')

// ==================== 变量管理 Composables ====================
// 临时变量管理器（全局单例）
const tempVars = useTemporaryVariables()

// ✅ 无条件调用，composable 内部会等待 services.preferenceService 准备就绪
const globalVarsManager = useVariableManager(services)

const {
  variableInputData: variableData,
  handleVariableExtracted,
  handleAddMissingVariable,
} = useVariableAwareInputBridge({
  enabled: shouldEnableVariables,
  isReady: globalVarsManager.isReady,
  globalVariables: globalVarsManager.customVariables,
  temporaryVariables: tempVars.temporaryVariables,
  allVariables: globalVarsManager.allVariables,
  saveGlobalVariable: (name, value) => globalVarsManager.addVariable(name, value),
  saveTemporaryVariable: (name, value) => tempVars.setVariable(name, value),
  logPrefix: 'OutputDisplayCore',
})

// 内部状态
type ScrollbarLike = {
  scrollTo: (options: { top: number; behavior?: ScrollBehavior }) => void
}

const reasoningContentRef = ref<ScrollbarLike | null>(null)
const userHasManuallyToggledReasoning = ref(false)

// 新的视图状态机
const internalViewMode = ref<'render' | 'source' | 'diff'>('render')
const EMPTY_COMPARE_RESULT: CompareResult = {
  fragments: [],
  summary: { additions: 0, deletions: 0, unchanged: 0 },
}
const compareResult = ref<CompareResult>(EMPTY_COMPARE_RESULT)

// 推理折叠面板状态
const reasoningExpandedNames = ref<string[]>([])

const isActionEnabled = (action: ActionName) => props.enabledActions.includes(action)

const hasToolbar = computed(() =>
  ['diff', 'copy', 'fullscreen', 'edit'].some(action => isActionEnabled(action as ActionName))
)

// 计算属性
const displayContent = computed(() => (props.content || '').trim())
const displayReasoning = computed(() => (props.reasoning || '').trim())

const renderContentType = computed<'markdown' | 'xml'>(() => {
  if (!displayContent.value) return 'markdown'

  // Avoid format jumps while text is still being streamed.
  if (props.streaming) return 'markdown'

  return isValidXmlContent(displayContent.value) ? 'xml' : 'markdown'
})

const hasContent = computed(() => !!displayContent.value)
const hasReasoning = computed(() => !!displayReasoning.value)

const isReasoningStreaming = computed(() => {
  return props.streaming && hasReasoning.value && !hasContent.value
})

const shouldShowReasoning = computed(() => {
  if (!isActionEnabled('reasoning')) return false
  if (props.reasoningMode === 'hide') return false
  if (props.reasoningMode === 'show') return true
  return hasReasoning.value
})

// 推理展开/折叠状态的计算属性
const isReasoningExpanded = computed({
  get: () => reasoningExpandedNames.value.includes('reasoning'),
  set: (expanded: boolean) => {
    if (expanded) {
      reasoningExpandedNames.value = ['reasoning']
    } else {
      reasoningExpandedNames.value = []
    }
    emit('reasoning-toggle', expanded)
  }
})

// 处理原文模式输入
const handleSourceInput = (value: string) => {
  emit('update:content', value)
}

// 复制功能
const handleCopy = (type: 'content' | 'reasoning' | 'all') => {
  let textToCopy = ''
  const emitType: 'content' | 'reasoning' | 'all' = type
  
  switch (type) {
    case 'content':
      textToCopy = displayContent.value
      break
    case 'reasoning':
      textToCopy = displayReasoning.value
      break
    case 'all':
      textToCopy = [
        displayReasoning.value && `${t('common.reasoning')}:\n${displayReasoning.value}`,
        `${t('common.content')}:\n${displayContent.value}`
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

const scrollReasoningToBottom = () => {
  if (reasoningContentRef.value) {
    nextTick(() => {
      if (reasoningContentRef.value) {
        reasoningContentRef.value.scrollTo({
          top: 999999, // 滚动到底部
          behavior: 'smooth'
        })
      }
    })
  }
}

// 对比功能
const updateCompareResult = async () => {
  if (internalViewMode.value === 'diff' && props.originalContent && props.content) {
    try {
      const compareService = props.compareService ?? services.value?.compareService
      if (!compareService) throw new Error('CompareService not available')

      compareResult.value = await compareService.compareTexts(
        props.originalContent,
        props.content
      )
    } catch (error) {
      console.error('[OutputDisplayCore] Error calculating diff:', error)
      message.warning(t('toast.warning.compareFailed'))
      compareResult.value = EMPTY_COMPARE_RESULT
    }
  } else {
    compareResult.value = EMPTY_COMPARE_RESULT
  }
}

// 智能自动切换逻辑
const previousViewMode = ref<'render' | 'source' | 'diff' | null>(null)

watch(() => props.streaming, (isStreaming, wasStreaming) => {
  if (isStreaming && !wasStreaming) {
    // 新任务开始，重置用户记忆
    userHasManuallyToggledReasoning.value = false
  } else if (!isStreaming && wasStreaming) {
    // 任务结束，如果用户未干预且思考区域仍然展开，自动折叠
    if (!userHasManuallyToggledReasoning.value && isReasoningExpanded.value) {
      isReasoningExpanded.value = false
    }
  }

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
  // 当推理内容从无到有，且用户未手动干预时，自动展开
  if (newReasoning && !oldReasoning && !userHasManuallyToggledReasoning.value) {
    isReasoningExpanded.value = true
  }
  
  // 如果思考过程已展开且有新内容，滚动到底部
  if (isReasoningExpanded.value && newReasoning) {
    scrollReasoningToBottom()
  }
}, { flush: 'post' })

watch(() => props.content, (newContent, oldContent) => {
  // 当主要内容开始流式输出时，如果用户未干预，自动折叠思考过程
  const mainContentJustStarted = newContent && !oldContent
  if (props.streaming && mainContentJustStarted && !userHasManuallyToggledReasoning.value) {
    isReasoningExpanded.value = false
  }
})

// 监听推理折叠状态变化
watch(reasoningExpandedNames, (newNames) => {
  const expanded = newNames.includes('reasoning')
  if (expanded !== isReasoningExpanded.value) {
    userHasManuallyToggledReasoning.value = true
  }
})

// 暴露方法给父组件
const resetReasoningState = (initialState: boolean) => {
  isReasoningExpanded.value = initialState
  userHasManuallyToggledReasoning.value = false
}

const forceExitEditing = () => {
  // In Pro/Image (variable-enabled) workspaces, keep source view as the default
  // to preserve variable highlighting instead of flipping back to Markdown.
  if (shouldEnableVariables.value) return

  internalViewMode.value = 'render'
}

const forceRefreshContent = () => {
  // V2版本中这个方法不再需要，但保留以确保向后兼容
}

// 收藏相关方法 - 触发保存对话框而不是直接保存
const handleFavorite = () => {
  if (!props.content) {
    message.warning(t('toast.error.noContentToSave'));
    return;
  }

  // 触发保存收藏事件,由父组件打开保存对话框
  emit('save-favorite', {
    content: props.content,
    originalContent: props.originalContent
  });
};

// 组件挂载时设置初始视图模式
onMounted(() => {
  // ⚠️ 不在此处初始化 functionMode
  // 原因：useFunctionMode 是全局单例，不应由单个组件控制初始化时机
  // - 如果 services 未就绪，初始化会失败但仍标记为已完成，导致永久卡在 'basic'
  // - 应该在应用级别统一初始化（如 App.vue）
  // - functionMode 有默认值 'basic'，可以正常工作

  // 如果是可编辑模式，默认显示原文
  if (props.mode === 'editable') {
    internalViewMode.value = 'source';
  }
});

// 监听 mode 变化，自动切换视图模式
watch(() => props.mode, (newMode) => {
  if (newMode === 'editable' && internalViewMode.value === 'render') {
    internalViewMode.value = 'source';
  } else if (newMode === 'readonly' && internalViewMode.value === 'source') {
    internalViewMode.value = 'render';
  }
});

defineExpose({ resetReasoningState, forceRefreshContent, forceExitEditing })
</script>

<style scoped>
.output-toolbar-actions {
  flex-shrink: 0;
}

.output-toolbar-action-group {
  flex-shrink: 0;
}
</style>
