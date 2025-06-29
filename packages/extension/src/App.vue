<template>
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
        <ThemeToggleUI />
        <ActionButtonUI
          icon="📝"
          :text="$t('nav.templates')"
          @click="openTemplateManager"
        />
        <ActionButtonUI
          icon="📜"
          :text="$t('nav.history')"
          @click="showHistory = true"
        />
        <ActionButtonUI
          icon="⚙️"
          :text="$t('nav.modelManager')"
          @click="showConfig = true"
        />
        <ActionButtonUI
          icon="💾"
          :text="$t('nav.dataManager')"
          @click="showDataManager = true"
        />
        <button
          @click="openGithubRepo"
          class="theme-icon-button"
          title="GitHub"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
        </button>
        <LanguageSwitchUI />
      </template>

      <!-- Main Content -->
      <ContentCardUI class="flex-1 min-w-0 flex flex-col">
        <div class="flex-none">
          <InputPanelUI
            v-model="prompt"
            v-model:selectedModel="selectedOptimizeModel"
            :label="promptInputLabel"
            :placeholder="promptInputPlaceholder"
            :model-label="$t('promptOptimizer.optimizeModel')"
            :template-label="$t('promptOptimizer.templateLabel')"
            :button-text="$t('promptOptimizer.optimize')"
            :loading-text="$t('common.loading')"
            :loading="isOptimizing"
            :disabled="isOptimizing"
            @submit="handleOptimizePrompt"
            @configModel="showConfig = true"
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
                :modelValue="selectedOptimizeModel"
                @update:modelValue="selectedOptimizeModel = $event"
                :disabled="isOptimizing"
                @config="showConfig = true"
              />
            </template>
            <template #template-select>
              <TemplateSelectUI
                v-model="currentSelectedTemplate"
                :type="selectedOptimizationMode === 'system' ? 'optimize' : 'userOptimize'"
                :optimization-mode="selectedOptimizationMode"
                @manage="openTemplateManager"
              />
            </template>
          </InputPanelUI>
        </div>
        <div class="flex-1 min-h-0">
          <PromptPanelUI
            v-model:optimized-prompt="optimizedPrompt"
            :reasoning="optimizedReasoning"
            :original-prompt="prompt"
            :is-optimizing="isOptimizing"
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

      <TestPanelUI
        ref="testPanelRef"
        class="flex-1 min-w-0 flex flex-col"
        :prompt-service="promptService"
        :original-prompt="prompt"
        :optimized-prompt="optimizedPrompt"
        :optimization-mode="selectedOptimizationMode"
        v-model="selectedTestModel"
        @showConfig="showConfig = true"
      />
    </MainLayoutUI>

    <!-- Modals and Drawers that are conditionally rendered -->
    <ModelManagerUI v-if="isReady" v-model:show="showConfig" />
    <TemplateManagerUI v-if="isReady" v-model:show="showTemplateManager" :type="currentTemplateManagerType" />
    <HistoryDrawerUI v-if="isReady" v-model:show="showHistory" />
    <DataManagerUI v-if="isReady" v-model:show="showDataManager" />

    <ToastUI />
  </template>
</template>

<script setup lang="ts">
import { ref, watch, provide, computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  // UI Components
  MainLayoutUI, ThemeToggleUI, ActionButtonUI, ModelManagerUI, TemplateManagerUI, HistoryDrawerUI,
  LanguageSwitchUI, DataManagerUI, InputPanelUI, PromptPanelUI, OptimizationModeSelectorUI,
  ModelSelectUI, TemplateSelectUI, ContentCardUI, ToastUI, TestPanelUI,

  // Composables
  usePromptOptimizer,
  useToast,
  useHistoryManager,
  useModelManager,
  useTemplateManager,
  useAppInitializer,
  usePromptHistory,

  // i18n functions
  initializeI18nWithStorage,

  // Types from UI package
  type OptimizationMode,
} from '@prompt-optimizer/ui'
import type { IPromptService } from '@prompt-optimizer/core'

// 1. Setup basic composables
const { t } = useI18n()
const toast = useToast()

// 2. Initialize all application services
const { services, isInitializing } = useAppInitializer()

// 3. Initialize i18n with storage when services are ready
watch(services, async (newServices) => {
  if (newServices?.storageProvider) {
    // 立即失败，不掩盖错误
    await initializeI18nWithStorage(newServices.storageProvider)
    console.log('[Extension] i18n initialized with storage')
  }
}, { immediate: true })

// 4. Provide services to all child components
provide('services', services)
provide('toast', toast)

// 5. This flag controls the rendering of the main UI.
const isReady = ref(false)

// 5. Define placeholders for all state and functions.
let promptService = shallowRef<IPromptService | null>(null)
let prompt = ref('')
let optimizedPrompt = ref('')
let optimizedReasoning = ref('')
let isOptimizing = ref(false)
let isIterating = ref(false)
let selectedOptimizeModel = ref('')
let selectedTestModel = ref('')
let selectedOptimizationMode = ref<OptimizationMode>('system')
let selectedIterateTemplate = ref('')
let currentVersions = ref<any[]>([])
let currentVersionId = ref<string | null>(null)
let currentChainId = ref<string | null>(null)
let currentSelectedTemplate = ref('')
let showConfig = ref(false)
let showHistory = ref(false)
let showDataManager = ref(false)
let showTemplateManager = ref(false)
let currentTemplateManagerType = ref<'optimize' | 'userOptimize' | 'iterate'>('optimize')

let handleOptimizePrompt = () => {}
let handleIteratePrompt = (payload: any) => {}
let handleSwitchVersion = (versionId: string) => {}

const optimizeModelSelect = ref(null)
const testPanelRef = ref(null)

// 6. Watch for services to become available, then initialize all business logic
watch(services, (newServices) => {
  if (!newServices) return

  promptService.value = newServices.promptService;

  const testModelSelect = computed(() => (testPanelRef.value as any)?.modelSelectRef || null)

  const modelMgr = useModelManager({
    modelManager: newServices.modelManager,
    optimizeModelSelect: optimizeModelSelect,
    testModelSelect: testModelSelect
  });
  showConfig = modelMgr.showConfig
  selectedOptimizeModel = modelMgr.selectedOptimizeModel
  selectedTestModel = modelMgr.selectedTestModel

  const optimizer = usePromptOptimizer(
    newServices.modelManager,
    newServices.templateManager,
    newServices.historyManager,
    newServices.promptService,
    selectedOptimizationMode,
    selectedOptimizeModel,
    selectedTestModel,
  );
  prompt = optimizer.prompt
  optimizedPrompt = optimizer.optimizedPrompt
  optimizedReasoning = optimizer.optimizedReasoning
  isOptimizing = optimizer.isOptimizing
  isIterating = optimizer.isIterating
  selectedIterateTemplate = optimizer.selectedIterateTemplate
  currentVersions = optimizer.currentVersions
  currentVersionId = optimizer.currentVersionId
  currentChainId = optimizer.currentChainId
  handleOptimizePrompt = optimizer.handleOptimizePrompt
  handleIteratePrompt = optimizer.handleIteratePrompt
  handleSwitchVersion = optimizer.handleSwitchVersion

  const promptHistory = usePromptHistory(
    newServices.historyManager,
    prompt,
    optimizedPrompt,
    currentChainId,
    currentVersions,
    currentVersionId
  )

  const historyMgr = useHistoryManager(
    newServices.historyManager,
    prompt,
    optimizedPrompt,
    currentChainId,
    currentVersions,
    currentVersionId,
    promptHistory.handleSelectHistory,
    promptHistory.handleClearHistory,
    promptHistory.handleDeleteChain
  )
  showHistory = historyMgr.showHistory

  const templateMgr = useTemplateManager(
    services as any,
    {
      selectedOptimizeTemplate: optimizer.selectedOptimizeTemplate,
      selectedUserOptimizeTemplate: optimizer.selectedUserOptimizeTemplate,
      selectedIterateTemplate: optimizer.selectedIterateTemplate
    }
  )
  showTemplateManager = templateMgr.showTemplates
  currentTemplateManagerType = templateMgr.currentType

  currentSelectedTemplate = computed({
    get() {
      return selectedOptimizationMode.value === 'system'
        ? optimizer.selectedOptimizeTemplate.value
        : optimizer.selectedUserOptimizeTemplate.value
    },
    set(newValue) {
      if (!newValue) return;
      if (selectedOptimizationMode.value === 'system') {
        optimizer.selectedOptimizeTemplate.value = newValue
      } else {
        optimizer.selectedUserOptimizeTemplate.value = newValue
      }
    }
  })

  isReady.value = true
  console.log('All services and composables initialized.')
})

// Helper functions for template
const openGithubRepo = () => {
  window.open('https://github.com/prompt-optimizer/prompt-optimizer', '_blank');
}
const openTemplateManager = (templateType?: string) => {
  // 如果传入了模板类型，直接使用；否则根据当前优化模式判断（向后兼容）
  currentTemplateManagerType.value = templateType || (selectedOptimizationMode.value === 'system' ? 'optimize' : 'userOptimize')
  showTemplateManager.value = true
}
const handleOptimizationModeChange = (mode: OptimizationMode) => {
  selectedOptimizationMode.value = mode
}
const promptInputLabel = computed(() => {
  return selectedOptimizationMode.value === 'system' ? t('promptOptimizer.originalPrompt') : t('promptOptimizer.userPrompt')
})
const promptInputPlaceholder = computed(() => {
  return selectedOptimizationMode.value === 'system' ? t('promptOptimizer.originalPromptPlaceholder') : t('promptOptimizer.userPromptPlaceholder')
})
</script>

<style scoped>
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