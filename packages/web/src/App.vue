<template>
  <MainLayoutUI>
    <!-- 标题插槽 -->
    <template #title>
      Prompt Optimizer
    </template>

    <!-- 操作按钮插槽 -->
    <template #actions>
      <ActionButtonUI
        icon="📝"
        text="功能提示词"
        @click="openTemplateManager('optimize')"
      />
      <ActionButtonUI
        icon="📜"
        text="历史记录"
        @click="showHistory = true"
      />
      <ActionButtonUI
        icon="⚙️"
        text="模型管理"
        @click="showConfig = true"
      />
    </template>

    <!-- 主要内容插槽 -->
    <!-- 提示词区 -->
    <ContentCardUI>
      <!-- 输入区域 -->
      <div class="flex-none">
        <InputPanelUI
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
            <ModelSelectUI
              ref="optimizeModelSelect"
              :modelValue="selectedOptimizeModel"
              @update:modelValue="selectedOptimizeModel = $event"
              :disabled="isOptimizing"
              @config="showConfig = true"
            />
          </template>
          <template #template-select>
            <TemplateSelectUI
              v-model="selectedOptimizeTemplate"
              type="optimize"
              @manage="openTemplateManager('optimize')"
              @select="handleTemplateSelect"
            />
          </template>
        </InputPanelUI>
      </div>

      <!-- 优化结果区域 -->
      <div class="flex-1 min-h-0 overflow-y-auto">
        <PromptPanelUI 
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
    </ContentCardUI>

    <!-- 测试区域 -->
    <ContentCardUI>
      <!-- 测试输入区域 -->
      <div class="flex-none">
        <InputPanelUI
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
            <ModelSelectUI
              ref="testModelSelect"
              :modelValue="selectedTestModel"
              @update:modelValue="selectedTestModel = $event"
              :disabled="isTesting"
              @config="showConfig = true"
            />
          </template>
        </InputPanelUI>
      </div>

      <!-- 测试结果区域 -->
      <div class="flex-1 min-h-0 overflow-y-auto">
        <OutputPanelUI
          ref="outputPanelRef"
          :loading="isTesting"
          :error="testError"
          :result="testResult"
        />
      </div>
    </ContentCardUI>

    <!-- 弹窗插槽 -->
    <template #modals>
      <!-- 配置弹窗 -->
      <Teleport to="body">
        <ModelManagerUI
          v-if="showConfig"
          @close="handleModelManagerClose"
          @modelsUpdated="handleModelsUpdated"
          @select="handleModelSelect"
        />
      </Teleport>

      <!-- 提示词管理弹窗 -->
      <Teleport to="body">
        <TemplateManagerUI
          v-if="showTemplates"
          :template-type="currentType"
          :selected-optimize-template="selectedOptimizeTemplate"
          :selected-iterate-template="selectedIterateTemplate"
          @close="handleTemplateManagerClose"
          @select="handleTemplateSelect"
        />
      </Teleport>

      <!-- 历史记录弹窗 -->
      <HistoryDrawerUI
        v-model:show="showHistory"
        :history="history"
        @reuse="handleSelectHistory"
        @clear="handleClearHistory"
      />
    </template>
  </MainLayoutUI>
</template>

<script setup>
import '@prompt-optimizer/ui/dist/style.css'
import { ref, onMounted, watch, nextTick } from 'vue'
import {
  // UI组件
  ToastUI,
  ModelManagerUI,
  OutputPanelUI,
  PromptPanelUI,
  TemplateManagerUI,
  TemplateSelectUI,
  ModelSelectUI,
  HistoryDrawerUI,
  InputPanelUI,
  MainLayoutUI,
  ContentCardUI,
  ActionButtonUI,
  // composables
  usePromptOptimizer,
  usePromptTester,
  useToast,
  usePromptHistory,
  // 服务
  createLLMService,
  createPromptService,
  modelManager,
  templateManager,
  historyManager
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

// 初始化基础服务
const initBaseServices = () => {
  try {
    console.log('开始初始化基础服务...')
    
    // 初始化历史记录管理器（同步操作）
    console.log('初始化历史记录管理器...')
    historyManager.init()

    // 获取并验证模板列表
    const templates = templateManager.listTemplates()
    console.log('模板列表:', templates)
  } catch (error) {
    console.error('初始化基础服务失败:', error)
    toast.error('初始化失败：' + (error instanceof Error ? error.message : String(error)))
    throw error
  }
}

// 先初始化基础服务
initBaseServices()

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

// 初始化其他服务
const initOtherServices = () => {
  try {
    console.log('初始化其他服务...')
    
    // 初始化其他数据（同步操作）
    console.log('初始化模型选择...')
    initModelSelection()
    
    console.log('初始化历史记录...')
    initHistory()
    
    console.log('初始化模板选择...')
    initTemplateSelection()
    
    // 创建提示词服务
    console.log('创建提示词服务...')
    promptServiceRef.value = createPromptService(modelManager, llmService, templateManager, historyManager)
    
    console.log('初始化完成', {
      optimizeTemplate: selectedOptimizeTemplate.value?.name,
      iterateTemplate: selectedIterateTemplate.value?.name
    })
  } catch (error) {
    console.error('初始化其他服务失败:', error)
    toast.error('初始化失败：' + (error instanceof Error ? error.message : String(error)))
  }
}

// 生命周期钩子
onMounted(() => {
  initOtherServices()
})

// 修改提示词选择处理函数
const handleTemplateSelect = (template, type) => {
  try {
    console.log('选择模板:', { 
      template: template ? {
        id: template.id,
        name: template.name,
        type: template.metadata?.templateType
      } : null, 
      type 
    })

    if (type === 'optimize') {
      selectedOptimizeTemplate.value = template
    } else {
      selectedIterateTemplate.value = template
    }
    
    saveTemplateSelection(template, type)
    if (template) {
      toast.success(`已选择${type === 'optimize' ? '优化' : '迭代'}提示词: ${template.name}`)
    }
  } catch (error) {
    console.error('选择提示词失败:', error)
    toast.error('选择提示词失败：' + (error instanceof Error ? error.message : String(error)))
  }
}

// 打开提示词管理器
const openTemplateManager = (type = 'optimize') => {
  currentType.value = type
  showTemplates.value = true
}

// 监听模板选择变化
watch([selectedOptimizeTemplate, selectedIterateTemplate], () => {
  console.log('模板选择已更新:', {
    optimize: selectedOptimizeTemplate.value?.name,
    iterate: selectedIterateTemplate.value?.name
  })
})

const handleTemplateManagerClose = () => {
  // 确保所有模板选择器都刷新状态
  const templateSelectors = document.querySelectorAll('template-select')
  templateSelectors.forEach(selector => {
    if (selector.__vueParentComponent?.ctx?.refresh) {
      selector.__vueParentComponent.ctx.refresh()
    }
  })
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