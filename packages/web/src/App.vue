<template>
  <NConfigProvider :theme="naiveTheme" :theme-overrides="themeOverrides">
    <div v-if="isInitializing" class="loading-container">
      <div class="spinner"></div>
      <p>{{ t('log.info.initializing') }}</p>
    </div>
    <div v-else-if="!services" class="loading-container error">
      <p>{{ t('toast.error.appInitFailed') }}</p>
    </div>
    <template v-if="isReady">
      <MainLayoutUI>
        <!-- Title Slot -->
        <template #title>
          {{ $t('promptOptimizer.title') }}
        </template>

        <!-- Actions Slot -->
        <template #actions>
        <!-- 变量管理按钮 - 仅在高级模式下显示 -->
        <ActionButtonUI
          v-if="advancedModeEnabled"
          icon="📊"
          :text="$t('nav.variableManager')"
          @click="openVariableManager"
        />
        <!-- 高级模式导航按钮 - 始终显示 -->
        <ActionButtonUI
          icon="🚀"
          :text="$t('nav.advancedMode')"
          @click="toggleAdvancedMode"
          :class="{ 'active-button': advancedModeEnabled }"
        />
        <!-- 保留原有的AdvancedModeToggleUI以实现向后兼容，但默认隐藏 -->
        <AdvancedModeToggleUI 
          v-if="false"
          :enabled="advancedModeEnabled"
          @change="handleAdvancedModeChange"
        />
        <ThemeToggleUI />
        <ActionButtonUI
          icon="📝"
          :text="$t('nav.templates')"
          @click="openTemplateManager"
        />
        <ActionButtonUI
          icon="📜"
          :text="$t('nav.history')"
          @click="historyManager.showHistory = true"
        />
        <ActionButtonUI
          icon="⚙️"
          :text="$t('nav.modelManager')"
          @click="modelManager.showConfig = true"
        />
        <ActionButtonUI
          icon="💾"
          :text="$t('nav.dataManager')"
          @click="showDataManager = true"
        />
        <!-- 自动更新组件 - 仅在Electron环境中显示 -->
        <UpdaterIcon />
        <NButton
          @click="openGithubRepo"
          secondary
          size="medium"
          circle
          title="GitHub"
        >
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
          </template>
        </NButton>
        <LanguageSwitchUI />
        </template>
      <template #main>

        
      <!-- Main Content - 使用 Naive UI NGrid 实现响应式水平左右布局 class="h-full min-h-0 overflow-hidden max-height=100%" -->
      <NFlex  justify="space-between" :style="{display: 'flex',  flexDirection: 'row', width: '100%' , 'max-height': '100%' }" >
        <!-- 左侧：优化区域 -->
        <NFlex vertical :style="{ flex: 1, overflow: 'auto', height: '100%' }">
          <!-- 组件 A: InputPanelUI -->
          <NCard :style="{ flexShrink: 0, minHeight: '200px' }">
            <InputPanelUI
              v-model="optimizer.prompt"
              v-model:selectedModel="modelManager.selectedOptimizeModel"
              :label="promptInputLabel"
              :placeholder="promptInputPlaceholder"
              :model-label="$t('promptOptimizer.optimizeModel')"
              :template-label="$t('promptOptimizer.templateLabel')"
              :button-text="$t('promptOptimizer.optimize')"
              :loading-text="$t('common.loading')"
              :loading="optimizer.isOptimizing"
              :disabled="optimizer.isOptimizing"
              @submit="handleOptimizePrompt"
              @configModel="modelManager.showConfig = true"
            >
              <template #optimization-mode-selector>
                <OptimizationModeSelectorUI
                  v-model="selectedOptimizationMode"
                  @change="handleOptimizationModeChange"
                />
              </template>
              <template #model-select>
                <ModelSelectUI
                  ref="optimizeModelSelect"
                  :modelValue="modelManager.selectedOptimizeModel"
                  @update:modelValue="modelManager.selectedOptimizeModel = $event"
                  :disabled="optimizer.isOptimizing"
                  @config="modelManager.showConfig = true"
                />
              </template>
              <template #template-select>
                <TemplateSelectUI
                  v-if="services && services.templateManager"
                  ref="templateSelectRef"
                  v-model="currentSelectedTemplate"
                  :type="templateSelectType"
                  :optimization-mode="selectedOptimizationMode"
                  @manage="openTemplateManager"
                />
                <NText v-else depth="3" class="p-2 text-sm">
                  {{ t('template.loading') || '加载中...' }}
                </NText>
              </template>
            </InputPanelUI>
          </NCard>
          
          <!-- 组件 B: ConversationManager (仅在高级模式下显示) -->
          <NCard v-if="advancedModeEnabled" :style="{ flexShrink: 0, minHeight: '150px', overflow: 'auto' }">
            <ConversationManager
              v-model:messages="optimizationContext"
              :available-variables="variableManager?.variableManager.value?.resolveAllVariables() || {}"
              :scan-variables="(content) => variableManager?.variableManager.value?.scanVariablesInContent(content) || []"
              :is-predefined-variable="(name) => variableManager?.variableManager.value?.isPredefinedVariable(name) || false"
              :replace-variables="(content, vars) => variableManager?.variableManager.value?.replaceVariables(content, vars) || content"
              :show-sync-to-test="true"
              :optimization-mode="selectedOptimizationMode"
              @sync-to-test="handleSyncOptimizationContextToTest"
              @create-variable="handleCreateVariable"
              @open-variable-manager="handleOpenVariableManager"
              :compact-mode="true"
              :collapsible="true"
              :max-height="300"
            />
          </NCard>
          
          <!-- 组件 C: PromptPanelUI -->
          <NCard :style="{ flex: 1, minHeight: '200px', overflow: 'hidden' }"
          content-style="height: 100%; max-height: 100%; overflow: hidden;"
          >
            <PromptPanelUI
              v-if="services && services.templateManager"
              ref="promptPanelRef"
              v-model:optimized-prompt="optimizer.optimizedPrompt"
              :reasoning="optimizer.optimizedReasoning"
              :original-prompt="optimizer.prompt"
              :is-optimizing="optimizer.isOptimizing"
              :is-iterating="optimizer.isIterating"
              v-model:selected-iterate-template="optimizer.selectedIterateTemplate"
              :versions="optimizer.currentVersions"
              :current-version-id="optimizer.currentVersionId"
              :optimization-mode="selectedOptimizationMode"
              :services="services"
              :advanced-mode-enabled="advancedModeEnabled"
              @iterate="handleIteratePrompt"
              @openTemplateManager="openTemplateManager"
              @switchVersion="handleSwitchVersion"
            />
          </NCard>
        </NFlex>

        <NCard :style="{ flex: 1, overflow: 'auto', height: '100%' }"
          content-style="height: 100%; max-height: 100%; overflow: hidden;"
        >
        <!-- 右侧：测试区域 -->
          <!-- 基础模式：使用原来的TestPanelUI -->
          <TestPanelUI
            v-if="!advancedModeEnabled"
            ref="testPanelRef"
            :prompt-service="services?.promptService"
            :original-prompt="optimizer.prompt"
            :optimized-prompt="optimizer.optimizedPrompt"
            :optimization-mode="selectedOptimizationMode"
            v-model="modelManager.selectedTestModel"
            @showConfig="modelManager.showConfig = true"
          />
          
          <!-- 高级模式：使用AdvancedTestPanel -->
          <AdvancedTestPanel
            v-else
            ref="testPanelRef"
            class="h-full flex flex-col"
            :services="services"
            :original-prompt="optimizer.prompt"
            :optimized-prompt="optimizer.optimizedPrompt"
            :optimization-mode="selectedOptimizationMode"
            :selected-model="modelManager.selectedTestModel"
            :advanced-mode-enabled="advancedModeEnabled"
            :variable-manager="variableManager"
            :open-variable-manager="openVariableManager"
            @update:selected-model="modelManager.selectedTestModel = $event"
            @showConfig="modelManager.showConfig = true"
          />
          </NCard>
      </NFlex>
      </template>
    </MainLayoutUI>

    <!-- Modals and Drawers that are conditionally rendered -->
    <ModelManagerUI v-if="isReady" v-model:show="modelManager.showConfig" />
    <TemplateManagerUI
      v-if="isReady"
      v-model:show="templateManagerState.showTemplates"
      :templateType="templateManagerState.currentType"
      @close="() => templateManagerState.handleTemplateManagerClose(() => templateSelectRef?.refresh?.())"
      @languageChanged="handleTemplateLanguageChanged"
    />
    <HistoryDrawerUI
      v-if="isReady"
      v-model:show="historyManager.showHistory"
      :history="promptHistory.history"
      @reuse="handleHistoryReuse"
      @clear="promptHistory.handleClearHistory"
      @deleteChain="promptHistory.handleDeleteChain"
    />
    <DataManagerUI v-if="isReady" v-model:show="showDataManager" @imported="handleDataImported" />
    
    <!-- 变量管理弹窗 -->
    <VariableManagerModal
      v-if="isReady"
      v-model:visible="showVariableManager"
      :variable-manager="variableManager"
      :focus-variable="focusVariableName"
    />

    <!-- 关键：使用NGlobalStyle同步全局样式到body，消除CSS依赖 -->
    <NGlobalStyle />

    <!-- ToastUI已在MainLayoutUI中包含，无需重复渲染 -->
    </template>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { ref, watch, provide, computed, shallowRef, toRef, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { NConfigProvider, NGlobalStyle, NButton, NText, NGrid, NGridItem, NCard, NFlex, useMessage } from 'naive-ui'
import {
  // UI Components
  MainLayoutUI, ThemeToggleUI, AdvancedModeToggleUI, ActionButtonUI, ModelManagerUI, TemplateManagerUI, HistoryDrawerUI,
  LanguageSwitchUI, DataManagerUI, InputPanelUI, PromptPanelUI, OptimizationModeSelectorUI,
  ModelSelectUI, TemplateSelectUI, TestPanelUI, AdvancedTestPanel, UpdaterIcon, VariableManagerModal,
  ConversationManager,

  // Composables
  usePromptOptimizer,
  useToast,
  useHistoryManager,
  useModelManager,
  useTemplateManager,
  useAppInitializer,
  usePromptHistory,
  useModelSelectors,
  useVariableManager,
  useNaiveTheme,

  // i18n functions
  initializeI18nWithStorage,
  setI18nServices,

  // Types from UI package
  type OptimizationMode,
  type ConversationMessage,
} from '@prompt-optimizer/ui'
import type { IPromptService } from '@prompt-optimizer/core'

// 1. 基础 composables
const { t } = useI18n()
// 移除全局toast实例，改为在需要时本地调用

// 2. 初始化应用服务
const { services, isInitializing } = useAppInitializer()

// 3. Initialize i18n with storage when services are ready
watch(services, async (newServices) => {
  if (newServices) {
    // 首先设置服务引用
    setI18nServices(newServices)
    // 然后初始化语言设置
    await initializeI18nWithStorage()
    console.log('[Web] i18n initialized')
    
    // 加载高级模式设置
    await loadAdvancedModeSetting()
  }
}, { immediate: true })

// 4. 向子组件提供服务
provide('services', services)

// 5. 控制主UI渲染的标志
const isReady = computed(() => services.value !== null && !isInitializing.value)

// 6. 创建所有必要的引用
const promptService = shallowRef<IPromptService | null>(null)
const selectedOptimizationMode = ref<OptimizationMode>('system')
const showDataManager = ref(false)
const optimizeModelSelect = ref(null)
const testPanelRef = ref(null)
const templateSelectRef = ref<{ refresh?: () => void } | null>(null)
const promptPanelRef = ref<{ refreshIterateTemplateSelect?: () => void } | null>(null)

// 高级模式状态
const advancedModeEnabled = ref(false)

// Naive UI 主题配置 - 使用新的主题系统
const { naiveTheme, themeOverrides, initTheme } = useNaiveTheme()

// 初始化主题系统
if (typeof window !== 'undefined') {
  initTheme()
}

// 加载高级模式设置
const loadAdvancedModeSetting = async () => {
  if (services.value?.preferenceService) {
    try {
      const saved = await services.value.preferenceService.get('advancedModeEnabled', false)
      advancedModeEnabled.value = saved
      console.log(`[App] Loaded advanced mode setting: ${saved}`)
    } catch (error) {
      console.error('[App] Failed to load advanced mode setting:', error)
    }
  }
}

// 保存高级模式设置
const saveAdvancedModeSetting = async (enabled: boolean) => {
  if (services.value?.preferenceService) {
    try {
      await services.value.preferenceService.set('advancedModeEnabled', enabled)
      console.log(`[App] Saved advanced mode setting: ${enabled}`)
    } catch (error) {
      console.error('[App] Failed to save advanced mode setting:', error)
    }
  }
}

// 变量管理状态
const showVariableManager = ref(false)
const focusVariableName = ref<string | undefined>(undefined)

// 优化阶段上下文状态
const optimizationContext = ref<ConversationMessage[]>([])

// 变量管理器实例
const variableManager = useVariableManager(services as any)

const templateSelectType = computed<'optimize' | 'userOptimize' | 'iterate'>(() => {
  return selectedOptimizationMode.value === 'system' ? 'optimize' : 'userOptimize';
});

// 变量管理处理函数
const handleCreateVariable = (name: string, defaultValue?: string) => {
  // 创建新变量并打开变量管理器
  if (variableManager?.variableManager.value) {
    variableManager.variableManager.value.createVariable(name, defaultValue || '')
  }
  focusVariableName.value = name
  showVariableManager.value = true
}

const handleOpenVariableManager = (variableName?: string) => {
  // 打开变量管理器并聚焦到指定变量
  if (variableName) {
    focusVariableName.value = variableName
  }
  showVariableManager.value = true
}

// 6. 在顶层调用所有 Composables
// 测试面板的模型选择器引用
const testModelSelect = computed(() => (testPanelRef.value as any)?.modelSelectRef || null)

// 使用类型断言解决类型不匹配问题
// 模型选择器
const modelSelectors = useModelSelectors(services as any)

// 模型管理器
const modelManager = useModelManager(
  services as any,
  {
    optimizeModelSelect: modelSelectors.optimizeModelSelect,
    testModelSelect
  }
)

// 提示词优化器
const optimizer = usePromptOptimizer(
  services as any,
  selectedOptimizationMode,
  toRef(modelManager, 'selectedOptimizeModel'),
  toRef(modelManager, 'selectedTestModel')
)

// 提示词历史
const promptHistory = usePromptHistory(
  services as any,
  toRef(optimizer, 'prompt') as any,
  toRef(optimizer, 'optimizedPrompt') as any,
  toRef(optimizer, 'currentChainId') as any,
  toRef(optimizer, 'currentVersions') as any,
  toRef(optimizer, 'currentVersionId') as any
)

// 历史管理器
const historyManager = useHistoryManager(
  services as any,
  optimizer.prompt as any,
  optimizer.optimizedPrompt as any,
  optimizer.currentChainId as any,
  optimizer.currentVersions as any,
  optimizer.currentVersionId as any,
  promptHistory.handleSelectHistory,
  promptHistory.handleClearHistory,
  promptHistory.handleDeleteChain as any
)

// 模板管理器
const templateManagerState = useTemplateManager(
  services as any,
  {
    selectedOptimizeTemplate: toRef(optimizer, 'selectedOptimizeTemplate'),
    selectedUserOptimizeTemplate: toRef(optimizer, 'selectedUserOptimizeTemplate'),
    selectedIterateTemplate: toRef(optimizer, 'selectedIterateTemplate')
  }
)

// 7. 监听服务初始化
watch(services, (newServices) => {
  if (!newServices) return

  // 设置服务引用
  promptService.value = newServices.promptService

  console.log('All services and composables initialized.')
})

// 8. 处理数据导入成功后的刷新
const handleDataImported = () => {
  console.log('[App] 数据导入成功，即将刷新页面以应用所有更改...')

  // 显示成功提示，然后刷新页面
  useToast().success(t('dataManager.import.successWithRefresh'))

  // 延迟一点时间让用户看到成功提示，然后刷新页面
  setTimeout(() => {
    window.location.reload()
  }, 1500)
}

// 8. 计算属性和方法
const currentSelectedTemplate = computed({
  get() {
    return selectedOptimizationMode.value === 'system'
      ? optimizer.selectedOptimizeTemplate
      : optimizer.selectedUserOptimizeTemplate
  },
  set(newValue) {
    if (!newValue) return
    if (selectedOptimizationMode.value === 'system') {
      optimizer.selectedOptimizeTemplate = newValue
    } else {
      optimizer.selectedUserOptimizeTemplate = newValue
    }
  }
})

// 处理优化提示词
const handleOptimizePrompt = () => {
  // 检查是否需要传递高级上下文
  if (advancedModeEnabled.value) {
    // 构建高级上下文
    const advancedContext = {
      variables: variableManager?.variableManager.value?.resolveAllVariables() || {},
      messages: optimizationContext.value.length > 0 ? optimizationContext.value : undefined
    }
    
    console.log('[App] Optimizing with advanced context:', advancedContext)
    
    // 使用带上下文的优化
    optimizer.handleOptimizePromptWithContext(advancedContext)
  } else {
    // 使用基础优化
    optimizer.handleOptimizePrompt()
  }
}

// 处理迭代提示词
const handleIteratePrompt = (payload: any) => {
  optimizer.handleIteratePrompt(payload)
}

// 处理切换版本
const handleSwitchVersion = (versionId: any) => {
  optimizer.handleSwitchVersion(versionId)
}

// 处理高级模式变化
const handleAdvancedModeChange = (enabled: boolean) => {
  advancedModeEnabled.value = enabled
  console.log(`[App] Advanced mode ${enabled ? 'enabled' : 'disabled'}`)
}

// 切换高级模式（导航菜单使用）
const toggleAdvancedMode = async () => {
  advancedModeEnabled.value = !advancedModeEnabled.value
  console.log(`[App] Advanced mode ${advancedModeEnabled.value ? 'enabled' : 'disabled'} (toggled from navigation)`)
  
  // 保存设置
  await saveAdvancedModeSetting(advancedModeEnabled.value)
}

// 打开变量管理器
const openVariableManager = (variableName?: string) => {
  // 强制刷新变量管理器数据
  if (variableManager?.refresh) {
    variableManager.refresh()
  }
  // 设置要聚焦的变量名
  focusVariableName.value = variableName
  showVariableManager.value = true
}

// 监听变量管理器关闭，清理聚焦变量
watch(showVariableManager, (newValue) => {
  if (!newValue) {
    focusVariableName.value = undefined
  }
})

// 监听高级模式和优化模式变化，自动加载默认对话模板
watch(
  [advancedModeEnabled, selectedOptimizationMode],
  ([newAdvancedMode, newOptimizationMode]) => {
    // 当启用高级模式时，根据优化模式自动加载默认对话模板
    if (newAdvancedMode) {
      // 如果当前没有优化上下文或者是空的，则设置默认模板
      if (!optimizationContext.value || optimizationContext.value.length === 0) {
        if (newOptimizationMode === 'system') {
          // 系统提示词优化模式：系统消息 + 用户消息
          optimizationContext.value = [
            { role: 'system', content: '{{currentPrompt}}' },
            { role: 'user', content: '{{userQuestion}}' }
          ]
          console.log('[App] Auto-loaded default conversation template for system prompt optimization')
        } else if (newOptimizationMode === 'user') {
          // 用户提示词优化模式：用户消息（可以添加系统上下文）
          optimizationContext.value = [
            { role: 'user', content: '{{currentPrompt}}' }
          ]
          console.log('[App] Auto-loaded default conversation template for user prompt optimization')
        }
      }
    }
  },
  { immediate: false } // 不立即执行，只在变化时执行
)

// 打开GitHub仓库
const openGithubRepo = async () => {
  const url = 'https://github.com/linshenkx/prompt-optimizer'

  // 检查是否在Electron环境中
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    try {
      await (window as any).electronAPI.shell.openExternal(url)
    } catch (error) {
      console.error('Failed to open external URL in Electron:', error)
      // 如果Electron API失败，回退到window.open
      window.open(url, '_blank')
    }
  } else {
    // Web环境中使用window.open
    window.open(url, '_blank')
  }
}

// 打开模板管理器
const openTemplateManager = (templateType?: 'optimize' | 'userOptimize' | 'iterate') => {
  // 如果传入了模板类型，直接使用；否则根据当前优化模式判断（向后兼容）
  templateManagerState.currentType = templateType || (selectedOptimizationMode.value === 'system' ? 'optimize' : 'userOptimize')
  templateManagerState.showTemplates = true
}

// 处理优化模式变更
const handleOptimizationModeChange = (mode: OptimizationMode) => {
  selectedOptimizationMode.value = mode
}

// 处理模板语言变化
const handleTemplateLanguageChanged = (newLanguage: string) => {
  console.log('[App] 模板语言已切换:', newLanguage)

  // 刷新主界面的模板选择组件
  if (templateSelectRef.value?.refresh) {
    templateSelectRef.value.refresh()
  }

  // 刷新迭代页面的模板选择组件
  if (promptPanelRef.value?.refreshIterateTemplateSelect) {
    promptPanelRef.value.refreshIterateTemplateSelect()
  }
}

// 处理优化上下文同步到测试
const handleSyncOptimizationContextToTest = (syncData: { messages: ConversationMessage[], tools: ToolDefinition[] }) => {
  console.log('[App] Syncing optimization context to test:', syncData)
  
  // 获取高级测试面板的引用
  const advancedTestPanel = testPanelRef.value as any
  if (advancedTestPanel && advancedTestPanel.setConversationMessages) {
    // 🆕 将优化上下文（消息和工具）同步到测试面板
    advancedTestPanel.setConversationMessages([...syncData.messages])
    
    // 🆕 同步工具信息到测试面板
    if (syncData.tools && syncData.tools.length > 0) {
      console.log('[App] Syncing tools to test panel:', syncData.tools)
      // 通过引用传递工具信息到测试面板
      if (advancedTestPanel.setTools) {
        advancedTestPanel.setTools([...syncData.tools])
      } else {
        // 临时方案：通过组件属性更新工具
        console.log('[App] Test panel does not support setTools, using prop update')
      }
    }
    
    useToast().success(t('conversation.syncToTest.success', '优化上下文已同步到测试区域'))
  } else {
    // 降级处理：如果测试面板不支持同步，显示提示
    useToast().warning(t('conversation.syncToTest.notSupported', '当前测试面板不支持会话同步'))
  }
}

// 处理历史记录使用 - 智能模式切换
const handleHistoryReuse = async (context: { record: any, chainId: string, rootPrompt: string, chain: any }) => {
  const { chain } = context

  // 根据链条的根记录类型确定应该切换到的优化模式
  let targetMode: OptimizationMode
  if (chain.rootRecord.type === 'optimize') {
    targetMode = 'system'
  } else if (chain.rootRecord.type === 'userOptimize') {
    targetMode = 'user'
  } else {
    // 兜底：从根记录的 metadata 中获取优化模式
    targetMode = chain.rootRecord.metadata?.optimizationMode || 'system'
  }

  // 如果目标模式与当前模式不同，自动切换
  if (targetMode !== selectedOptimizationMode.value) {
    selectedOptimizationMode.value = targetMode
    useToast().info(t('toast.info.optimizationModeAutoSwitched', {
      mode: targetMode === 'system' ? t('common.system') : t('common.user')
    }))
  }

  // 调用原有的历史记录处理逻辑
  await promptHistory.handleSelectHistory(context)
}

// 提示词输入标签
const promptInputLabel = computed(() => {
  return selectedOptimizationMode.value === 'system' ? t('promptOptimizer.originalPrompt') : t('promptOptimizer.userPromptInput')
})

// 提示词输入占位符
const promptInputPlaceholder = computed(() => {
  return selectedOptimizationMode.value === 'system' ? t('promptOptimizer.originalPromptPlaceholder') : t('promptOptimizer.userPromptPlaceholder')
})
</script>

<style scoped>
/* 高级模式按钮激活状态 */
.active-button {
  background-color: var(--primary-color, #3b82f6) !important;
  color: white !important;
  border-color: var(--primary-color, #3b82f6) !important;
}

.active-button:hover {
  background-color: var(--primary-hover-color, #2563eb) !important;
  border-color: var(--primary-hover-color, #2563eb) !important;
}

.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 1.2rem;
  color: var(--text-color);
  background-color: var(--background-color);
}

.loading-container.error {
  color: #f56c6c;
}

.spinner {
  border: 4px solid rgba(128, 128, 128, 0.2);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: var(--primary-color);
  animation: spin 1s ease infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>