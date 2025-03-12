<!-- 输出面板组件 -->
<template>
  <div class="flex flex-col h-full">
    <div v-if="!hideTitle" class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold theme-text">{{ t('output.title') }}</h3>
      <button
        v-if="result"
        @click="copySelectedText"
        class="px-3 py-1.5 theme-button-secondary flex items-center space-x-2"
      >
        <span>{{ t('common.copy') }}</span>
      </button>
    </div>

    <div class="flex-1 min-h-0 relative">
      <div class="h-full relative">
        <div
          ref="resultContainer"
          class="absolute inset-0 h-full theme-input whitespace-pre-wrap overflow-auto"
        >
          <span v-if="!contentTokens.length" class="theme-text-secondary">{{ t('output.placeholder') }}</span>
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
        v-if="loading && !isStreaming"
        class="absolute top-2 right-2 theme-loading px-3 py-1.5 rounded-lg flex items-center space-x-2"
      >
        <span class="animate-spin">⏳</span>
        <span>{{ t('common.processing') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits, defineProps, watch, nextTick, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '../composables/useToast'

const { t } = useI18n()
const toast = useToast()
const contentTokens = ref<string[]>([])
const isStreaming = ref(false)
const resultContainer = ref<HTMLDivElement | null>(null)

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

// 监听数组变化
watch(contentTokens, (newVal) => {
  console.log('contentTokens changed, current length:', newVal.length);
  // 强制更新视图
  nextTick(() => {
    if (resultContainer.value) {
      resultContainer.value.scrollTop = resultContainer.value.scrollHeight;
    }
  });
}, { deep: true });

interface Props {
  loading?: boolean;
  error?: string;
  result?: string;
  hideTitle?: boolean;
}

const props = defineProps<Props>()

// 定义事件
const emit = defineEmits<{
  'update:result': [value: string];
}>()

// 监听 result 变化
watch(() => props.result, (newVal) => {
  if (!isStreaming.value && newVal) {
    contentTokens.value = [newVal]
  }
})

// 更新文本
const updateContent = (text: string) => {
  console.log('Preparing to update content:', text.substring(0, 20) + '...');
  contentTokens.value = [...contentTokens.value, text];
  console.log('Content updated, current tokens count:', contentTokens.value.length);
};

interface StreamHandlers {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

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
      isStreaming.value = false;
      emit('update:result', displayContent.value);
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
  resultContainer
})

// 复制选中的文本，如果没有选中则复制全部
const copySelectedText = async () => {
  if (!resultContainer.value) return
  
  const selectedText = window.getSelection()?.toString()
  const textToCopy = selectedText || displayContent.value
  
  try {
    await navigator.clipboard.writeText(textToCopy)
    toast.success(t('common.copySuccess'))
  } catch (err) {
    toast.error(t('common.copyFailed'))
  }
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