<template>
  <ContentCardUI>
    <!-- 输入区域 -->
    <div class="flex-none">
      <InputPanelUI
        v-model="prompt"
        v-model:selectedModel="selectedOptimizeModel"
        label="原始提示词"
        placeholder="请输入需要优化的prompt..."
        model-label="优化模型"
        template-label="优化提示词"
        button-text="开始优化 →"
        loading-text="优化中..."
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
import { ref } from 'vue'
import { usePromptOptimizer } from '../composables/usePromptOptimizer'
import ContentCardUI from './ContentCard.vue'
import InputPanelUI from './InputPanel.vue'
import ModelSelectUI from './ModelSelect.vue'
import TemplateSelectUI from './TemplateSelect.vue'
import PromptPanelUI from './PromptPanel.vue'

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
  props.promptService
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
  saveTemplateSelection
})
</script> 