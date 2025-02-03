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
                  v-model:optimized-prompt="optimizedPrompt"
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
                  ref="outputPanelRef"
                  :loading="isTesting"
                  :error="testError"
                  :result="testResult"
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
        @modelsUpdated="loadModels"
      />
    </Teleport>

    <!-- 历史记录抽屉 -->
    <HistoryDrawer
      :show="showHistory"
      :history="history"
      @close="showHistory = false"
      @reuse="handleSelectHistory"
    />

    <!-- 全局提示 -->
    <Toast />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed, watch } from 'vue'
import { createLLMService } from './services/llm/service'
import { createPromptService } from './services/prompt/service'
import { modelManager } from './services/model/manager'
import ModelManager from './components/ModelManager.vue'
import Toast from './components/Toast.vue'
import HistoryDrawer from './components/HistoryDrawer.vue'
import PromptPanel from './components/PromptPanel.vue'
import InputPanel from './components/InputPanel.vue'
import OutputPanel from './components/OutputPanel.vue'
import { useToast } from './composables/useToast'

// 初始化服务
const llmService = createLLMService(modelManager)
let promptService = null

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
const outputPanelRef = ref(null)

// 流式输出处理器
const streamHandler = {
  onToken: (token) => {
    testResult.value += token
  },
  onComplete: () => {
    isTesting.value = false
  },
  onError: (error) => {
    testError.value = error.message
    isTesting.value = false
  }
}

// 初始化 toast
const toast = useToast()

// 计算属性
const enabledModels = computed(() => 
  models.value.filter(model => model.enabled)
)

// 初始化 promptService
const initServices = async () => {
  try {
    promptService = await createPromptService(modelManager, llmService)
  } catch (error) {
    console.error('服务初始化失败:', error)
    toast.error('服务初始化失败')
  }
}

// 方法
const loadModels = async () => {
  models.value = modelManager.getAllModels()
  
  // 设置默认模型
  const defaultModel = enabledModels.value[0]?.key
  if (defaultModel) {
    // 如果当前选择的模型不在启用列表中，则更新为默认模型
    if (!enabledModels.value.find(m => m.key === optimizeModel.value)) {
      optimizeModel.value = defaultModel
    }
    if (!enabledModels.value.find(m => m.key === selectedModel.value)) {
      selectedModel.value = defaultModel
    }
  }
}

const handleOptimizePrompt = async () => {
  if (!prompt.value.trim() || isOptimizing.value) return
  if (!promptService) {
    toast.error('服务未初始化，请稍后重试')
    return
  }
  
  isOptimizing.value = true
  optimizedPrompt.value = ''  // 清空之前的结果
  
  try {
    console.log('开始优化提示词:', {
      prompt: prompt.value,
      modelKey: optimizeModel.value
    })

    // 使用流式调用
    await promptService.optimizePromptStream(
      prompt.value, 
      optimizeModel.value,
      {
        onToken: (token) => {
          optimizedPrompt.value += token;  // 直接更新到 optimizedPrompt
        },
        onComplete: () => {
          // 更新历史记录
          history.value = promptService.getHistory()
          toast.success('优化成功')
        },
        onError: (error) => {
          toast.error(error.message || '优化失败')
        }
      }
    );
  } catch (error) {
    console.error('优化失败:', {
      error,
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    toast.error(error.message || '优化失败')
  } finally {
    isOptimizing.value = false
  }
}

const handleIteratePrompt = async ({ originalPrompt, iterateInput }) => {
  if (!originalPrompt || !iterateInput || isIterating.value) return
  if (!promptService) {
    toast.error('服务未初始化，请稍后重试')
    return
  }

  isIterating.value = true
  optimizedPrompt.value = ''  // 清空之前的结果
  
  try {
    // 使用流式调用
    await promptService.iteratePromptStream(
      originalPrompt,
      iterateInput,
      optimizeModel.value,
      {
        onToken: (token) => {
          optimizedPrompt.value += token;  // 直接更新到 optimizedPrompt
        },
        onComplete: () => {
          // 更新历史记录
          history.value = promptService.getHistory()
          toast.success('迭代优化成功')
        },
        onError: (error) => {
          toast.error(error.message || '迭代优化失败')
        }
      }
    );
  } catch (error) {
    console.error('迭代优化失败:', error)
    toast.error(error.message || '迭代优化失败')
  } finally {
    isIterating.value = false
  }
}

const handleTest = async () => {
  if (!selectedModel.value || !testContent.value || !optimizedPrompt.value) {
    toast.error('请填写完整的测试信息');
    return;
  }

  console.log('开始测试:', {
    model: selectedModel.value,
    testContentLength: testContent.value.length,
    optimizedPromptLength: optimizedPrompt.value.length
  });

  isTesting.value = true;
  testError.value = '';

  try {
    const messages = [
      { role: 'system', content: optimizedPrompt.value },
      { role: 'user', content: testContent.value }
    ];

    // 获取流式处理器
    const streamHandlers = outputPanelRef.value?.handleStream();
    console.log('获取到流式处理器:', !!streamHandlers);
    
    if (streamHandlers) {
      console.log('使用流式调用');
      // 使用流式调用
      await llmService.sendMessageStream(
        messages,
        selectedModel.value,
        streamHandlers
      );
    } else {
      console.log('降级为非流式调用');
      // 降级为非流式调用
      const response = await llmService.sendMessage(messages, selectedModel.value);
      testResult.value = response;
    }
  } catch (error) {
    console.error('测试失败:', error);
    testError.value = error.message || '测试过程中发生错误';
  } finally {
    console.log('测试完成');
    isTesting.value = false;
  }
};

const handleSelectHistory = (item) => {
  prompt.value = item.prompt
  optimizedPrompt.value = item.result
  showHistory.value = false
}

// 生命周期钩子
onMounted(async () => {
  await initServices()
  loadModels()
  // 加载历史记录
  if (promptService) {
    history.value = promptService.getHistory()
  }
})

// 监听器
watch(showConfig, (newVal) => {
  if (!newVal) {
    loadModels()
  }
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