<template>
  <ContentCardUI>
    <div class="flex flex-col h-full">
      <!-- Test Input Area -->
      <div class="flex-none">
        <InputPanelUI
          v-model="testContent"
          v-model:selectedModel="selectedTestModel"
          :label="t('test.content')"
          :placeholder="t('test.placeholder')"
          :model-label="t('test.model')"
          :button-text="isCompareMode ? t('test.startCompare') : t('test.startTest')"
          :loading-text="t('test.testing')"
          :loading="isTesting"
          :disabled="isTesting"
          @submit="handleTest"
          @configModel="$emit('showConfig')"
        >
          <template #model-select>
            <div class="flex items-center space-x-2">
              <ModelSelectUI
                ref="testModelSelect"
                :modelValue="selectedTestModel"
                @update:modelValue="updateSelectedModel"
                :disabled="isTesting"
                @config="$emit('showConfig')"
                class="flex-1"
              />
              <button
                @click="isCompareMode = !isCompareMode"
                class="h-10 text-sm whitespace-nowrap"
                :class="isCompareMode ? 'theme-button-primary' : 'theme-button-secondary'"
              >
                {{ isCompareMode ? t('test.toggleCompare.disable') : t('test.toggleCompare.enable') }}
              </button>
              <button
                @click="enableMarkdown = !enableMarkdown"
                class="h-10 text-sm whitespace-nowrap"
                :class="enableMarkdown ? 'theme-button-on' : 'theme-button-off'"
                :title="enableMarkdown ? t('test.disableMarkdown') : t('test.enableMarkdown')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 335.03 257.27" style="fill: currentColor;">
                  <path 
                    d="M310.91,2.5H24.12C12.18,2.5,2.5,12.18,2.5,24.12v209.04c0,11.94,9.68,21.62,21.62,21.62h286.8c11.94,0,21.62-9.68,21.62-21.62V24.12c0-11.94-9.68-21.62-21.62-21.62ZM169.68,189.91h-25.89v-70.01h-.86l-23.88,39.01h-20.14l-23.88-38.4h-.86v69.39h-25.89v-121.82h23.73l36.54,60.29h.86l36.54-60.29h23.73v121.82ZM294.42,136.67l-45.07,49.94c-2.3,2.55-6.31,2.55-8.61,0l-45.07-49.94c-3.37-3.73-.72-9.69,4.31-9.69h30.17v-60.1h29.81v60.1h30.17c5.03,0,7.68,5.96,4.31,9.69Z"
                  />
                </svg>
              </button>
            </div>
          </template>
        </InputPanelUI>
      </div>

      <!-- Test Results Area -->
      <div class="flex-1 min-h-0 overflow-y-auto mt-5">
        <div class="relative h-full">
          <!-- Original Prompt Test Result -->
          <div
            v-show="isCompareMode"
            class="absolute inset-0 flex flex-col md:w-[calc(50%-6px)] md:mr-3"
          >
            <OutputPanelUI
              ref="originalOutputPanelRef"
              :loading="isTestingOriginal"
              :error="originalTestError"
              v-model:result="originalTestResult"
              class="flex-1"
              :resultTitle="t('test.originalResult')"
              :enableMarkdown="enableMarkdown"
            />
          </div>

          <!-- Optimized Prompt Test Result -->
          <div
           class="absolute inset-0 flex flex-col"
            :class="{
            'md:w-[calc(50%-6px)] md:left-[calc(50%+6px)] transition-[width,left] duration-300': isCompareMode,
            'w-full': !isCompareMode
            }"
          >
            <OutputPanelUI
              ref="optimizedOutputPanelRef"
              :loading="isTestingOptimized"
              :error="optimizedTestError"
              v-model:result="optimizedTestResult"
              class="flex-1"
              :resultTitle="isCompareMode ? t('test.optimizedResult') : t('test.testResult')"
              :enableMarkdown="enableMarkdown"
            />
          </div>
        </div>
      </div>
    </div>
  </ContentCardUI>
</template>

<script setup>
import { ref, toRef, computed, watch, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import ContentCardUI from './ContentCard.vue'
import InputPanelUI from './InputPanel.vue'
import ModelSelectUI from './ModelSelect.vue'
import OutputPanelUI from './OutputPanel.vue'

const { t } = useI18n()

const props = defineProps({
  promptService: {
    type: [Object, null],
    required: true
  },
  originalPrompt: {
    type: String,
    default: ''
  },
  optimizedPrompt: {
    type: String,
    default: ''
  },
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['showConfig', 'update:modelValue'])

// Test mode control
const isCompareMode = ref(true)

const testModelSelect = ref(null)
const originalOutputPanelRef = ref(null)
const optimizedOutputPanelRef = ref(null)
const selectedTestModel = ref(props.modelValue || '')
const promptServiceRef = toRef(props, 'promptService')

// Listen for external model value changes
watch(() => props.modelValue, (newVal) => {
  if (newVal && newVal !== selectedTestModel.value) {
    selectedTestModel.value = newVal
  }
})

// Update selected model
const updateSelectedModel = (value) => {
  selectedTestModel.value = value
  emit('update:modelValue', value)
}

// Original prompt test status
const originalTestResult = ref('')
const originalTestError = ref('')
const isTestingOriginal = ref(false)

// Optimized prompt test status
const optimizedTestResult = ref('')
const optimizedTestError = ref('')
const isTestingOptimized = ref(false)

// Overall test status
const isTesting = computed(() => isTestingOriginal.value || isTestingOptimized.value)

// Test content
const testContent = ref('')

// Ensure prompt is a string
const ensureString = (value) => {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

// Test original prompt
const testOriginalPrompt = async () => {
  if (!props.originalPrompt || !testContent.value) return

  isTestingOriginal.value = true
  originalTestError.value = ''

  try {
    if (originalOutputPanelRef.value) {
      const streamHandler = originalOutputPanelRef.value.handleStream()

      // Ensure prompt is a string
      const promptStr = ensureString(props.originalPrompt)
      console.log('[TestPanel] Original prompt type:', typeof promptStr, promptStr.substring(0, 30))

      await props.promptService.testPromptStream(
        promptStr,
        testContent.value,
        selectedTestModel.value,
        {
          onToken: streamHandler.onToken,
          onComplete: streamHandler.onComplete,
          onError: streamHandler.onError
        }
      )
    }
  } catch (error) {
    console.error('[TestPanel] Original prompt test failed:', error)
    originalTestError.value = error.message || t('test.error.failed')
    originalTestResult.value = ''
  } finally {
    isTestingOriginal.value = false
  }
}

// 添加Markdown渲染控制
const enableMarkdown = ref(true);
// Test optimized prompt
const testOptimizedPrompt = async () => {
  if (!props.optimizedPrompt || !testContent.value) return

  isTestingOptimized.value = true
  optimizedTestError.value = ''

  try {
    const outputPanel = optimizedOutputPanelRef.value

    if (outputPanel) {
      const streamHandler = outputPanel.handleStream()

      // Ensure prompt is a string
      const promptStr = ensureString(props.optimizedPrompt)
      console.log('[TestPanel] Optimized prompt type:', typeof promptStr, promptStr.substring(0, 30))

      await props.promptService.testPromptStream(
        promptStr,
        testContent.value,
        selectedTestModel.value,
        {
          onToken: streamHandler.onToken,
          onComplete: streamHandler.onComplete,
          onError: streamHandler.onError
        }
      )
    }
  } catch (error) {
    console.error('[TestPanel] Optimized prompt test failed:', error)
    optimizedTestError.value = error.message || t('test.error.failed')
    optimizedTestResult.value = ''
  } finally {
    isTestingOptimized.value = false
  }
}

// Test handler function
const handleTest = async () => {
  if (!selectedTestModel.value) {
    const errorMsg = t('test.error.noModel')
    originalTestError.value = errorMsg
    optimizedTestError.value = errorMsg
    return
  }

  if (isCompareMode.value) {
    // Compare test mode: test both original and optimized prompts
    try {
      await Promise.all([
        testOriginalPrompt().catch(error => {
          console.error('[TestPanel] Original prompt test failed:', error)
          originalTestError.value = error.message || t('test.error.failed')
        }),
        testOptimizedPrompt().catch(error => {
          console.error('[TestPanel] Optimized prompt test failed:', error)
          optimizedTestError.value = error.message || t('test.error.failed')
        })
      ])
    } catch (error) {
      console.error('[TestPanel] Test process error:', error)
    }
  } else {
    // Normal test mode: only test optimized prompt
    await testOptimizedPrompt()
  }
}

// Component mounted, if there is a default model, select it automatically
onMounted(() => {
  console.log("hideTitle value:", originalOutputPanelRef.value?.hideTitle);
  if (props.modelValue) {
    selectedTestModel.value = props.modelValue
  }
})

// Expose methods and attributes to parent component
defineExpose({
  testModelSelect,
  selectedTestModel,
  testContent,
  originalTestResult,
  optimizedTestResult,
  isTesting,
  isCompareMode,
  enableMarkdown
})
</script>

<style scoped>
.theme-checkbox {
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
  cursor: pointer;
}
</style>