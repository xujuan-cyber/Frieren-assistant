<template>
  <div class="flex flex-col h-full">
    <!-- Test Input Area -->
    <div class="flex-none">
      <!-- Show test input only for system prompt optimization -->
      <InputPanelUI
        v-if="optimizationMode === 'system'"
        v-model="testContent"
        v-model:selectedModel="internalSelectedModel"
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
          <ModelSelectUI
            ref="testModelSelect"
            :modelValue="internalSelectedModel"
            @update:modelValue="updateSelectedModel"
            :disabled="isTesting"
            @config="$emit('showConfig')"
          />
        </template>
        <template #control-buttons>
          <div class="flex-1">
            <div class="h-[20px] mb-1.5"><!-- 占位，与其他元素对齐 --></div>
            <div class="flex items-center gap-2">
              <NButton
                @click="toggleCompareMode"
                :type="isCompareMode ? 'primary' : 'default'"
                size="medium"
                class="h-10 text-sm whitespace-nowrap"
              >
                {{ isCompareMode ? t('test.toggleCompare.disable') : t('test.toggleCompare.enable') }}
              </NButton>
            </div>
          </div>
        </template>
      </InputPanelUI>

      <!-- For user prompt optimization, show simplified test controls -->
      <NCard v-else size="medium" class="mb-0">
        <div class="flex items-center gap-4">
          <div class="flex-1">
            <div class="block text-sm font-medium mb-2">
              {{ t('test.model') }}
            </div>
            <ModelSelectUI
              ref="testModelSelect"
              :modelValue="internalSelectedModel"
              @update:modelValue="updateSelectedModel"
              :disabled="isTesting"
              @config="$emit('showConfig')"
            />
          </div>
          <div class="flex items-center gap-2">
            <NButton
              @click="toggleCompareMode"
              :type="isCompareMode ? 'primary' : 'default'"
              size="medium"
              class="h-10 text-sm whitespace-nowrap"
            >
              {{ isCompareMode ? t('test.toggleCompare.disable') : t('test.toggleCompare.enable') }}
            </NButton>
            <NButton
              @click="handleTest"
              :disabled="isTesting || !internalSelectedModel"
              :loading="isTesting"
              type="primary"
              size="medium"
              class="h-10 px-4 text-sm font-medium"
            >
              {{ isTesting ? t('test.testing') : (isCompareMode ? t('test.startCompare') : t('test.startTest')) }}
            </NButton>
          </div>
        </div>
      </NCard>
    </div>

    <!-- Test Results Area -->
    <div class="flex-1 min-h-0 mt-4">
      <div
        class="relative h-full"
        :class="{
          'md:flex md:gap-3': isCompareMode,
          'block': !isCompareMode
        }"
      >
        <!-- Original Prompt Test Result -->
        <div
          v-if="isCompareMode"
          class="flex flex-col min-h-0 transition-all duration-300 min-h-[80px]"
          :style="{
            height: isCompareMode ? 'auto' : '0px'
          }"
          :class="{
            'md:absolute md:inset-0 md:h-full md:w-[calc(50%-6px)] md:left-0': isCompareMode,
            'hidden': !isCompareMode
          }"
        >
          <h3 class="text-lg font-semibold truncate mb-3 flex-none">
            {{ t('test.originalResult') }}
          </h3>
          <OutputDisplay
            :content="originalTestResult"
            :reasoning="originalTestReasoning"
            :streaming="isTestingOriginal"
            :enableDiff="false"
            mode="readonly"
            class="flex-1 min-h-0"
          />
        </div>

        <!-- Optimized Prompt Test Result -->
        <div
          class="flex flex-col min-h-0 transition-all duration-300 min-h-[80px]"
          :style="{
            height: isCompareMode ? 'auto' : '100%'
          }"
          :class="{
            'md:absolute md:inset-0 md:h-full md:w-[calc(50%-6px)] md:left-[calc(50%+6px)]': isCompareMode,
            'md:absolute md:inset-0 md:h-full md:w-full md:left-0': !isCompareMode
          }"
        >
          <h3 class="text-lg font-semibold truncate mb-3 flex-none">
            {{ isCompareMode ? t('test.optimizedResult') : t('test.testResult') }}
          </h3>
          <OutputDisplay
            :content="optimizedTestResult"
            :reasoning="optimizedTestReasoning"
            :streaming="isTestingOptimized"
            :enableDiff="false"
            mode="readonly"
            class="flex-1 min-h-0"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

import { useI18n } from 'vue-i18n'
import { NButton, NCard } from 'naive-ui'
import { useToast } from '../composables/useToast'
import type { AppServices } from '../types/services'
import InputPanelUI from './InputPanel.vue'
import ModelSelectUI from './ModelSelect.vue'
import OutputDisplay from './OutputDisplay.vue'

const { t } = useI18n()
const toast = useToast()

interface Props {
  services: AppServices
  originalPrompt: string
  optimizedPrompt: string
  optimizationMode: 'system' | 'user'
  selectedModel: string
  isCompareMode: boolean
}

const props = withDefaults(defineProps<Props>(), {
  originalPrompt: '',
  optimizedPrompt: '',
  optimizationMode: 'system',
  selectedModel: '',
  isCompareMode: true
})

const emit = defineEmits<{
  'update:selectedModel': [value: string]
  'showConfig': []
}>()

// 内部状态
const testModelSelect = ref(null)
const internalSelectedModel = ref(props.selectedModel)
const testContent = ref('')
const isCompareMode = ref(props.isCompareMode)

// 测试状态
const originalTestResult = ref('')
const originalTestError = ref('')
const isTestingOriginal = ref(false)
const originalTestReasoning = ref('')

const optimizedTestResult = ref('')
const optimizedTestError = ref('')
const isTestingOptimized = ref(false)
const optimizedTestReasoning = ref('')

const isTesting = computed(() => isTestingOriginal.value || isTestingOptimized.value)

// 方法
const toggleCompareMode = () => {
  isCompareMode.value = !isCompareMode.value
}

// 方法
const ensureString = (value: string | number | boolean | null | undefined): string => {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

const updateSelectedModel = (value: string) => {
  internalSelectedModel.value = value
  emit('update:selectedModel', value)
}

const testOriginalPrompt = async () => {
  if (!props.originalPrompt) return

  isTestingOriginal.value = true
  originalTestResult.value = ''
  originalTestError.value = ''
  originalTestReasoning.value = ''
  
  await nextTick()

  try {
    const streamHandler = {
      onToken: (token: string) => {
        originalTestResult.value += token
      },
      onReasoningToken: (reasoningToken: string) => {
        originalTestReasoning.value += reasoningToken
      },
      onComplete: () => {},
      onError: (err: Error) => {
        const errorMessage = err.message || t('test.error.failed')
        originalTestError.value = errorMessage
        toast.error(errorMessage)
      }
    }

    let systemPrompt = ''
    let userPrompt = ''

    if (props.optimizationMode === 'user') {
      systemPrompt = ''
      userPrompt = ensureString(props.originalPrompt)
    } else {
      systemPrompt = ensureString(props.originalPrompt)
      userPrompt = testContent.value
    }

    await props.services?.promptService.testPromptStream(
      systemPrompt,
      userPrompt,
      internalSelectedModel.value,
      streamHandler
    )
  } catch (error) {
    console.error('[BasicTestMode] Original prompt test failed:', error)
    const errorMessage = error.message || t('test.error.failed')
    originalTestError.value = errorMessage
    toast.error(errorMessage)
    originalTestResult.value = ''
  } finally {
    isTestingOriginal.value = false
  }
}

const testOptimizedPrompt = async () => {
  if (!props.optimizedPrompt) return

  isTestingOptimized.value = true
  optimizedTestResult.value = ''
  optimizedTestError.value = ''
  optimizedTestReasoning.value = ''
  
  await nextTick()

  try {
    const streamHandler = {
      onToken: (token: string) => {
        optimizedTestResult.value += token
      },
      onReasoningToken: (reasoningToken: string) => {
        optimizedTestReasoning.value += reasoningToken
      },
      onComplete: () => {},
      onError: (err: Error) => {
        const errorMessage = err.message || t('test.error.failed')
        optimizedTestError.value = errorMessage
        toast.error(errorMessage)
      }
    }

    let systemPrompt = ''
    let userPrompt = ''

    if (props.optimizationMode === 'user') {
      systemPrompt = ''
      userPrompt = ensureString(props.optimizedPrompt)
    } else {
      systemPrompt = ensureString(props.optimizedPrompt)
      userPrompt = testContent.value
    }

    await props.services?.promptService.testPromptStream(
      systemPrompt,
      userPrompt,
      internalSelectedModel.value,
      streamHandler
    )
  } catch (error) {
    console.error('[BasicTestMode] Optimized prompt test failed:', error)
    const errorMessage = error.message || t('test.error.failed')
    optimizedTestError.value = errorMessage
    toast.error(errorMessage)
    optimizedTestResult.value = ''
  } finally {
    isTestingOptimized.value = false
  }
}

const handleTest = async () => {
  if (!internalSelectedModel.value) {
    toast.error(t('test.error.noModel'))
    return
  }

  if (props.optimizationMode === 'system' && !testContent.value) {
    toast.error(t('test.error.noTestContent'))
    return
  }

  if (props.isCompareMode) {
    try {
      await Promise.all([
        testOriginalPrompt().catch(error => {
          console.error('[BasicTestMode] Original prompt test failed:', error)
          const errorMessage = error.message || t('test.error.failed')
          originalTestError.value = errorMessage
          toast.error(errorMessage)
        }),
        testOptimizedPrompt().catch(error => {
          console.error('[BasicTestMode] Optimized prompt test failed:', error)
          const errorMessage = error.message || t('test.error.failed')
          optimizedTestError.value = errorMessage
          toast.error(errorMessage)
        })
      ])
    } catch (error) {
      console.error('[BasicTestMode] Test process error:', error)
    }
  } else {
    await testOptimizedPrompt()
  }
}

// 监听
watch(() => props.selectedModel, (newVal) => {
  if (newVal && newVal !== internalSelectedModel.value) {
    internalSelectedModel.value = newVal
  }
})
</script>

