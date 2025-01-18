<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-900 to-purple-950">
    <!-- 顶部导航栏 -->
    <header class="sticky top-0 z-40 bg-purple-800/90 backdrop-blur-sm border-b border-purple-700">
      <div class="container mx-auto px-4 py-3 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-white">
          Prompt Optimizer
        </h1>
        <div class="flex items-center space-x-4">
          <button
            @click="showHistory = true"
            class="text-white/80 hover:text-white transition-colors"
          >
            📜 历史
          </button>
          <button
            @click="showConfig = true"
            class="text-white/80 hover:text-white transition-colors"
          >
            ⚙️ 设置
          </button>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="container mx-auto p-4">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 min-h-[calc(100vh-5rem)]">
        <!-- 提示词区 -->
        <div class="bg-gray-900/50 backdrop-blur-sm rounded-xl shadow-lg border border-purple-700/50 overflow-hidden flex flex-col">
          <div class="p-4 space-y-4 flex-1 min-h-0 flex flex-col">
            <div class="h-[120px] flex flex-col space-y-2 flex-none">
              <label class="text-white/90 font-medium flex-none">原始提示词</label>
              <div class="relative flex-1 min-h-0">
                <textarea
                  v-model="prompt"
                  class="absolute inset-0 w-full h-full p-4 rounded-xl bg-black/20 border border-purple-600/50 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent text-white placeholder-gray-500 resize-none"
                  placeholder="请输入需要优化的prompt..."
                  :disabled="isOptimizing"
                ></textarea>
              </div>
            </div>
            
            <div class="flex items-center justify-between flex-wrap gap-4 flex-none">
              <div class="flex items-center space-x-2">
                <span class="text-white/90 whitespace-nowrap">优化模型:</span>
                <div class="relative min-w-[160px]">
                  <select 
                    v-model="optimizeModel"
                    class="w-full rounded-lg bg-black/20 border border-purple-600/50 px-4 py-1.5 text-white appearance-none cursor-pointer"
                    :disabled="isOptimizing"
                  >
                    <option v-for="model in enabledModels" 
                            :key="model.key" 
                            :value="model.key"
                            class="bg-gray-900 text-white"
                    >
                      {{ model.name }}
                    </option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg class="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <button
                @click="handleOptimizePrompt"
                class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-none"
                :disabled="isOptimizing || !prompt.trim()"
              >
                <span v-if="isOptimizing" class="animate-spin">⏳</span>
                <span>{{ isOptimizing ? '优化中...' : '开始优化 →' }}</span>
              </button>
            </div>

            <PromptPanel 
              :optimized-prompt="optimizedPrompt"
              class="flex-1 min-h-0"
            />
          </div>
        </div>

        <!-- 输入区 -->
        <div class="bg-gray-900/50 backdrop-blur-sm rounded-xl shadow-lg border border-purple-700/50 overflow-hidden flex flex-col">
          <InputPanel
            v-model="testContent"
            :model-content="selectedModel"
            :enabled-models="enabledModels"
            :is-loading="isTesting"
            @test="handleTest"
            @update:model="selectedModel = $event"
          />
        </div>

        <!-- 输出区 -->
        <div class="bg-gray-900/50 backdrop-blur-sm rounded-xl shadow-lg border border-purple-700/50 overflow-hidden flex flex-col">
          <OutputPanel
            :result="testResult"
            :error="error"
          />
        </div>
      </div>
    </main>

    <!-- API 配置弹窗 -->
    <Teleport to="body">
      <div v-if="showConfig" 
           class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-purple-700/50">
          <div class="flex justify-between items-center p-4 border-b border-purple-700/50">
            <h2 class="text-xl font-semibold text-white">模型配置</h2>
            <button @click="showConfig = false" class="text-white/60 hover:text-white transition-colors">
              ✕
            </button>
          </div>
          <ModelManager @saved="handleConfigSaved" />
        </div>
      </div>
    </Teleport>
    
    <!-- 历史记录抽屉 -->
    <HistoryDrawer
      v-if="showHistory"
      :show="showHistory"
      :history="promptHistory"
      @close="showHistory = false"
      @use="reuseHistory"
    />

    <!-- 全局提示 -->
    <Toast />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ModelManager from './components/ModelManager.vue'
import Toast from './components/Toast.vue'
import HistoryDrawer from './components/HistoryDrawer.vue'
import PromptPanel from './components/PromptPanel.vue'
import InputPanel from './components/InputPanel.vue'
import OutputPanel from './components/OutputPanel.vue'
import { llmService } from './services/llm'
import { promptManager } from './services/promptManager'

// 提示词相关状态
const prompt = ref('')
const optimizedPrompt = ref('')
const isOptimizing = ref(false)
const optimizeModel = ref('')

// 测试相关状态
const testContent = ref('')
const testResult = ref('')
const isTesting = ref(false)

// 通用状态
const selectedModel = ref('')
const error = ref('')
const showConfig = ref(false)
const toastMessage = ref('')
const showHistory = ref(false)
const enabledModels = ref([])

// 初始化
onMounted(async () => {
  try {
    await promptManager.init();
    
    // 加载已启用的模型
    enabledModels.value = llmService.getEnabledModels();
    if (enabledModels.value.length > 0) {
      selectedModel.value = enabledModels.value[0].key;
      optimizeModel.value = enabledModels.value[0].key;
    }
    
    // 加载历史记录
    const savedHistory = localStorage.getItem('promptHistory')
    if (savedHistory) {
      try {
        promptHistory.value = JSON.parse(savedHistory)
      } catch (e) {
        console.error('加载历史记录失败:', e)
      }
    }
  } catch (e) {
    error.value = '初始化失败: ' + e.message;
    console.error('初始化失败:', e);
  }
})

// 优化提示词
const handleOptimizePrompt = async () => {
  if (!prompt.value.trim()) return
  
  isOptimizing.value = true
  error.value = ''
  optimizedPrompt.value = ''
  
  try {
    // 设置当前选择的模型
    llmService.setProvider(optimizeModel.value)
    // 使用新的 LLM 服务
    const result = await llmService.optimizePrompt(prompt.value, 'optimize')
    optimizedPrompt.value = result
    
    // 保存到历史记录
    saveToHistory()
  } catch (e) {
    error.value = e.message || '优化失败，请稍后重试'
    console.error('优化错误:', e)
  } finally {
    isOptimizing.value = false
  }
}

// 使用优化后的提示词进行测试
const handleTest = async () => {
  if (!testContent.value.trim()) return
  
  isTesting.value = true
  error.value = ''
  testResult.value = ''
  
  try {
    // 设置当前选择的模型
    llmService.setProvider(selectedModel.value)
    // 使用优化后的提示词或原始提示词进行测试
    const systemPrompt = optimizedPrompt.value || prompt.value
    const result = await llmService.sendMessage([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: testContent.value }
    ])
    testResult.value = result
  } catch (e) {
    error.value = e.message || '测试失败，请稍后重试'
    console.error('测试错误:', e)
  } finally {
    isTesting.value = false
  }
}

// 计算下拉框宽度
const getSelectWidth = (models) => {
  if (!models.length) return 160
  const maxLength = Math.max(...models.map(m => m.name.length))
  return Math.max(160, maxLength * 12)  // 12px per character as estimation
}

// 使用优化后的提示词
const useOptimizedPrompt = () => {
  // 可以在这里添加一些额外的逻辑
  toastMessage.value = '已选择使用此提示词'
}

// 添加提示词历史记录功能
const promptHistory = ref([])

// 保存到历史记录
const saveToHistory = () => {
  const historyItem = {
    id: Date.now(),
    original: prompt.value,
    optimized: optimizedPrompt.value,
    timestamp: new Date().toISOString(),
  }
  promptHistory.value.unshift(historyItem)
  
  // 只保留最近的 10 条记录
  if (promptHistory.value.length > 10) {
    promptHistory.value.pop()
  }
  
  // 保存到本地存储
  localStorage.setItem('promptHistory', JSON.stringify(promptHistory.value))
}

// 处理配置保存
const handleConfigSaved = () => {
  // 重新加载已启用的模型
  enabledModels.value = llmService.getEnabledModels();
  if (enabledModels.value.length > 0 && !enabledModels.value.find(m => m.key === selectedModel.value)) {
    selectedModel.value = enabledModels.value[0].key;
  }
  toastMessage.value = '模型配置已保存'
}

// 重用历史记录
const reuseHistory = (item) => {
  prompt.value = item.original
  optimizedPrompt.value = item.optimized
}
</script>