<template>
  <ContentCardUI>
    <!-- 测试输入区域 -->
    <div class="flex-none">
      <InputPanelUI
        v-model="testContent"
        v-model:selectedModel="selectedTestModel"
        label="测试输入"
        placeholder="请输入要测试的内容..."
        model-label="模型"
        button-text="开始测试 →"
        loading-text="测试中..."
        :loading="isTesting"
        :disabled="isTesting"
        @submit="() => handleTest(optimizedPrompt)"
        @configModel="$emit('showConfig')"
      >
        <template #model-select>
          <ModelSelectUI
            ref="testModelSelect"
            :modelValue="selectedTestModel"
            @update:modelValue="selectedTestModel = $event"
            :disabled="isTesting"
            @config="$emit('showConfig')"
          />
        </template>
      </InputPanelUI>
    </div>

    <!-- 测试结果区域 -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <OutputPanelUI
        ref="outputPanelRef"
        :loading="isTesting"
        :error="testError"
        :result="testResult"
      />
    </div>
  </ContentCardUI>
</template>

<script setup>
import { ref, toRef } from 'vue'
import { usePromptTester } from '../composables/usePromptTester'
import ContentCardUI from './ContentCard.vue'
import InputPanelUI from './InputPanel.vue'
import ModelSelectUI from './ModelSelect.vue'
import OutputPanelUI from './OutputPanel.vue'

const props = defineProps({
  promptService: {
    type: [Object, null],
    required: true
  },
  optimizedPrompt: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['showConfig'])

const testModelSelect = ref(null)
const outputPanelRef = ref(null)
const selectedTestModel = ref('')
const promptServiceRef = toRef(props, 'promptService')

const {
  testContent,
  testResult,
  testError,
  isTesting,
  handleTest
} = usePromptTester(promptServiceRef, selectedTestModel)

// 暴露需要的方法和属性给父组件
defineExpose({
  testModelSelect,
  selectedTestModel
})
</script> 