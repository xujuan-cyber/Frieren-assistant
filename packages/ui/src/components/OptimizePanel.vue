<template>
  <ContentCardUI>
    <!-- 输入区域 -->
    <div class="flex-none">
      <InputPanelUI
        v-model="prompt"
        v-model:selectedModel="selectedOptimizeModel"
        :label="promptInputLabel"
        :placeholder="promptInputPlaceholder"
        :model-label="t('promptOptimizer.optimizeModel')"
        :template-label="t('promptOptimizer.templateLabel')"
        :button-text="t('promptOptimizer.optimize')"
        :loading-text="t('common.loading')"
        :loading="isOptimizing"
        :disabled="isOptimizing"
        @submit="handleOptimizePrompt"
        @configModel="$emit('showConfig')"
      >
        <template #optimization-mode-selector>
          <OptimizationModeSelectorUI
            v-model="selectedOptimizationMode"
            @change="handleOptimizationModeChange"
          />
        </template>
        <template #model-select>
          <ModelSelectUI
            ref="optimizeModelSelect"
            :modelValue="selectedOptimizeModel"
            @update:modelValue="selectedOptimizeModel = $event"
            :disabled="isOptimizing"
            @config="$emit('showConfig')"
          />
        </template>
        <template #template-select>
          <TemplateSelectUI
            v-model="currentSelectedTemplate"
            :type="selectedOptimizationMode === 'system' ? 'optimize' : 'userOptimize'"
            :optimization-mode="selectedOptimizationMode"
            @manage="$emit('openTemplateManager', selectedOptimizationMode === 'system' ? 'optimize' : 'userOptimize')"
          />
        </template>
      </InputPanelUI>
    </div>

    <!-- 优化结果区域 -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <PromptPanelUI 
        v-model:optimized-prompt="optimizedPrompt"
        :original-prompt="prompt"
        :is-iterating="isIterating"
        v-model:selected-iterate-template="selectedIterateTemplate"
        :versions="currentVersions"
        :current-version-id="currentVersionId"
        @iterate="handleIteratePrompt"
        @openTemplateManager="$emit('openTemplateManager', $event)"
        @switchVersion="handleSwitchVersion"
      />
    </div>
  </ContentCardUI>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePromptOptimizer } from '../composables/usePromptOptimizer'
import ContentCardUI from './ContentCard.vue'
import InputPanelUI from './InputPanel.vue'
import ModelSelectUI from './ModelSelect.vue'
import TemplateSelectUI from './TemplateSelect.vue'
import PromptPanelUI from './PromptPanel.vue'
import OptimizationModeSelectorUI from './OptimizationModeSelector.vue'

const { t } = useI18n()

const props = defineProps({
  modelManager: {
    type: Object,
    required: true
  },
  templateManager: {
    type: Object,
    required: true
  },
  historyManager: {
    type: Object,
    required: true
  },
  promptService: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['showConfig', 'openTemplateManager'])

const optimizeModelSelect = ref(null)

// 新增状态
const selectedOptimizationMode = ref('system')

// 计算属性：动态标签
const promptInputLabel = computed(() => {
  return selectedOptimizationMode.value === 'system'
    ? t('promptOptimizer.systemPromptInput')
    : t('promptOptimizer.userPromptInput')
})

const promptInputPlaceholder = computed(() => {
  return selectedOptimizationMode.value === 'system'
    ? t('promptOptimizer.systemPromptPlaceholder')
    : t('promptOptimizer.userPromptPlaceholder')
})

// 计算属性：根据提示词类型选择对应的模板
const currentSelectedTemplate = computed({
  get() {
    return selectedOptimizationMode.value === 'system'
      ? selectedOptimizeTemplate.value
      : selectedUserOptimizeTemplate.value
  },
  set(newValue) {
    if (!newValue) return;
    if (selectedOptimizationMode.value === 'system') {
      selectedOptimizeTemplate.value = newValue
    } else {
      selectedUserOptimizeTemplate.value = newValue
    }
  }
})

// 事件处理
const handleOptimizationModeChange = (mode) => {
  selectedOptimizationMode.value = mode
}

const {
  prompt,
  optimizedPrompt,
  isOptimizing,
  isIterating,
  selectedOptimizeTemplate,
  selectedUserOptimizeTemplate,
  selectedIterateTemplate,
  selectedOptimizeModel,
  currentVersions,
  currentVersionId,
  currentChainId,
  handleOptimizePrompt,
  handleIteratePrompt,
  handleSwitchVersion,
  saveTemplateSelection,
  initTemplateSelection,
  handleModelSelect,
  initModelSelection,
  loadModels
} = usePromptOptimizer(
  props.modelManager,
  props.templateManager,
  props.historyManager,
  props.promptService,
  selectedOptimizationMode
)

// 暴露需要的方法和属性给父组件
defineExpose({
  prompt,
  optimizedPrompt,
  currentChainId,
  currentVersions,
  currentVersionId,
  optimizeModelSelect,
  initTemplateSelection,
  initModelSelection,
  loadModels,
  saveTemplateSelection,
  selectedOptimizationMode,
  selectedOptimizeTemplate,
  selectedUserOptimizeTemplate,
  selectedIterateTemplate,
  handleSelectHistory: (record) => {
    // 处理历史记录选择
    prompt.value = record.originalPrompt
    optimizedPrompt.value = record.optimizedPrompt
  }
})
</script>

<style scoped>
/* OptimizePanel 样式 */
</style>