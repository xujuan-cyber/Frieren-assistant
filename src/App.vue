<template>
  <div class="min-h-screen p-8 flex items-center justify-center">
    <div class="bg-white/90 backdrop-blur-sm rounded-3xl p-8 w-full max-w-3xl shadow-xl">
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
      
      <div class="space-y-6">
        <!-- 输入区域 -->
        <div class="space-y-2">
          <label class="text-gray-700 font-medium">原始提示词</label>
          <textarea
            v-model="prompt"
            rows="4"
            class="w-full p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入需要优化的prompt..."
            :disabled="isLoading"
          ></textarea>
        </div>
        
        <!-- 控制面板 -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div class="flex items-center space-x-2">
            <span class="text-gray-700">模型:</span>
            <select 
              v-model="selectedModel"
              class="rounded-lg border border-gray-300 px-4 py-1.5 min-w-[160px] appearance-none bg-white bg-no-repeat bg-[right_8px_center] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==')]"
              :disabled="isLoading"
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
            :disabled="isLoading || !prompt.trim()"
          >
            <span v-if="isLoading" class="animate-spin">⏳</span>
            <span>{{ isLoading ? '优化中...' : '开始优化 →' }}</span>
          </button>
        </div>

        <!-- 错误提示 -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {{ error }}
        </div>
        
        <!-- 结果展示 -->
        <div v-if="result" class="space-y-2">
          <label class="text-gray-700 font-medium">优化结果</label>
          <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p class="whitespace-pre-wrap">{{ result }}</p>
          </div>
          
          <div class="flex justify-end">
            <button
              @click="copyResult"
              class="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
            >
              <span>复制结果</span>
            </button>
          </div>
        </div>
      </div>
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
import { llmService } from './services/llm'
import { promptManager } from './services/promptManager'

const prompt = ref('')
const selectedModel = ref('')
const result = ref('')
const isLoading = ref(false)
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

const handleOptimizePrompt = async () => {
  if (!prompt.value.trim()) return
  
  isLoading.value = true
  error.value = ''
  result.value = ''
  
  try {
    // 设置当前选择的模型
    llmService.setProvider(selectedModel.value)
    // 使用新的 LLM 服务
    const optimizedResult = await llmService.optimizePrompt(prompt.value, 'optimize')
    result.value = optimizedResult
    
    // 保存到历史记录
    saveToHistory()
  } catch (e) {
    error.value = e.message || '优化失败，请稍后重试'
    console.error('优化错误:', e)
  } finally {
    isLoading.value = false
  }
}

const copyResult = async () => {
  try {
    await navigator.clipboard.writeText(result.value)
    toastMessage.value = '复制成功'
  } catch (e) {
    console.error('复制失败:', e)
    toastMessage.value = '复制失败'
  }
}

// 添加提示词历史记录功能
const promptHistory = ref([])

// 保存到历史记录
const saveToHistory = () => {
  const historyItem = {
    id: Date.now(),
    original: prompt.value,
    optimized: result.value,
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
  result.value = item.optimized
}
</script> 