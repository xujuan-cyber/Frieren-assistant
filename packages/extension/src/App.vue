<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-900 to-purple-950 flex flex-col">
    <!-- 顶部导航栏 -->
    <header class="flex-none sticky top-0 z-40 bg-purple-800/90 backdrop-blur-sm border-b border-purple-700/50 shadow-lg">
      <div class="container mx-auto px-2 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
        <h1 class="text-lg sm:text-xl font-bold text-white">
          Prompt Optimizer
        </h1>
        <div class="flex items-center gap-1 sm:gap-3">
          <button
            @click="openTemplateManager('optimize')"
            class="text-white/80 hover:text-white transition-colors flex items-center gap-1 hover:scale-105 transform px-1.5 py-1"
          >
            <span class="text-base sm:text-lg">📝</span>
            <span class="hidden sm:inline text-sm">功能提示词</span>
          </button>
          <button
            @click="showHistory = true"
            class="text-white/80 hover:text-white transition-colors flex items-center gap-1 hover:scale-105 transform px-1.5 py-1"
          >
            <span class="text-base sm:text-lg">📜</span>
            <span class="hidden sm:inline text-sm">历史记录</span>
          </button>
          <button
            @click="showConfig = true"
            class="text-white/80 hover:text-white transition-colors flex items-center gap-1 hover:scale-105 transform px-1.5 py-1"
          >
            <span class="text-base sm:text-lg">⚙️</span>
            <span class="hidden sm:inline text-sm">模型管理</span>
          </button>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="flex-1 container mx-auto p-2 sm:p-4 overflow-hidden">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]">
        <!-- 提示词区 -->
        <div class="flex flex-col h-[calc(50vh-2rem)] lg:h-full">
          <div class="bg-gray-900/50 backdrop-blur-sm rounded-lg shadow-lg border border-purple-700/30 overflow-hidden flex flex-col h-full">
            <div class="p-3 sm:p-4 space-y-3 sm:space-y-4 flex flex-col flex-1">
              <!-- 输入区域 -->
              <div class="flex-none">
                <InputPanel
                  v-model="prompt"
                  v-model:selectedModel="optimizeModel"
                  :models="enabledModels"
                  label="原始提示词"
                  placeholder="请输入需要优化的prompt..."
                  model-label="优化模型"
                  template-label="优化提示词"
                  button-text="开始优化 →"
                  loading-text="优化中..."
                  :loading="isOptimizing"
                  :disabled="isOptimizing"
                  @submit="handleOptimizePrompt"
                >
                  <template #template-select>
                    <TemplateSelect
                      v-model="selectedOptimizeTemplate"
                      type="optimize"
                      @manage="openTemplateManager('optimize')"
                      @select="handleTemplateSelect"
                    />
                  </template>
                </InputPanel>
              </div>

              <!-- 优化结果区域 -->
              <div class="flex-1 min-h-0 overflow-y-auto">
                <PromptPanel 
                  v-model:optimized-prompt="optimizedPrompt"
                  :is-iterating="isIterating"
                  v-model:selected-iterate-template="selectedIterateTemplate"
                  :versions="currentVersions"
                  :current-version-id="currentVersionId"
                  @iterate="handleIteratePrompt"
                  @openTemplateManager="openTemplateManager"
                  @switchVersion="handleSwitchVersion"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 测试区域 -->
        <div class="flex flex-col h-[calc(50vh-2rem)] lg:h-full">
          <div class="bg-gray-900/50 backdrop-blur-sm rounded-lg shadow-lg border border-purple-700/30 overflow-hidden flex flex-col h-full">
            <div class="p-3 sm:p-4 space-y-3 sm:space-y-4 flex flex-col flex-1">
              <!-- 测试输入区域 -->
              <div class="flex-none">
                <InputPanel
                  v-model="testContent"
                  v-model:selectedModel="selectedModel"
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
              <div class="flex-1 min-h-0 overflow-y-auto">
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

    <!-- 提示词管理弹窗 -->
    <Teleport to="body">
      <TemplateManager
        v-if="showTemplates"
        :template-type="currentType"
        :selected-optimize-template="selectedOptimizeTemplate"
        :selected-iterate-template="selectedIterateTemplate"
        @close="showTemplates = false"
        @select="handleTemplateSelect"
      />
    </Teleport>

    <!-- 历史记录弹窗 -->
    <HistoryModal
      :show="showHistory"
      :history="history"
      @close="showHistory = false"
      @reuse="handleSelectHistory"
      @clear="handleClearHistory"
    />

    <!-- 全局提示 -->
    <Toast />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed, watch } from 'vue'
import { 
  createLLMService, 
  createPromptService,
  modelManager,
  templateManager,
  historyManager
} from '@prompt-optimizer/core'
import ModelManager from './components/ModelManager.vue'
import TemplateManager from './components/TemplateManager.vue'
import Toast from './components/Toast.vue'
import HistoryModal from './components/HistoryDrawer.vue'
import PromptPanel from './components/PromptPanel.vue'
import InputPanel from './components/InputPanel.vue'
import OutputPanel from './components/OutputPanel.vue'
import { useToast } from './composables/useToast'
import TemplateSelect from './components/TemplateSelect.vue'
import { v4 as uuidv4 } from 'uuid'

// 初始化服务
const llmService = createLLMService(modelManager)
let promptService = null

// 添加提示词选择的本地存储
const STORAGE_KEYS = {
  OPTIMIZE_TEMPLATE: 'app:selected-optimize-template',
  ITERATE_TEMPLATE: 'app:selected-iterate-template'
}

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
const showTemplates = ref(false)
const currentType = ref('optimize')  // 默认为优化提示词
const optimizeModel = ref('')
const selectedModel = ref('')
const selectedOptimizeTemplate = ref(null)
const selectedIterateTemplate = ref(null)
const history = ref([])
const models = ref([])
const outputPanelRef = ref(null)
const currentChainId = ref('')
const currentVersions = ref([])
const currentVersionId = ref('')

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
  
  if (!selectedOptimizeTemplate.value) {
    toast.error('请先选择优化提示词')
    return
  }
  
  isOptimizing.value = true
  optimizedPrompt.value = ''  // 清空之前的结果
  
  try {
    // 获取最新的提示词内容
    console.log('开始优化提示词:', {
      prompt: prompt.value,
      modelKey: optimizeModel.value,
      template: selectedOptimizeTemplate.value
    })

    // 使用流式调用
    const result = await promptService.optimizePromptStream(
      prompt.value, 
      optimizeModel.value,
      selectedOptimizeTemplate.value.content,
      {
        onToken: (token) => {
          optimizedPrompt.value += token
        },
        onComplete: () => {
          // 创建新记录链
          console.log('创建新的历史记录链...')
          const newRecord = historyManager.createNewChain({
            id: uuidv4(),
            originalPrompt: prompt.value,
            optimizedPrompt: optimizedPrompt.value,
            type: 'optimize',
            modelKey: optimizeModel.value,
            templateId: selectedOptimizeTemplate.value.id,
            timestamp: Date.now(),
            metadata: {}
          });
          
          console.log('新记录链创建成功:', {
            chainId: newRecord.chainId,
            record: newRecord
          })
          
          currentChainId.value = newRecord.chainId;
          // 更新版本信息
          currentVersions.value = newRecord.versions;
          currentVersionId.value = newRecord.currentRecord.id;
          history.value = historyManager.getAllChains();
          console.log('历史记录已更新:', {
            totalChains: history.value?.length
          })
          
          toast.success('优化成功')
          isOptimizing.value = false
        },
        onError: (error) => {
          console.error('优化过程出错:', error)
          toast.error(error.message || '优化失败')
          isOptimizing.value = false
        }
      }
    )
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
    const result = await promptService.iteratePromptStream(
      originalPrompt,
      iterateInput,
      optimizeModel.value,
      {
        onToken: (token) => {
          optimizedPrompt.value += token;  // 直接更新到 optimizedPrompt
        },
        onComplete: () => {
          // 添加迭代记录
          console.log('添加迭代记录...', {
            chainId: currentChainId.value,
            originalPrompt,
            iterateInput
          })
          
          const updatedChain = historyManager.addIteration({
            chainId: currentChainId.value,
            originalPrompt: originalPrompt,
            optimizedPrompt: optimizedPrompt.value,
            iterationNote: iterateInput,
            modelKey: optimizeModel.value,
            templateId: selectedIterateTemplate.value.id
          });
          
          console.log('迭代记录添加成功:', {
            chain: updatedChain
          })
          
          // 更新版本信息
          currentVersions.value = updatedChain.versions;
          currentVersionId.value = updatedChain.currentRecord.id;
          history.value = historyManager.getAllChains();
          console.log('历史记录已更新:', {
            totalChains: history.value?.length
          })
          
          toast.success('迭代优化成功')
        },
        onError: (error) => {
          toast.error(error.message || '迭代优化失败')
        }
      },
      selectedIterateTemplate.value
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
  testResult.value = '';

  try {
    // 使用promptService.testPromptStream进行流式测试
    await promptService.testPromptStream(
      optimizedPrompt.value,
      testContent.value,
      selectedModel.value,
      {
        onToken: (token) => {
          console.log('收到token:', token);
          testResult.value += token;
        },
        onComplete: () => {
          console.log('测试完成');
          isTesting.value = false;
        },
        onError: (error) => {
          console.error('测试出错:', error);
          testError.value = error.message || '测试失败';
          isTesting.value = false;
        }
      }
    );
  } catch (error) {
    console.error('测试失败:', error);
    testError.value = error.message || '测试过程中发生错误';
  } finally {
    console.log('测试完成');
    isTesting.value = false;
  }
};

const handleSelectHistory = (context) => {
  const { record, chainId, rootPrompt } = context;
  
  // 设置原始提示词
  prompt.value = rootPrompt;
  // 设置优化后的提示词
  optimizedPrompt.value = record.optimizedPrompt;
  
  // 创建新的chain
  const newRecord = historyManager.createNewChain({
    id: uuidv4(),
    originalPrompt: rootPrompt,
    optimizedPrompt: record.optimizedPrompt,
    type: 'optimize',
    modelKey: record.modelKey,
    templateId: record.templateId,
    timestamp: Date.now(),
    metadata: {}
  });
  
  // 更新当前chain信息
  currentChainId.value = newRecord.chainId;
  currentVersions.value = newRecord.versions;
  currentVersionId.value = newRecord.currentRecord.id;
  
  // 更新历史记录
  history.value = historyManager.getAllChains();
  
  showHistory.value = false;
}

// 添加清空历史记录的处理函数
const handleClearHistory = async () => {
  try {
    await historyManager.clearHistory()
    history.value = []
    console.log('历史记录已清空')
    toast.success('历史记录已清空')
  } catch (error) {
    console.error('清空历史记录失败:', error)
    toast.error('清空历史记录失败')
  }
}

// 保存提示词选择到本地存储
const saveTemplateSelection = (template, type) => {
  if (template) {
    localStorage.setItem(
      type === 'optimize' ? STORAGE_KEYS.OPTIMIZE_TEMPLATE : STORAGE_KEYS.ITERATE_TEMPLATE,
      template.id
    )
  }
}

// 修改提示词选择处理函数
const handleTemplateSelect = (template, type) => {
  if (type === 'optimize') {
    selectedOptimizeTemplate.value = template
  } else {
    selectedIterateTemplate.value = template
  }
  saveTemplateSelection(template, type)
  toast.success(`已选择${type === 'optimize' ? '优化' : '迭代'}提示词: ${template.name}`)
}

// 打开提示词管理器
const openTemplateManager = (type = 'optimize') => {
  currentType.value = type
  showTemplates.value = true
}

// 添加版本切换处理函数
const handleSwitchVersion = (version) => {
  optimizedPrompt.value = version.optimizedPrompt;
  currentVersionId.value = version.id;
}

// 生命周期钩子
onMounted(async () => {
  await initServices()
  loadModels()
  
  // 初始化历史记录管理器
  try {
    console.log('初始化历史记录管理器...')
    await historyManager.init()
    history.value = historyManager.getAllChains()
    console.log('历史记录加载完成:', {
      recordCount: history.value?.length,
      chains: history.value?.map(chain => ({
        chainId: chain.chainId,
        versionsCount: chain.versions.length,
        rootRecord: chain.rootRecord,
        currentRecord: chain.currentRecord
      }))
    })
  } catch (error) {
    console.error('加载历史记录失败:', error)
    toast.error('加载历史记录失败')
  }
  
  // 初始化提示词选择
  try {
    // 加载优化提示词
    const optimizeTemplateId = localStorage.getItem(STORAGE_KEYS.OPTIMIZE_TEMPLATE)
    if (optimizeTemplateId) {
      const optimizeTemplate = await templateManager.getTemplate(optimizeTemplateId)
      if (optimizeTemplate) {
        selectedOptimizeTemplate.value = optimizeTemplate
      }
    }
    
    // 如果没有已保存的提示词或加载失败，使用该类型的第一个提示词
    if (!selectedOptimizeTemplate.value) {
      const optimizeTemplates = await templateManager.getTemplatesByType('optimize')
      if (optimizeTemplates.length > 0) {
        selectedOptimizeTemplate.value = optimizeTemplates[0]
      }
    }
    
    // 加载迭代提示词
    const iterateTemplateId = localStorage.getItem(STORAGE_KEYS.ITERATE_TEMPLATE)
    if (iterateTemplateId) {
      const iterateTemplate = await templateManager.getTemplate(iterateTemplateId)
      if (iterateTemplate) {
        selectedIterateTemplate.value = iterateTemplate
      }
    }
    
    // 如果没有已保存的提示词或加载失败，使用该类型的第一个提示词
    if (!selectedIterateTemplate.value) {
      const iterateTemplates = await templateManager.getTemplatesByType('iterate') 
      if (iterateTemplates.length > 0) {
        selectedIterateTemplate.value = iterateTemplates[0]
      }
    }

    // 如果仍然无法加载任何提示词，显示错误
    if (!selectedOptimizeTemplate.value || !selectedIterateTemplate.value) {
      throw new Error('无法加载默认提示词')
    }

  } catch (error) {
    console.error('加载提示词失败:', error)
    toast.error('加载提示词失败')
  }
})

// 监听器
watch(showConfig, (newVal) => {
  if (!newVal) {
    loadModels()
  }
})

// 添加历史记录显示状态监听
watch(showHistory, (newVal) => {
  console.log('历史记录显示状态变更:', {
    show: newVal,
    currentHistory: history.value?.length
  })
})
</script>

<style>
/* 优化滚动条样式 */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 隐藏水平滚动条 */
::-webkit-scrollbar-horizontal {
  display: none;
}
</style>