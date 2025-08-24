<template>
  <NFlex vertical :style="{ flex: 1, overflow: 'auto', height: '100%' }">
    <!-- Test Input Area -->
    <NCard size="small" 
    content-style="height: 30%; max-height: 30%;"
    >
      <!-- Show test input only for system prompt optimization -->
      <InputPanelUI
        v-if="optimizationMode === 'system'"
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
          <ModelSelectUI
            ref="testModelSelect"
            :modelValue="selectedTestModel"
            @update:modelValue="updateSelectedModel"
            :disabled="isTesting"
            @config="$emit('showConfig')"
          />
        </template>
        <template #control-buttons>
          <NSpace align="center" class="flex-1">
            <NSpace>
              <NButton
                @click="isCompareMode = !isCompareMode"
                :type="isCompareMode ? 'primary' : 'default'"
                size="medium"
                class="h-10 text-sm whitespace-nowrap"
              >
                {{ isCompareMode ? t('test.toggleCompare.disable') : t('test.toggleCompare.enable') }}
              </NButton>
            </NSpace>
          </NSpace>
        </template>
      </InputPanelUI>

      <!-- For user prompt optimization, show simplified test controls -->
      <NCard v-else
       :style="{ flex: 1, minHeight: '200px', overflow: 'hidden' }"
          content-style="height: 100%; max-height: 100%; overflow: hidden;"
          >

        <NFlex justify="space-between" align="center">
          <span class="text-lg font-medium">{{ t('test.userPromptTest') }}</span>
          <NSpace size="medium">
            <ModelSelectUI
              ref="testModelSelect"
              :modelValue="selectedTestModel"
              @update:modelValue="updateSelectedModel"
              :disabled="isTesting"
              @config="$emit('showConfig')"
              class="w-48"
            />
            <NButton
              @click="isCompareMode = !isCompareMode"
              :type="isCompareMode ? 'primary' : 'default'"
              size="medium"
              class="h-10 text-sm whitespace-nowrap"
            >
              {{ isCompareMode ? t('test.toggleCompare.disable') : t('test.toggleCompare.enable') }}
            </NButton>
            <NButton
              @click="handleTest"
              :disabled="isTesting || !selectedTestModel"
              :loading="isTesting"
              type="primary"
              size="medium"
              class="h-10 px-4 text-sm font-medium"
            >
              {{ isTesting ? t('test.testing') : (isCompareMode ? t('test.startCompare') : t('test.startTest')) }}
            </NButton>
          </NSpace>
        </NFlex>
      </NCard>
    </NCard>

    <!-- Test Results Area -->
    <NCard :style="{ flex: 1, minHeight: '200px', overflow: 'hidden' }"
    content-style="height: 100%; max-height: 100%; overflow: hidden;"
    >
      <!-- 使用 NFlex 组件实现左右布局 -->
      <NFlex 
        v-if="isCompareMode" 
        justify="space-between" 
        :style="{ flex: 1, overflow: 'hidden', height: '100%' }"
      >
        <!-- 原始提示词结果 -->
        <NCard 
          size="small" 
          :style="{ flex: 1, height: '100%', overflow: 'hidden' }"
          content-style="height: 100%; max-height: 100%; overflow: hidden;"
          >
          <template #header>
            <span class="text-lg font-semibold">
              {{ t('test.originalResult') }}
            </span>
          </template>
          <OutputDisplay
            :content="originalTestResult"
            :reasoning="originalTestReasoning"
            :streaming="isTestingOriginal"
            :enableDiff="false"
            mode="readonly"
          />
        </NCard>
        
        <!-- 优化后提示词结果 -->
        <NCard 
          size="small" 
          :style="{ flex: 1, height: '100%', overflow: 'hidden' }"
          content-style="height: 100%; max-height: 100%; overflow: hidden;"
        >
          <template #header>
            <span class="text-lg font-semibold">
              {{ t('test.optimizedResult') }}
            </span>
          </template>
          <OutputDisplay
            :content="optimizedTestResult"
            :reasoning="optimizedTestReasoning"
            :streaming="isTestingOptimized"
            :enableDiff="false"
            mode="readonly"
          />
        </NCard>
      </NFlex>
      
      <!-- 单一结果模式 -->
      <NCard v-else size="small">
        <template #header>
          <span class="text-lg font-semibold">
            {{ t('test.testResult') }}
          </span>
        </template>
        <OutputDisplay
          :content="optimizedTestResult"
          :reasoning="optimizedTestReasoning"
          :streaming="isTestingOptimized"
          :enableDiff="false"
          mode="readonly"
        />
      </NCard>

    </NCard>
  </NFlex>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, withKeys } from 'vue'
import { useI18n } from 'vue-i18n'
import { NButton, NFlex, NCard, NSpace } from 'naive-ui'
import { useToast } from '../composables/useToast'
import InputPanelUI from './InputPanel.vue'
import ModelSelectUI from './ModelSelect.vue'
import OutputDisplay from './OutputDisplay.vue'

const { t } = useI18n()
const toast = useToast()

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
  },
  optimizationMode: {
    type: String,
    default: 'system'
  }
})

const emit = defineEmits(['showConfig', 'update:modelValue'])

const isCompareMode = ref(true)
const testModelSelect = ref(null)
const selectedTestModel = ref(props.modelValue || '')

watch(() => props.modelValue, (newVal) => {
  if (newVal && newVal !== selectedTestModel.value) {
    selectedTestModel.value = newVal
  }
})

const updateSelectedModel = (value) => {
  selectedTestModel.value = value
  emit('update:modelValue', value)
}

const originalTestResult = ref('')
const originalTestError = ref('')
const isTestingOriginal = ref(false)

// 添加推理内容状态
const originalTestReasoning = ref('')

const optimizedTestResult = ref('')
const optimizedTestError = ref('')
const isTestingOptimized = ref(false)

// 添加推理内容状态
const optimizedTestReasoning = ref('')

const isTesting = computed(() => isTestingOriginal.value || isTestingOptimized.value)
const testContent = ref('')

const ensureString = (value) => {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

const testOriginalPrompt = async () => {
  if (!props.originalPrompt) return

  isTestingOriginal.value = true
  originalTestResult.value = ''
  originalTestError.value = ''
  originalTestReasoning.value = ''
  
  await nextTick(); // 确保状态更新和DOM清空完成

  try {
    const streamHandler = {
      onToken: (token) => {
        originalTestResult.value += token
      },
      onReasoningToken: (reasoningToken) => {
        originalTestReasoning.value += reasoningToken
      },
      onComplete: () => { /* 流结束后不再需要设置 isTesting, 由 finally 处理 */ },
      onError: (err) => {
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

    await props.promptService.testPromptStream(
      systemPrompt,
      userPrompt,
      selectedTestModel.value,
      streamHandler
    )
  } catch (error) {
    console.error('[TestPanel] Original prompt test failed:', error); // 增加详细错误日志
    const errorMessage = error.message || t('test.error.failed')
    originalTestError.value = errorMessage
    toast.error(errorMessage)
    originalTestResult.value = ''
  } finally {
    // 确保无论成功或失败，加载状态最终都会被关闭
    isTestingOriginal.value = false
  }
}

const testOptimizedPrompt = async () => {
  if (!props.optimizedPrompt) return

  isTestingOptimized.value = true
  optimizedTestResult.value = ''
  optimizedTestError.value = ''
  optimizedTestReasoning.value = ''
  
  await nextTick(); // 确保状态更新和DOM清空完成

  try {
    const streamHandler = {
      onToken: (token) => {
        optimizedTestResult.value += token
      },
      onReasoningToken: (reasoningToken) => {
        optimizedTestReasoning.value += reasoningToken
      },
      onComplete: () => { /* 流结束后不再需要设置 isTesting, 由 finally 处理 */ },
      onError: (err) => {
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

    await props.promptService.testPromptStream(
      systemPrompt,
      userPrompt,
      selectedTestModel.value,
      streamHandler
    )
  } catch (error) {
    console.error('[TestPanel] Optimized prompt test failed:', error); // 增加详细错误日志
    const errorMessage = error.message || t('test.error.failed')
    optimizedTestError.value = errorMessage
    toast.error(errorMessage)
    optimizedTestResult.value = ''
  } finally {
    // 确保无论成功或失败，加载状态最终都会被关闭
    isTestingOptimized.value = false
  }
}

const handleTest = async () => {
  if (!selectedTestModel.value) {
    toast.error(t('test.error.noModel'))
    return
  }

  // For user prompt optimization, we don't need test content input
  // For system prompt optimization, we need test content input
  if (props.optimizationMode === 'system' && !testContent.value) {
    toast.error(t('test.error.noTestContent'))
    return
  }

  if (isCompareMode.value) {
    // Compare test mode: test both original and optimized prompts
    try {
      await Promise.all([
        testOriginalPrompt().catch(error => {
          console.error('[TestPanel] Original prompt test failed:', error)
          const errorMessage = error.message || t('test.error.failed')
          originalTestError.value = errorMessage
          toast.error(errorMessage)
        }),
        testOptimizedPrompt().catch(error => {
          console.error('[TestPanel] Optimized prompt test failed:', error)
          const errorMessage = error.message || t('test.error.failed')
          optimizedTestError.value = errorMessage
          toast.error(errorMessage)
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

onMounted(() => {
  if (props.modelValue) {
    selectedTestModel.value = props.modelValue
  }
})
</script>

<style scoped>
/* 使用 Naive UI 组件，无需额外样式 */
</style>