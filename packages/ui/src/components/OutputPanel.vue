<!-- 输出面板组件 -->
<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between mb-3">
      <h3 v-if="resultTitle" class="text-lg font-semibold theme-text truncate">{{ resultTitle }}</h3>
      <div v-else-if="!hideTitle" class="text-lg font-semibold theme-text">{{ t('output.title') }}</div>
      <div v-else></div>
      
      <button
        v-if="contentTokens.length > 0 && !isStreaming"
        @click="copySelectedText"
        class="px-3 py-1.5 theme-button-secondary flex items-center space-x-2"
      >
        <span>{{ t('prompt.copy') }}</span>
      </button>
    </div>

    <div class="flex-1 min-h-0 relative">
      <div class="h-full relative">
        <div
          ref="resultContainer"
          class="absolute inset-0 h-full theme-input whitespace-pre-wrap overflow-auto"
        >
          <span v-if="!contentTokens.length" class="theme-text-placeholder">{{ t('output.placeholder') }}</span>
          <MarkdownRenderer v-else-if="props.enableMarkdown" :content="displayContent" />
          <span v-else v-text="displayContent" class="theme-text"></span>
        </div>
      </div>

      <div
        v-if="error"
        class="absolute top-2 right-2 theme-error px-3 py-1.5 rounded-lg flex items-center space-x-2"
      >
        <span>❌</span>
        <span>{{ error }}</span>
      </div>

      <div
        v-if="(loading || (isStreaming && contentTokens.length === 0))"
        class="absolute top-2 right-2 theme-loading px-3 py-1.5 rounded-lg flex items-center space-x-2"
      >
        <span class="animate-spin">⏳</span>
        <span>{{ t('output.processing') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits, defineProps, watch, nextTick, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '../composables/useToast'
import { useAutoScroll } from '../composables/useAutoScroll'
import { useClipboard } from '../composables/useClipboard'
import MarkdownRenderer from './MarkdownRenderer.vue'

const { t } = useI18n()
const toast = useToast()
const { copyText } = useClipboard()
const contentTokens = ref<string[]>([])
const isStreaming = ref(false)

// 使用自动滚动组合式函数
const { elementRef: resultContainer, onContentChange, forceScrollToBottom, shouldAutoScroll } = useAutoScroll<HTMLDivElement>({
  debug: import.meta.env.DEV,
  threshold: 20
})

// 计算完整内容
const displayContent = computed(() => {
  console.log('displayContent updated, current tokens count:', contentTokens.value.length);
  return contentTokens.value.join('');
})

// 监听组件挂载
onMounted(async () => {
  await nextTick();
  console.log('Component mounted, container exists:', !!resultContainer.value);
});

interface Props {
  loading?: boolean;
  error?: string;
  result?: string;
  hideTitle?: boolean;
  resultTitle?: string;
  enableMarkdown?: boolean;
}

const props = defineProps<Props>()

// 定义事件
const emit = defineEmits<{
  'update:result': [value: string];
}>()

// 监听 result 变化
watch(() => props.result, (newVal) => {
  if (!selfUpdate && !isStreaming.value && newVal) {
    contentTokens.value = [newVal]
    console.log('contentTokens changed, current length:', newVal.length);
    // 通知内容变化，触发高度检查
    onContentChange()
  }
})

// 更新文本
const updateContent = (text: string) => {
  console.log('Preparing to update content:', text.substring(0, 20) + '...');
  contentTokens.value.push(text)
  console.log('Content updated, current tokens count:', contentTokens.value.length);
  
  // 通知内容变化，触发高度检查
  onContentChange()
};

interface StreamHandlers {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}
let selfUpdate = false;
// 处理流式响应
const handleStream = (): StreamHandlers => {
  console.log('Starting stream handling, container exists:', !!resultContainer.value);
  isStreaming.value = true;
  contentTokens.value = [];
  
  return {
    onToken: (token: string) => {
      console.log('Token received:', { 
        tokenLength: token.length,
        token: token.substring(0, 50) + '...',
        containerExists: !!resultContainer.value,
        currentTokensCount: contentTokens.value.length
      });
      
      // 直接更新内容
      updateContent(token);
    },
    onComplete: () => {
      console.log('Stream completed, total tokens:', contentTokens.value.length);
      const finalContent = contentTokens.value.join(''); // 保存一份最终内容
      isStreaming.value = false;
      
      // 流式响应结束后，确保内容完全可见
      nextTick(() => {
        forceScrollToBottom()
      })

      // 设置标记，表示这是自身触发的更新
      selfUpdate = true;
      emit('update:result', finalContent);
      // 给标记一个恢复的延时
      setTimeout(() => {
        selfUpdate = false;
      }, 100);
    },
    onError: (error: Error) => {
      console.error('Stream error:', error);
      isStreaming.value = false;
      toast.error(error.message);
    }
  };
};

defineExpose({ 
  handleStream,
  contentTokens,
  displayContent,
  resultContainer,
  isAutoScrollEnabled: shouldAutoScroll, // 暴露自动滚动状态
  forceScrollToBottom  // 暴露手动滚动方法
})

// 复制选中的文本，如果没有选中则复制全部
const copySelectedText = async () => {
  if (!resultContainer.value) return
  
  const selection = window.getSelection()
  const selectedText = selection?.toString() || ''
  const textToCopy = selectedText || displayContent.value
  
  copyText(textToCopy)
}
</script>

<style scoped>
.whitespace-pre-wrap {
  white-space: pre-wrap;
}

.token-item {
  display: inline;
}

/* 隐藏滚动条但保持可滚动 */
.overflow-auto {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.overflow-auto::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}
</style>