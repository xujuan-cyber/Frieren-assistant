<template>
  <div class="flex flex-col h-full">
    <!-- 标题和按钮区域 -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3 flex-none">
      <div class="flex items-center gap-3">
        <h3 class="text-lg font-semibold theme-text">{{ t('prompt.optimized') }}</h3>
        <div v-if="versions && versions.length > 0" class="flex items-center gap-1">
          <button
            v-for="version in versions.slice().reverse()"
            :key="version.id"
            @click="switchVersion(version)"
            class="px-2 py-1 text-xs rounded transition-colors"
            :class="[
              currentVersionId === version.id
                ? 'font-medium theme-prompt-version-selected'
                : 'theme-prompt-version-unselected'
            ]"
          >
            V{{ version.version }}
          </button>
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <button
          v-if="optimizedPrompt"
          @click="handleIterate"
          class="px-3 py-1.5 theme-button-secondary flex items-center space-x-2"
          :disabled="isIterating"
        >
          <span>{{ isIterating ? t('prompt.optimizing') : t('prompt.continueOptimize') }}</span>
        </button>
        <button
          v-if="optimizedPrompt"
          @click="copyPrompt"
          class="px-3 py-1.5 theme-button-secondary flex items-center space-x-2"
        >
          <span>{{ t('prompt.copy') }}</span>
        </button>
      </div>
    </div>
    
    <!-- 内容区域 -->
    <div class="flex-1 min-h-0 p-[2px] overflow-hidden">
      <div class="h-full relative">
        <textarea
          ref="promptTextarea"
          :value="optimizedPrompt"
          @input="handleInput"
          class="w-full h-full px-4 py-3 theme-input resize-none"
          :placeholder="t('prompt.optimizedPlaceholder')"
        ></textarea>
      </div>
    </div>

    <!-- 迭代优化弹窗 -->
    <Modal
      v-model="showIterateInput"
      @confirm="submitIterate"
    >
      <template #title>
        {{ templateTitleText }}
      </template>
      
      <div class="space-y-4">
        <div>
          <h4 class="theme-label mb-2">{{ templateSelectText }}</h4>
          <TemplateSelect
            :modelValue="selectedIterateTemplate"
            @update:modelValue="$emit('update:selectedIterateTemplate', $event)"
            :type="templateType"
            @manage="$emit('openTemplateManager', templateType)"
          />
        </div>
        
        <div>
          <h4 class="theme-label mb-2">{{ t('prompt.iterateDirection') }}</h4>
          <textarea
            v-model="iterateInput"
            class="w-full theme-input resize-none"
            :placeholder="t('prompt.iteratePlaceholder')"
            rows="3"
          ></textarea>
        </div>
      </div>
      
      <template #footer>
        <button
          @click="cancelIterate"
          class="theme-button-secondary"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          @click="submitIterate"
          class="theme-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!iterateInput.trim() || isIterating"
        >
          {{ isIterating ? t('prompt.optimizing') : t('prompt.confirmOptimize') }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, defineProps, defineEmits, computed, nextTick } from 'vue'
import { useToast } from '../composables/useToast'
import { useAutoScroll } from '../composables/useAutoScroll'
import { useClipboard } from '../composables/useClipboard'
import TemplateSelect from './TemplateSelect.vue'
import Modal from './Modal.vue'
import type {
  Template,
  PromptRecord,
  PromptRecordChain
} from '@prompt-optimizer/core'

const { t } = useI18n()
const toast = useToast()
const { copyText } = useClipboard()

// 使用自动滚动组合式函数
const { elementRef: promptTextarea, watchSource, forceScrollToBottom, shouldAutoScroll } = useAutoScroll<HTMLTextAreaElement>({
  debug: import.meta.env.DEV,
  threshold: 10 // 设置更大的阈值以提高用户体验
})

interface IteratePayload {
  originalPrompt: string;
  iterateInput: string;
}

const props = defineProps({
  optimizedPrompt: {
    type: String,
    default: ''
  },
  isIterating: {
    type: Boolean,
    default: false
  },
  selectedIterateTemplate: {
    type: Object as () => Template | null,
    default: null
  },
  versions: {
    type: Array as () => PromptRecord[],
    default: () => []
  },
  currentVersionId: {
    type: String,
    default: ''
  }
})

// 监听optimizedPrompt变化，自动滚动到底部
watchSource(() => props.optimizedPrompt, true)

const emit = defineEmits<{
  'update:optimizedPrompt': [value: string];
  'iterate': [payload: IteratePayload];
  'openTemplateManager': [type: 'optimize' | 'iterate'];
  'update:selectedIterateTemplate': [template: Template | null];
  'switchVersion': [version: PromptRecord];
}>()

const showIterateInput = ref(false)
const iterateInput = ref('')
const templateType = ref<'optimize' | 'iterate'>('iterate')

// 计算标题文本
const templateTitleText = computed(() => {
  return t('prompt.iterateTitle')
})

// 计算模板选择标题
const templateSelectText = computed(() => {
  return t('prompt.selectIterateTemplate')
})

// 处理输入变化
const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit('update:optimizedPrompt', target.value)
}

// 复制提示词
const copyPrompt = async () => {
  if (!props.optimizedPrompt) return
  
  copyText(props.optimizedPrompt)
}

const handleIterate = () => {
  if (!props.selectedIterateTemplate) {
    toast.error(t('prompt.error.noTemplate'))
    return
  }
  showIterateInput.value = true
}

const cancelIterate = () => {
  showIterateInput.value = false
  iterateInput.value = ''
}

const submitIterate = () => {
  if (!iterateInput.value.trim()) return
  if (!props.selectedIterateTemplate) {
    toast.error(t('prompt.error.noTemplate'))
    return
  }
  
  emit('iterate', {
    originalPrompt: props.optimizedPrompt,
    iterateInput: iterateInput.value.trim()
  })
  
  // 重置输入
  iterateInput.value = ''
  showIterateInput.value = false
}

// 添加版本切换函数
const switchVersion = (version: PromptRecord) => {
  if (version.id === props.currentVersionId) return
  emit('switchVersion', version)
  
  // 版本切换后强制滚动到底部，确保用户能看到新版本的内容
  nextTick(() => {
    forceScrollToBottom()
  })
}
</script>

<style scoped>
textarea {
  /* 隐藏滚动条但保持可滚动 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

textarea::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}
</style>