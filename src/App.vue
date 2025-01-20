<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-900 to-purple-950 flex flex-col">
    <!-- 顶部导航栏 -->
    <header class="flex-none sticky top-0 z-40 bg-purple-800/90 backdrop-blur-sm border-b border-purple-700 shadow-lg">
      <div class="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
        <h1 class="text-xl sm:text-2xl font-bold text-white">
          Prompt Optimizer
        </h1>
        <div class="flex items-center space-x-4 sm:space-x-6">
          <button
            @click="showHistory = true"
            class="text-white/80 hover:text-white transition-colors flex items-center space-x-2 hover:scale-105 transform"
          >
            <span>📜</span>
            <span class="hidden sm:inline">历史</span>
          </button>
          <button
            @click="showConfig = true"
            class="text-white/80 hover:text-white transition-colors flex items-center space-x-2 hover:scale-105 transform"
          >
            <span>⚙️</span>
            <span class="hidden sm:inline">设置</span>
          </button>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="flex-1 container mx-auto p-4 sm:p-6 overflow-hidden">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 h-[calc(100vh-8rem)]">
        <!-- 提示词区 -->
        <div class="lg:col-span-5 flex flex-col min-h-0">
          <div class="bg-gray-900/50 backdrop-blur-sm rounded-xl shadow-lg border border-purple-700/50 overflow-hidden flex flex-col h-full">
            <div class="p-4 sm:p-6 space-y-4 sm:space-y-6 flex flex-col flex-1">
              <!-- 输入区域 -->
              <div class="flex-none">
                <InputPanel
                  v-model="prompt"
                  v-model:model="optimizeModel"
                  :models="enabledModels"
                  label="原始提示词"
                  placeholder="请输入需要优化的prompt..."
                  model-label="优化模型"
                  button-text="开始优化 →"
                  loading-text="优化中..."
                  :loading="isOptimizing"
                  :disabled="isOptimizing"
                  @submit="handleOptimizePrompt"
                />
              </div>

              <!-- 优化结果区域 -->
              <div class="flex-1 min-h-0">
                <PromptPanel 
                  :optimized-prompt="optimizedPrompt"
                  :is-iterating="isIterating"
                  @iterate="handleIteratePrompt"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 测试区域 -->
        <div class="lg:col-span-7 flex flex-col min-h-0">
          <div class="bg-gray-900/50 backdrop-blur-sm rounded-xl shadow-lg border border-purple-700/50 overflow-hidden flex flex-col h-full">
            <div class="p-4 sm:p-6 space-y-4 sm:space-y-6 flex flex-col flex-1">
              <!-- 测试输入区域 -->
              <div class="flex-none">
                <InputPanel
                  v-model="testContent"
                  v-model:model="selectedModel"
                  :models="enabledModels"
                  label="测试内容"
                  placeholder="请输入要测试的内容..."
                  model-label="模型"
                  button-text="开始测试 →"
                  loading-text="测试中..."
                  :loading="isTesting"
                  :disabled="isTesting"
                  @submit="handleTest"
                />
              </div>

              <!-- 测试结果区域 -->
              <div class="flex-1 min-h-0">
                <OutputPanel
                  :loading="isTesting"
                  :error="testError"
                  :result="testResult"
                  @copy="copyResult"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 配置弹窗 -->
    <Teleport to="body">
      <ModelManager
        v-if="showConfig"
        @close="showConfig = false"
      />
    </Teleport>

    <!-- 历史记录抽屉 -->
    <HistoryDrawer
      :show="showHistory"
      :history="history"
      @close="showHistory = false"
      @select="handleSelectHistory"
    />

    <!-- 全局提示 -->
    <Toast />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { llmService } from './services/llm'
import { promptManager } from './services/promptManager'
import ModelManager from './components/ModelManager.vue'
import Toast from './components/Toast.vue'
import HistoryDrawer from './components/HistoryDrawer.vue'
import PromptPanel from './components/PromptPanel.vue'
import InputPanel from './components/InputPanel.vue'
import OutputPanel from './components/OutputPanel.vue'
import { useToast } from './composables/useToast'

// 状态
const prompt = ref('')
const optimizedPrompt = ref('')
const testContent = ref('')
const testResult = ref('')
const testError = ref('')
const isOptimizing = ref(false)
const isIterating = ref(false)
const isTesting = ref(false)
const showConfig = ref(false)
const showHistory = ref(false)
const optimizeModel = ref('')
const selectedModel = ref('')
const history = ref([])
const models = ref([])

// 初始化 toast
const toast = useToast()

// 计算属性
const enabledModels = computed(() => 
  models.value.filter(model => model.enabled)
)

// 方法
const loadModels = async () => {
  models.value = llmService.getAllModels()
  
  // 设置默认模型
  const defaultModel = enabledModels.value[0]?.key
  if (defaultModel) {
    optimizeModel.value = defaultModel
    selectedModel.value = defaultModel
  }
}

const handleOptimizePrompt = async () => {
  if (!prompt.value.trim() || isOptimizing.value) return
  
  isOptimizing.value = true
  try {
    const result = await llmService.optimizePrompt(prompt.value, 'optimize')
    optimizedPrompt.value = result
    promptManager.addToHistory(prompt.value, result, 'optimize')
    toast.success('优化成功')
  } catch (error) {
    console.error('优化失败:', error)
    toast.error(error.message || '优化失败')
  } finally {
    isOptimizing.value = false
  }
}

const handleIteratePrompt = async ({ originalPrompt, iterateInput }) => {
  if (!originalPrompt || !iterateInput || isIterating.value) return

  isIterating.value = true
  try {
    const result = await llmService.iteratePrompt(originalPrompt, iterateInput)
    optimizedPrompt.value = result
    
    // 获取最近的历史记录作为父记录
    const history = promptManager.getHistory()
    const parentRecord = history[0] // 最新的记录将是父记录
    
    // 添加到历史记录，类型为iterate，并设置父记录ID
    promptManager.addToHistory(
      originalPrompt,
      result,
      'iterate',
      parentRecord?.id
    )
    
    toast.success('迭代优化成功')
  } catch (error) {
    console.error('迭代优化失败:', error)
    toast.error(error.message || '迭代优化失败')
  } finally {
    isIterating.value = false
  }
}

const handleTest = async () => {
  if (!testContent.value.trim() || isTesting.value) return
  
  isTesting.value = true
  testError.value = ''
  try {
    const messages = [
      { role: 'system', content: optimizedPrompt.value || prompt.value },
      { role: 'user', content: testContent.value }
    ]
    testResult.value = await llmService.sendMessage(messages)
  } catch (err) {
    testError.value = '测试失败：' + err.message
  } finally {
    isTesting.value = false
  }
}

const copyResult = async () => {
  try {
    await navigator.clipboard.writeText(testResult.value)
    toast.success('复制成功')
  } catch (err) {
    toast.error('复制失败')
  }
}

const handleSelectHistory = (item) => {
  prompt.value = item.prompt
  optimizedPrompt.value = item.optimized
  showHistory.value = false
}

// 生命周期
onMounted(async () => {
  await loadModels()
  await promptManager.init()
  history.value = promptManager.getHistory()
})
</script>

<style>
.custom-select {
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  background-image: none !important;
}

.custom-select::-ms-expand {
  display: none;
}
</style>