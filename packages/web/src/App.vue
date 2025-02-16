<template>
  <MainLayout>
    <!-- 标题插槽 -->
    <template #title>
      Prompt Optimizer
    </template>

    <!-- 操作按钮插槽 -->
    <template #actions>
      <ActionButton
        icon="📝"
        text="功能提示词"
        @click="openTemplateManager('optimize')"
      />
      <ActionButton
        icon="📜"
        text="历史记录"
        @click="showHistory = true"
      />
      <ActionButton
        icon="⚙️"
        text="模型管理"
        @click="showConfig = true"
      />
    </template>

    <!-- 主要内容插槽 -->
    <!-- 提示词区 -->
    <ContentCard>
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
          @configModel="showConfig = true"
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
    </ContentCard>

    <!-- 测试区域 -->
    <ContentCard>
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
          @submit="() => handleTest(optimizedPrompt)"
          @configModel="showConfig = true"
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
    </ContentCard>

    <!-- 弹窗插槽 -->
    <template #modals>
      <!-- 配置弹窗 -->
      <Teleport to="body">
        <ModelManager
          v-if="showConfig"
          @close="handleModelManagerClose"
          @modelsUpdated="handleModelsUpdated"
        />
      </Teleport>

      <!-- 提示词管理弹窗 -->
      <Teleport to="body">
        <TemplateManager
          v-if="showTemplates"
          :template-type="currentType"
          :selected-optimize-template="selectedOptimizeTemplate"
          :selected-iterate-template="selectedIterateTemplate"
          @close="handleTemplateManagerClose"
          @select="handleTemplateSelect"
        />
      </Teleport>

      <!-- 历史记录弹窗 -->
      <HistoryDrawer
        v-model:show="showHistory"
        :history="history"
        @reuse="handleSelectHistory"
        @clear="handleClearHistory"
      />
    </template>
  </MainLayout>
</template>

<script setup>
import '@prompt-optimizer/ui/style.css'
import { ref, onMounted, computed, watch } from 'vue'
import { 
  createLLMService, 
  createPromptService,
  modelManager,
  templateManager,
  historyManager
} from '@prompt-optimizer/core'
import {
  Toast,
  ModelManager,
  OutputPanel,
  PromptPanel,
  TemplateManager,
  TemplateSelect,
  HistoryDrawer,
  InputPanel,
  Modal,
  ApiKeyConfig,
  MainLayout,
  ContentCard,
  ActionButton,
  usePromptOptimizer,
  usePromptTester,
  useToast
} from '@prompt-optimizer/ui'
import { v4 as uuidv4 } from 'uuid'

// 初始化服务
const llmService = createLLMService(modelManager)
const promptServiceRef = ref(null)

// 初始化 toast
const toast = useToast()

// 添加提示词选择的本地存储
const STORAGE_KEYS = {
  OPTIMIZE_TEMPLATE: 'app:selected-optimize-template',
  ITERATE_TEMPLATE: 'app:selected-iterate-template',
  OPTIMIZE_MODEL: 'app:selected-optimize-model',
  TEST_MODEL: 'app:selected-test-model'
}

// 状态
const showConfig = ref(false)
const showHistory = ref(false)
const showTemplates = ref(false)
const currentType = ref('optimize')  // 默认为优化提示词
const history = ref([])
const models = ref([])
const outputPanelRef = ref(null)

// 初始化组合式函数
const {
  prompt,
  optimizedPrompt,
  isOptimizing,
  isIterating,
  selectedOptimizeTemplate,
  selectedIterateTemplate,
  optimizeModel,
  currentVersions,
  currentVersionId,
  currentChainId,
  handleOptimizePrompt,
  handleIteratePrompt,
  handleSwitchVersion,
  saveTemplateSelection,
  initTemplateSelection
} = usePromptOptimizer(modelManager, templateManager, historyManager, promptServiceRef)

const {
  testContent,
  testResult,
  testError,
  isTesting,
  selectedModel,
  handleTest
} = usePromptTester(promptServiceRef)

// 计算属性
const enabledModels = computed(() => 
  models.value.filter(model => model.enabled)
)

// 初始化 promptService
const initServices = async () => {
  try {
    promptServiceRef.value = await createPromptService(modelManager, llmService)
  } catch (error) {
    console.error('服务初始化失败:', error)
    toast.error('服务初始化失败')
  }
}

// 方法
const loadModels = async (updatedModelKey) => {
  try {
    models.value = modelManager.getAllModels()
    
    // 获取保存的模型选择
    const savedOptimizeModel = localStorage.getItem(STORAGE_KEYS.OPTIMIZE_MODEL)
    const savedTestModel = localStorage.getItem(STORAGE_KEYS.TEST_MODEL)
    
    // 设置默认模型
    const defaultModel = enabledModels.value[0]?.key
    if (defaultModel) {
      // 如果有更新的模型，优先使用它
      if (updatedModelKey && enabledModels.value.find(m => m.key === updatedModelKey)) {
        if (optimizeModel.value === updatedModelKey) {
          optimizeModel.value = updatedModelKey
        }
        if (selectedModel.value === updatedModelKey) {
          selectedModel.value = updatedModelKey
        }
      } 
      // 否则，优先使用保存的选择，如果保存的选择无效才使用默认值
      else {
        if (!enabledModels.value.find(m => m.key === optimizeModel.value)) {
          optimizeModel.value = (savedOptimizeModel && enabledModels.value.find(m => m.key === savedOptimizeModel)) 
            ? savedOptimizeModel 
            : defaultModel
        }
        if (!enabledModels.value.find(m => m.key === selectedModel.value)) {
          selectedModel.value = (savedTestModel && enabledModels.value.find(m => m.key === savedTestModel))
            ? savedTestModel
            : defaultModel
        }
      }
    }
    
    // 保存当前选择
    saveModelSelection(optimizeModel.value, 'optimize')
    saveModelSelection(selectedModel.value, 'test')
  } catch (error) {
    console.error('加载模型列表失败:', error)
    toast.error('加载模型列表失败')
  }
}

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

// 修改提示词选择处理函数
const handleTemplateSelect = async (template, type) => {
  // 获取最新的模板数据
  const updatedTemplate = template ? await templateManager.getTemplate(template.id) : null
  
  if (type === 'optimize') {
    selectedOptimizeTemplate.value = updatedTemplate
  } else {
    selectedIterateTemplate.value = updatedTemplate
  }
  
  await saveTemplateSelection(updatedTemplate, type)
  toast.success(`已选择${type === 'optimize' ? '优化' : '迭代'}提示词: ${updatedTemplate?.name || '无'}`)
}

// 打开提示词管理器
const openTemplateManager = (type = 'optimize') => {
  currentType.value = type
  showTemplates.value = true
}

const loadTemplates = async () => {
  try {
    // 确保模板管理器重新初始化
    await templateManager.init()
    // 重新初始化模板选择
    await initTemplateSelection()
    
    // 同步当前选中的模板
    if (selectedOptimizeTemplate.value) {
      const template = await templateManager.getTemplate(selectedOptimizeTemplate.value.id)
      if (template) {
        selectedOptimizeTemplate.value = template
      }
    }
    if (selectedIterateTemplate.value) {
      const template = await templateManager.getTemplate(selectedIterateTemplate.value.id)
      if (template) {
        selectedIterateTemplate.value = template
      }
    }
    
    toast.success('提示词列表已更新')
  } catch (error) {
    console.error('加载提示词失败:', error)
    toast.error('加载提示词失败')
  }
}

// 修改 handleTemplateManagerClose 方法
const handleTemplateManagerClose = async () => {
  // 先更新数据
  await loadTemplates()
  // 最后关闭界面
  showTemplates.value = false
}

// 添加模型选择的持久化
const saveModelSelection = (model, type) => {
  if (model) {
    localStorage.setItem(
      type === 'optimize' ? STORAGE_KEYS.OPTIMIZE_MODEL : STORAGE_KEYS.TEST_MODEL,
      model
    )
  }
}

// 监听模型选择变化
watch(optimizeModel, (newVal) => {
  saveModelSelection(newVal, 'optimize')
})

watch(selectedModel, (newVal) => {
  saveModelSelection(newVal, 'test')
})

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
  await initTemplateSelection()
})

// 修改模型管理器关闭处理函数
const handleModelManagerClose = async () => {
  // 先加载最新的模型列表
  await loadModels()
  // 最后关闭界面
  showConfig.value = false
}

// 添加历史记录显示状态监听
watch(showHistory, (newVal) => {
  if (newVal) {
    // 打开历史记录时，重新获取最新数据
    history.value = historyManager.getAllChains()
  }
  console.log('历史记录显示状态变更:', {
    show: newVal,
    currentHistory: history.value?.length
  })
})

// 监听优化完成，更新历史记录
watch([currentVersions], () => {
  history.value = historyManager.getAllChains()
})

// 添加模型更新处理函数
const handleModelsUpdated = async (modelKey) => {
  await loadModels(modelKey)
}
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