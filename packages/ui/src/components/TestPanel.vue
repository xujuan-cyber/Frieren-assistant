<template>
  <ContentCardUI>
    <div class="flex flex-col h-full">
      <!-- 测试输入区域 -->
      <div class="flex-none">
        <InputPanelUI
          v-model="testContent"
          v-model:selectedModel="selectedTestModel"
          label="测试内容"
          placeholder="请输入要测试的内容..."
          model-label="模型"
          :button-text="isCompareMode ? '开始对比测试 →' : '开始测试 →'"
          loading-text="测试中..."
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
                class="theme-button-secondary px-3 py-1.5 text-sm whitespace-nowrap"
                :class="{ 'theme-button-primary': isCompareMode }"
              >
                {{ isCompareMode ? '关闭对比' : '开启对比' }}
              </button>
            </div>
          </template>
        </InputPanelUI>
      </div>

      <!-- 测试结果区域 -->
      <div class="flex-1 min-h-0 overflow-y-auto">
        <div class="relative h-full">
          <!-- 原始提示词测试结果 -->
          <div 
            v-show="isCompareMode" 
            class="absolute inset-0 flex flex-col md:w-1/2"
          >
            <h3 class="text-lg font-semibold theme-text mb-2">原始提示词结果</h3>
            <OutputPanelUI
              ref="originalOutputPanelRef"
              :loading="isTestingOriginal"
              :error="originalTestError"
              :result="originalTestResult"
              class="flex-1"
              hide-title
            />
          </div>
          
          <!-- 优化后提示词测试结果 -->
          <div 
            class="absolute inset-0 flex flex-col"
            :class="{
              'md:w-1/2 md:left-1/2 transition-[width,left] duration-300': isCompareMode,
              'w-full': !isCompareMode
            }"
          >
            <h3 class="text-lg font-semibold theme-text mb-2">
              {{ isCompareMode ? '优化后提示词结果' : '测试结果' }}
            </h3>
            <OutputPanelUI
              ref="optimizedOutputPanelRef"
              :loading="isTestingOptimized"
              :error="optimizedTestError"
              :result="optimizedTestResult"
              class="flex-1"
              hide-title
            />
          </div>
        </div>
      </div>
    </div>
  </ContentCardUI>
</template>

<script setup>
import { ref, toRef, computed, watch, onMounted, nextTick } from 'vue'
import ContentCardUI from './ContentCard.vue'
import InputPanelUI from './InputPanel.vue'
import ModelSelectUI from './ModelSelect.vue'
import OutputPanelUI from './OutputPanel.vue'

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

// 测试模式控制
const isCompareMode = ref(true)

const testModelSelect = ref(null)
const originalOutputPanelRef = ref(null)
const optimizedOutputPanelRef = ref(null)
const selectedTestModel = ref(props.modelValue || '')
const promptServiceRef = toRef(props, 'promptService')

// 监听外部模型值变化
watch(() => props.modelValue, (newVal) => {
  if (newVal && newVal !== selectedTestModel.value) {
    selectedTestModel.value = newVal
  }
})

// 更新选中的模型
const updateSelectedModel = (value) => {
  selectedTestModel.value = value
  emit('update:modelValue', value)
}

// 原始提示词测试状态
const originalTestResult = ref('')
const originalTestError = ref('')
const isTestingOriginal = ref(false)

// 优化后提示词测试状态
const optimizedTestResult = ref('')
const optimizedTestError = ref('')
const isTestingOptimized = ref(false)

// 整体测试状态
const isTesting = computed(() => isTestingOriginal.value || isTestingOptimized.value)

// 测试内容
const testContent = ref('')

// 确保prompt是字符串
const ensureString = (value) => {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

// 测试原始提示词
const testOriginalPrompt = async () => {
  if (!props.originalPrompt || !testContent.value) return
  
  isTestingOriginal.value = true
  originalTestError.value = ''
  
  try {
    if (originalOutputPanelRef.value) {
      const streamHandler = originalOutputPanelRef.value.handleStream()
      
      // 确保prompt是字符串
      const promptStr = ensureString(props.originalPrompt)
      console.log('原始提示词类型:', typeof promptStr, promptStr.substring(0, 30))
      
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
    console.error('原始提示词测试失败:', error)
    originalTestError.value = error.message || '测试失败'
    originalTestResult.value = ''
  } finally {
    isTestingOriginal.value = false
  }
}

// 测试优化后提示词
const testOptimizedPrompt = async () => {
  if (!props.optimizedPrompt || !testContent.value) return
  
  isTestingOptimized.value = true
  optimizedTestError.value = ''
  
  try {
    const outputPanel = optimizedOutputPanelRef.value
    
    if (outputPanel) {
      const streamHandler = outputPanel.handleStream()
      
      // 确保prompt是字符串
      const promptStr = ensureString(props.optimizedPrompt)
      console.log('优化后提示词类型:', typeof promptStr, promptStr.substring(0, 30))
      
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
    console.error('优化后提示词测试失败:', error)
    optimizedTestError.value = error.message || '测试失败'
    optimizedTestResult.value = ''
  } finally {
    isTestingOptimized.value = false
  }
}

// 测试处理函数
const handleTest = async () => {
  if (!selectedTestModel.value) {
    const errorMsg = '请先选择测试模型'
    originalTestError.value = errorMsg
    optimizedTestError.value = errorMsg
    return
  }
  
  if (isCompareMode.value) {
    // 对比测试模式：分别测试原始提示词和优化后提示词
    try {
      await Promise.all([
        testOriginalPrompt().catch(error => {
          console.error('原始提示词测试失败:', error)
          originalTestError.value = error.message || '测试失败'
        }),
        testOptimizedPrompt().catch(error => {
          console.error('优化后提示词测试失败:', error)
          optimizedTestError.value = error.message || '测试失败'
        })
      ])
    } catch (error) {
      console.error('测试过程出现错误:', error)
    }
  } else {
    // 普通测试模式：只测试优化后提示词
    await testOptimizedPrompt()
  }
}

// 组件挂载时，如果有默认模型，则自动选择
onMounted(() => {
  if (props.modelValue) {
    selectedTestModel.value = props.modelValue
  }
})

// 暴露需要的方法和属性给父组件
defineExpose({
  testModelSelect,
  selectedTestModel,
  testContent,
  originalTestResult,
  optimizedTestResult,
  isTesting,
  isCompareMode
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