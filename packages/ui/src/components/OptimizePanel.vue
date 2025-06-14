<template>
  <ContentCardUI>
    <!-- 提示词类型选择器 -->
    <div class="flex-none mb-4">
      <PromptTypeSelectorUI
        v-model="selectedPromptType"
        @change="handlePromptTypeChange"
      />
    </div>



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
            v-model="selectedOptimizeTemplate"
            type="optimize"
            :prompt-type="selectedPromptType"
            @manage="$emit('openTemplateManager', 'optimize')"
            @select="handleTemplateSelect"
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
        @templateSelect="handleTemplateSelect"
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
import PromptTypeSelectorUI from './PromptTypeSelector.vue'

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
const selectedPromptType = ref('system')

// 计算属性：动态标签
const promptInputLabel = computed(() => {
  return selectedPromptType.value === 'system'
    ? t('promptOptimizer.systemPromptInput')
    : t('promptOptimizer.userPromptInput')
})

const promptInputPlaceholder = computed(() => {
  return selectedPromptType.value === 'system'
    ? t('promptOptimizer.systemPromptPlaceholder')
    : t('promptOptimizer.userPromptPlaceholder')
})

// 事件处理
const handlePromptTypeChange = (type) => {
  selectedPromptType.value = type
}

const {
  prompt,
  optimizedPrompt,
  isOptimizing,
  isIterating,
  selectedOptimizeTemplate,
  selectedIterateTemplate,
  selectedOptimizeModel,
  currentVersions,
  currentVersionId,
  currentChainId,
  handleOptimizePrompt,
  handleIteratePrompt,
  handleSwitchVersion,
  handleTemplateSelect,
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
  selectedPromptType
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
  selectedPromptType
})
</script> 