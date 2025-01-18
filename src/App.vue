<template>
  <div class="min-h-screen p-8">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-4xl font-bold text-blue-600">Prompt Optimizer</h1>
      <div class="flex items-center space-x-4">
        <button
          @click="showHistory = true"
          class="text-gray-600 hover:text-gray-700"
        >
          📜 历史
        </button>
        <button
          @click="showConfig = true"
          class="text-gray-600 hover:text-gray-700"
        >
          ⚙️ 设置
        </button>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- 提示词区 -->
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="text-gray-700 font-medium">原始提示词</label>
          <textarea
            v-model="prompt"
            rows="4"
            class="w-full p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入需要优化的prompt..."
            :disabled="isOptimizing"
          ></textarea>
        </div>
        
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-gray-700">优化模型:</span>
            <select 
              v-model="optimizeModel"
              class="rounded-lg border border-gray-300 px-4 py-1.5 appearance-none bg-white bg-no-repeat bg-[right_8px_center] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==')]"
              :disabled="isOptimizing"
              :style="{ minWidth: getSelectWidth(enabledModels) + 'px' }"
            >
              <option v-for="model in enabledModels" 
                      :key="model.key" 
                      :value="model.key">
                {{ model.name }}
              </option>
            </select>
          </div>
          
          <button
            @click="handleOptimizePrompt"
            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isOptimizing || !prompt.trim()"
          >
            <span v-if="isOptimizing" class="animate-spin">⏳</span>
            <span>{{ isOptimizing ? '优化中...' : '开始优化 →' }}</span>
          </button>
        </div>

        <PromptPanel 
          :optimized-prompt="optimizedPrompt"
        />
      </div>

      <!-- 输入区 -->
      <InputPanel
        v-model="testContent"
        v-model:model="selectedModel"
        :enabled-models="enabledModels"
        :is-loading="isTesting"
        @test="handleTest"
      />

      <!-- 输出区 -->
      <OutputPanel
        :result="testResult"
        :error="error"
      />
    </div>

    <!-- API 配置弹窗 -->
    <div v-if="showConfig" 
         class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-4 border-b">
          <h2 class="text-xl font-semibold">模型配置</h2>
          <button @click="showConfig = false" class="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <ModelManager @saved="handleConfigSaved" />
      </div>
    </div>
    
    <!-- 历史记录抽屉 -->
    <HistoryDrawer
      v-if="showHistory"
      :show="showHistory"
      :history="promptHistory"
      @close="showHistory = false"
      @reuse="reuseHistory"
    />
    
    <!-- 提示组件 -->
    <Toast :message="toastMessage" />
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