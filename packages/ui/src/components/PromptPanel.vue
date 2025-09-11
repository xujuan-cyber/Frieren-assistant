<template>
  <NFlex
    vertical
    :style="{
      height: '100%',
      maxHeight: '100%',
      overflow: 'hidden'
    }"
  >
  <!-- 标题和按钮区域 -->
    <NCard size="small" :bordered="false" :segmented="false" class="flex-none" content-style="padding: 0;" :style="{ maxHeight: '120px', overflow: 'visible' }">
        <NFlex justify="space-between" align="flex-start" :wrap="false">
          <!-- 左侧：标题和版本 -->
          <NSpace vertical :size="8" class="flex-1 min-w-0">
            <NSpace align="center" :size="12">
              <NText class="text-lg font-semibold">{{ t('prompt.optimized') }}</NText>
              <NSpace v-if="versions && versions.length > 0" :size="4" class="version-tags">
                <NTag
                  v-for="version in versions.slice().reverse()"
                  :key="version.id"
                  :type="currentVersionId === version.id ? 'success' : 'default'"
                  size="small"
                  @click="switchVersion(version)"
                  :cursor="'pointer'"
                  :bordered="currentVersionId !== version.id"
                >
                  V{{ version.version }}
                </NTag>
              </NSpace>
            </NSpace>
          </NSpace>

          <!-- 右侧：操作按钮 -->
          <NSpace align="center" :size="8" class="flex-shrink-0">
            <NButton
              v-if="optimizedPrompt"
              @click="handleIterate"
              :disabled="isIterating"
              :loading="isIterating"
              type="primary"
              size="small"
              class="min-w-[100px]"
            >
              <template #icon>
                <svg v-if="!isIterating" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              </template>
              {{ isIterating ? t('prompt.optimizing') : t('prompt.continueOptimize') }}
            </NButton>
          </NSpace>
        </NFlex>
    </NCard>
    
    <!-- 内容区域：使用 OutputDisplay 组件 -->
    <OutputDisplay
      ref="outputDisplayRef"
      :content="optimizedPrompt"
      :original-content="previousVersionText"
      :reasoning="reasoning"
      mode="editable"
      :streaming="isOptimizing || isIterating"
      :enable-diff="true"
      :enable-copy="true"
      :enable-fullscreen="true"
      :enable-edit="true"
      :placeholder="t('prompt.optimizedPlaceholder')"
      :style="{ height: '100%', maxHeight: '100%', flex: 1, minHeight: 0, overflow: 'hidden' }"
      @update:content="$emit('update:optimizedPrompt', $event)"
    />
    </NFlex>
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
          <NText class="text-sm font-medium mb-2">{{ templateSelectText }}</NText>
          <TemplateSelect
            ref="iterateTemplateSelectRef"
            :modelValue="selectedIterateTemplate"
            @update:modelValue="$emit('update:selectedIterateTemplate', $event)"
            :type="templateType"
            :optimization-mode="optimizationMode"
            :services="services"
            @manage="$emit('openTemplateManager', templateType)"
          />
        </div>
        
        <div>
          <NText class="text-sm font-medium mb-2">{{ t('prompt.iterateDirection') }}</NText>
          <NInput
            v-model:value="iterateInput"
            type="textarea"
            :placeholder="t('prompt.iteratePlaceholder')"
            :rows="3"
            :autosize="{ minRows: 3, maxRows: 6 }"
          />
        </div>
      </div>
      
      <template #footer>
        <NButton
          @click="cancelIterate"
          type="default"
          size="medium"
        >
          {{ t('common.cancel') }}
        </NButton>
        <NButton
          @click="submitIterate"
          :disabled="!iterateInput.trim() || isIterating"
          :loading="isIterating"
          type="primary"
          size="medium"
        >
          {{ isIterating ? t('prompt.optimizing') : t('prompt.confirmOptimize') }}
        </NButton>
      </template>
    </Modal>

</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, computed, nextTick, watch, type Ref } from 'vue'
import { NButton, NText, NInput, NCard, NFlex, NSpace, NTag } from 'naive-ui'
import { useToast } from '../composables/useToast'
import TemplateSelect from './TemplateSelect.vue'
import Modal from './Modal.vue'
import OutputDisplay from './OutputDisplay.vue'
import type {
  Template,
  PromptRecord
} from '@prompt-optimizer/core'
import type { AppServices } from '../types/services'

const { t } = useI18n()
const toast = useToast()

interface IteratePayload {
  originalPrompt: string;
  optimizedPrompt: string;
  iterateInput: string;
}

const props = defineProps({
  optimizedPrompt: {
    type: String,
    default: ''
  },
  reasoning: {
    type: String,
    default: ''
  },
  isOptimizing: {
    type: Boolean,
    default: false
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
  },
  originalPrompt: {
    type: String,
    default: ''
  },
  optimizationMode: {
    type: String as () => import('@prompt-optimizer/core').OptimizationMode,
    required: true
  },
  services: {
    type: Object as () => Ref<AppServices | null>,
    required: true
  },
  advancedModeEnabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits<{
  'update:optimizedPrompt': [value: string];
  'iterate': [payload: IteratePayload];
  'openTemplateManager': [type: 'optimize' | 'userOptimize' | 'iterate'];
  'update:selectedIterateTemplate': [template: Template | null];
  'switchVersion': [version: PromptRecord];
  'templateSelect': [template: Template];
}>()

const showIterateInput = ref(false)
const iterateInput = ref('')
const templateType = ref<'optimize' | 'iterate'>('iterate')

const outputDisplayRef = ref<InstanceType<typeof OutputDisplay> | null>(null);
const iterateTemplateSelectRef = ref<{ refresh?: () => void } | null>(null);

// 计算标题文本
const templateTitleText = computed(() => {
  return t('prompt.iterateTitle')
})

// 计算模板选择标题
const templateSelectText = computed(() => {
  return t('prompt.selectIterateTemplate')
})

// 计算上一版本的文本用于显示
const previousVersionText = computed(() => {
  if (!props.versions || props.versions.length === 0) {
    return props.originalPrompt || ''
  }

  const currentIndex = props.versions.findIndex(v => v.id === props.currentVersionId)

  if (currentIndex > 0) {
    // 当前版本有上一版本
    return props.versions[currentIndex - 1].optimizedPrompt
  } else if (currentIndex === 0) {
    // 当前是V1，使用原始提示词
    return props.originalPrompt || ''
  } else {
    // 找不到当前版本，使用原始提示词
    return props.originalPrompt || ''
  }
})

// 获取当前版本号
const getCurrentVersionNumber = () => {
  if (!props.versions || props.versions.length === 0) return 0
  const currentVersion = props.versions.find(v => v.id === props.currentVersionId)
  return currentVersion ? currentVersion.version : 1
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
    originalPrompt: props.originalPrompt,
    optimizedPrompt: props.optimizedPrompt,
    iterateInput: iterateInput.value.trim()
  })
  
  // 重置输入
  iterateInput.value = ''
  showIterateInput.value = false
}

// 添加版本切换函数
const switchVersion = async (version: PromptRecord) => {
  if (version.id === props.currentVersionId) return
  
  // 发出版本切换事件
  emit('switchVersion', version)
  
  // 等待父组件更新内容
  await nextTick()
  
  // 强制刷新OutputDisplay的内容
  if (outputDisplayRef.value) {
    outputDisplayRef.value.forceRefreshContent()
  }
  
  console.log('[PromptPanel] 版本切换完成，强制刷新内容:', {
    versionId: version.id,
    version: version.version
  })
}

// 监听流式状态变化，强制退出编辑状态
watch([() => props.isOptimizing, () => props.isIterating], ([newOptimizing, newIterating], [oldOptimizing, oldIterating]) => {
  // 当开始优化或迭代时（从false变为true），强制退出编辑状态
  if ((!oldOptimizing && newOptimizing) || (!oldIterating && newIterating)) {
    if (outputDisplayRef.value) {
      outputDisplayRef.value.forceExitEditing()
      console.log('[PromptPanel] 检测到开始优化/迭代，强制退出编辑状态')
    }
  }
}, { immediate: false })

// 暴露刷新迭代模板选择的方法
const refreshIterateTemplateSelect = () => {
  if (iterateTemplateSelectRef.value?.refresh) {
    iterateTemplateSelectRef.value.refresh()
  }
}

defineExpose({
  refreshIterateTemplateSelect
})

</script>

<style scoped>
/* 版本容器样式 */
.version-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

@media (max-width: 640px) {
  .version-container {
    margin-top: 4px;
  }
}
</style>
