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
          v-model:selectedModel="selectedOptimizeModel"
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
          <template #model-select>
            <ModelSelect
              ref="optimizeModelSelect"
              :modelValue="selectedOptimizeModel"
              @update:modelValue="selectedOptimizeModel = $event"
              :disabled="isOptimizing"
              @config="showConfig = true"
            />
          </template>
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
          v-model:selectedModel="selectedTestModel"
          label="测试内容"
          placeholder="请输入要测试的内容..."
          model-label="模型"
          button-text="开始测试 →"
          loading-text="测试中..."
          :loading="isTesting"
          :disabled="isTesting"
          @submit="() => handleTest(optimizedPrompt)"
          @configModel="showConfig = true"
        >
          <template #model-select>
            <ModelSelect
              ref="testModelSelect"
              :modelValue="selectedTestModel"
              @update:modelValue="selectedTestModel = $event"
              :disabled="isTesting"
              @config="showConfig = true"
            />
          </template>
        </InputPanel>
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
          @select="handleModelSelect"
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
import { ref, onMounted, watch } from 'vue'
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
  ModelSelect,
  HistoryDrawer,
  InputPanel,
  MainLayout,
  ContentCard,
  ActionButton,
  usePromptOptimizer,
  usePromptTester,
  useToast,
  usePromptHistory
} from '@prompt-optimizer/ui'

// 初始化服务
const llmService = createLLMService(modelManager)
const promptServiceRef = ref(null)

// 初始化 toast
const toast = useToast()

// 状态
const showConfig = ref(false)
const showHistory = ref(false)
const showTemplates = ref(false)
const currentType = ref('optimize')  // 默认为优化提示词

// 添加 ref
const optimizeModelSelect = ref(null)
const testModelSelect = ref(null)

// 初始化组合式函数
const {
  prompt,
  optimizedPrompt,
  isOptimizing,
  isIterating,
  selectedOptimizeTemplate,
  selectedIterateTemplate,
  selectedOptimizeModel,
  selectedTestModel,
  currentVersions,
  currentVersionId,
  currentChainId,
  handleOptimizePrompt,
  handleIteratePrompt,
  handleSwitchVersion,
  saveTemplateSelection,
  initTemplateSelection,
  handleModelSelect,
  initModelSelection,
  loadModels
} = usePromptOptimizer(modelManager, templateManager, historyManager, promptServiceRef)

const {
  testContent,
  testResult,
  testError,
  isTesting,
  handleTest
} = usePromptTester(promptServiceRef, selectedTestModel)

const {
  history,
  handleSelectHistory,
  handleClearHistory,
  initHistory
} = usePromptHistory(
  historyManager,
  prompt,
  optimizedPrompt,
  currentChainId,
  currentVersions,
  currentVersionId
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

// 修改模型管理器关闭处理函数
const handleModelManagerClose = async () => {
  // 先更新数据
  await loadModels()
  // 刷新模型选择组件
  optimizeModelSelect.value?.refresh()
  testModelSelect.value?.refresh()
  // 关闭界面
  showConfig.value = false
}

// 修改模型更新处理函数
const handleModelsUpdated = (modelKey) => {
  // 如果需要，可以在这里处理模型更新后的其他逻辑
}

// 生命周期钩子
onMounted(async () => {
  await initServices()
  await initModelSelection()
  
  // 初始化历史记录管理器
  await initHistory()
  
  // 初始化提示词选择
  await initTemplateSelection()
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