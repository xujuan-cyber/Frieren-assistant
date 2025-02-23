import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import App from '../../src/App.vue'
import ElementPlus from 'element-plus'
import { createTestingPinia } from '@pinia/testing'

// Mock toast functions
const mockSuccess = vi.fn()
const mockError = vi.fn()
const mockInfo = vi.fn()
const mockWarning = vi.fn()

// 创建模拟管理器
const mockModelManager = vi.hoisted(() => ({
  init: vi.fn(),
  getAllModels: vi.fn(() => [
    { key: 'test', name: 'Test Model', model: 'test-model', enabled: true }
  ])
}))

const mockTemplateManager = vi.hoisted(() => ({
  init: vi.fn(),
  clearCache: vi.fn()
}))

const mockHistoryManager = vi.hoisted(() => ({
  init: vi.fn(),
  clearHistory: vi.fn()
}))

// Mock UI package
vi.mock('@prompt-optimizer/ui', () => ({
  useToast: () => ({
    success: mockSuccess,
    error: mockError,
    info: mockInfo,
    warning: mockWarning
  }),
  useServiceInitializer: () => ({
    promptServiceRef: ref({}),
    initBaseServices: vi.fn()
  }),
  usePromptOptimizer: () => ({
    prompt: ref(''),
    optimizedPrompt: ref(''),
    isOptimizing: ref(false),
    isIterating: ref(false),
    selectedOptimizeTemplate: ref(null),
    selectedIterateTemplate: ref(null),
    optimizeModel: ref('test'),
    currentVersions: ref([]),
    currentVersionId: ref(null),
    currentChainId: ref(null),
    handleOptimizePrompt: vi.fn(),
    handleIteratePrompt: vi.fn(),
    handleSwitchVersion: vi.fn(),
    saveTemplateSelection: vi.fn(),
    initTemplateSelection: vi.fn()
  }),
  usePromptTester: () => ({
    testContent: ref(''),
    testResult: ref(''),
    testError: ref(''),
    isTesting: ref(false),
    selectedModel: ref('test'),
    handleTest: vi.fn()
  }),
  useModelSelectors: () => ({
    optimizeModelSelect: ref('test'),
    testModelSelect: ref('test')
  }),
  useModelManager: () => ({
    showConfig: ref(false),
    selectedOptimizeModel: ref('test'),
    selectedTestModel: ref('test'),
    handleModelManagerClose: vi.fn(),
    handleModelsUpdated: vi.fn(),
    handleModelSelect: vi.fn()
  }),
  usePromptHistory: () => ({
    showHistory: ref(false),
    historyChains: ref([]),
    handleHistoryOpen: vi.fn(),
    handleHistoryClose: vi.fn(),
    handleSelectHistory: vi.fn(),
    handleClearHistory: vi.fn()
  }),
  useHistoryManager: () => ({
    history: ref([]),
    showHistory: ref(false),
    handleSelectHistory: vi.fn(),
    handleClearHistory: vi.fn(),
    handleHistoryOpen: vi.fn(),
    handleHistoryClose: vi.fn()
  }),
  useTemplateManager: () => ({
    showTemplateManager: ref(false),
    currentTemplateType: ref('optimize'),
    handleTemplateManagerOpen: vi.fn(),
    handleTemplateManagerClose: vi.fn(),
    handleTemplateSelect: vi.fn(),
    handleTemplateCreate: vi.fn(),
    handleTemplateUpdate: vi.fn(),
    handleTemplateDelete: vi.fn(),
    openTemplateManager: vi.fn()
  }),
  // 模拟所有UI组件
  MainLayoutUI: { template: '<div><slot name="title"></slot><slot></slot><slot name="actions"></slot><slot name="modals"></slot></div>' },
  ContentCardUI: { template: '<div><slot></slot></div>' },
  InputPanelUI: { template: '<div><slot></slot></div>' },
  PromptPanelUI: { template: '<div><slot></slot></div>' },
  OutputPanelUI: { template: '<div><slot></slot></div>' },
  ActionButtonUI: { template: '<button><slot></slot></button>' },
  TemplateSelectUI: { template: '<div><slot></slot></div>' },
  ModelSelectUI: { template: '<div><slot></slot></div>' },
  TemplateManagerUI: { template: '<div><slot></slot></div>' },
  HistoryDrawerUI: { template: '<div><slot></slot></div>' },
  ModelManagerUI: { template: '<div><slot></slot></div>' },
  // 重新导出core的内容
  modelManager: mockModelManager,
  historyManager: mockHistoryManager,
  templateManager: mockTemplateManager
}))

// 移除重复的mock
vi.mock('@prompt-optimizer/core', () => ({}))

describe('App.vue', () => {
  let wrapper

  beforeEach(async () => {
    // 重置所有mock
    mockInfo.mockClear()
    mockWarning.mockClear()
    mockSuccess.mockClear()
    mockError.mockClear()
    
    // 初始化模板管理器和历史记录管理器
    mockTemplateManager.init.mockClear()
    mockHistoryManager.init.mockClear()
    
    // 设置组件
    wrapper = mount(App, {
      global: {
        plugins: [
          ElementPlus,
          createTestingPinia({
            createSpy: vi.fn
          })
        ],
        stubs: 'shallow'
      }
    })

    // 等待组件初始化完成
    await nextTick()
  })

  describe('基本集成测试', () => {
    it('应该能够成功挂载组件', async () => {
      expect(wrapper.vm).toBeDefined()
    })
  })

  // 清理
  afterEach(async () => {
    if (wrapper) {
      wrapper.unmount()
    }
  })
})