import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import App from '../../src/App.vue'
import { createLLMService, createPromptService, modelManager, templateManager, historyManager } from '@prompt-optimizer/core'
import ElementPlus from 'element-plus'
import { createTestingPinia } from '@pinia/testing'
import { ElInput, ElButton, ElSelect, ElOption } from 'element-plus'
import { useToast } from '@prompt-optimizer/ui'

// Helper function to create mock components
const createComponent = vi.hoisted(() => (name, template = '<div><slot></slot></div>') => ({
  name,
  template,
  props: {
    modelValue: String,
    model: String,
    models: Array,
    label: String,
    placeholder: String,
    modelLabel: String,
    buttonText: String,
    loadingText: String,
    loading: Boolean,
    disabled: Boolean,
    optimizedPrompt: String,
    error: String,
    result: String,
    isIterating: Boolean
  },
  emits: ['update:modelValue', 'update:model', 'submit', 'copy', 'iterate']
}))

// Mock toast functions
const mockSuccess = vi.fn()
const mockError = vi.fn()
const mockInfo = vi.fn()
const mockWarning = vi.fn()

// Mock stream handler
const mockStreamHandler = {
  onToken: vi.fn(),
  onComplete: vi.fn(),
  onError: vi.fn()
}

// Mock usePromptOptimizer and usePromptTester
vi.mock('@prompt-optimizer/ui', () => ({
  useToast: () => ({
    success: mockSuccess,
    error: mockError,
    info: mockInfo,
    warning: mockWarning
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
    handleOptimizePrompt: vi.fn().mockImplementation(async () => {
      mockSuccess('优化成功')
      return Promise.resolve()
    }),
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
    handleTest: vi.fn().mockImplementation(async () => {
      mockSuccess('测试成功')
      return Promise.resolve()
    })
  }),
  MainLayout: createComponent('MainLayout', '<div><h1><slot name="title"></slot></h1><slot></slot><slot name="actions"></slot><slot name="modals"></slot></div>'),
  ContentCard: createComponent('ContentCard'),
  InputPanel: createComponent('InputPanel'),
  PromptPanel: createComponent('PromptPanel'),
  OutputPanel: createComponent('OutputPanel'),
  ActionButton: createComponent('ActionButton'),
  TemplateSelect: createComponent('TemplateSelect'),
  TemplateManager: createComponent('TemplateManager'),
  HistoryDrawer: createComponent('HistoryDrawer'),
  ModelManager: createComponent('ModelManager')
}))

// Mock services
const mockLLMService = {
  sendMessage: vi.fn(() => Promise.resolve('Test response')),
  sendMessageStream: vi.fn(() => Promise.resolve()),
  optimizePrompt: vi.fn(() => Promise.resolve('Optimized prompt')),
  iteratePrompt: vi.fn(() => Promise.resolve('Iterated prompt'))
}

const mockPromptService = {
  optimizePrompt: vi.fn(() => Promise.resolve('Optimized prompt')),
  optimizePromptStream: vi.fn().mockImplementation(async (prompt, model, template, handlers) => {
    handlers.onToken('优化后的')
    handlers.onToken('提示词')
    handlers.onComplete()
    return {
      chainId: 'test-chain-1',
      currentRecord: {
        id: '1',
        originalPrompt: '测试提示词',
        optimizedPrompt: '优化后的提示词',
        type: 'optimize',
        chainId: 'test-chain-1',
        version: 1,
        timestamp: Date.now(),
        modelKey: 'test-model',
        templateId: 'template-1'
      }
    }
  }),
  iteratePrompt: vi.fn(() => Promise.resolve('Iterated prompt')),
  iteratePromptStream: vi.fn().mockImplementation(async (prompt, input, model, handlers) => {
    handlers.onToken('迭代后的')
    handlers.onToken('提示词')
    handlers.onComplete()
    return {
      chainId: 'test-chain-1',
      currentRecord: {
        id: '2',
        originalPrompt: prompt,
        optimizedPrompt: '迭代后的提示词',
        type: 'iterate',
        chainId: 'test-chain-1',
        version: 2,
        timestamp: Date.now(),
        modelKey: 'test-model',
        templateId: 'template-2',
        previousId: '1'
      }
    }
  }),
  testPrompt: vi.fn(() => Promise.resolve('Test response')),
  testPromptStream: vi.fn(() => Promise.resolve()),
  getHistory: vi.fn().mockReturnValue([])
}

vi.mock('@prompt-optimizer/core', () => ({
  createLLMService: vi.fn(() => mockLLMService),
  createPromptService: vi.fn(() => mockPromptService),
  modelManager: {
    getAllModels: vi.fn(() => [
      { key: 'test', name: 'Test Model', model: 'test-model', enabled: true }
    ])
  },
  historyManager: {
    init: vi.fn(),
    clearHistory: vi.fn(),
    createNewChain: vi.fn().mockReturnValue({
      chainId: 'test-chain-1',
      rootRecord: {
        id: '1',
        originalPrompt: '测试提示词',
        optimizedPrompt: '优化后的提示词',
        type: 'optimize',
        chainId: 'test-chain-1',
        version: 1,
        timestamp: Date.now(),
        modelKey: 'test',
        templateId: 'template-1'
      },
      currentRecord: {
        id: '1',
        originalPrompt: '测试提示词',
        optimizedPrompt: '优化后的提示词',
        type: 'optimize',
        chainId: 'test-chain-1',
        version: 1,
        timestamp: Date.now(),
        modelKey: 'test',
        templateId: 'template-1'
      },
      versions: [{
        id: '1',
        originalPrompt: '测试提示词',
        optimizedPrompt: '优化后的提示词',
        type: 'optimize',
        chainId: 'test-chain-1',
        version: 1,
        timestamp: Date.now(),
        modelKey: 'test',
        templateId: 'template-1'
      }]
    }),
    getAllChains: vi.fn().mockReturnValue([])
  },
  templateManager: {
    init: vi.fn(),
    clearCache: vi.fn(),
    getTemplate: vi.fn(),
    listTemplates: vi.fn(),
    listTemplatesByType: vi.fn().mockReturnValue([
      {
        id: 'template-1',
        name: '优化提示词',
        content: '优化模板内容',
        metadata: {
          templateType: 'optimize',
          version: '1.0',
          lastModified: Date.now()
        }
      },
      {
        id: 'template-2',
        name: '迭代提示词',
        content: '迭代模板内容',
        metadata: {
          templateType: 'iterate',
          version: '1.0',
          lastModified: Date.now()
        }
      }
    ])
  }
}))

describe('App.vue', () => {
  let wrapper
  let mockPromptService

  beforeEach(async () => {
    // 重置所有mock
    mockInfo.mockClear()
    mockWarning.mockClear()
    mockSuccess.mockClear()
    mockError.mockClear()
    mockStreamHandler.onToken.mockClear()
    mockStreamHandler.onComplete.mockClear()
    mockStreamHandler.onError.mockClear()
    
    // 初始化提示词管理器和历史记录管理器
    await templateManager.init()
    await historyManager.init() // 先初始化
    await historyManager.clearHistory() // 再清理历史记录
    
    mockPromptService = {
      optimizePromptStream: vi.fn().mockImplementation(async (prompt, model, template, handlers) => {
        handlers.onToken('优化后的')
        handlers.onToken('提示词')
        handlers.onComplete()
        return {
          chainId: 'test-chain-1',
          currentRecord: {
            id: '1',
            originalPrompt: '测试提示词',
            optimizedPrompt: '优化后的提示词',
            type: 'optimize',
            chainId: 'test-chain-1',
            version: 1,
            timestamp: Date.now(),
            modelKey: 'test-model',
            templateId: 'template-1'
          }
        }
      }),
      iteratePromptStream: vi.fn().mockImplementation(async (prompt, input, model, handlers) => {
        handlers.onToken('迭代后的')
        handlers.onToken('提示词')
        handlers.onComplete()
        return {
          chainId: 'test-chain-1',
          currentRecord: {
            id: '2',
            originalPrompt: prompt,
            optimizedPrompt: '迭代后的提示词',
            type: 'iterate',
            chainId: 'test-chain-1',
            version: 2,
            timestamp: Date.now(),
            modelKey: 'test-model',
            templateId: 'template-2',
            previousId: '1'
          }
        }
      }),
      testPromptStream: vi.fn().mockImplementation(async (prompt, input, model, handlers) => {
        handlers.onToken('测试')
        handlers.onToken('结果')
        handlers.onComplete()
        return {
          chainId: 'test-chain-1',
          currentRecord: {
            id: '3',
            currentPrompt: input,
            optimizedPrompt: '测试结果',
            type: 'test',
            chainId: prompt,
            version: 1,
            timestamp: Date.now(),
            modelKey: model,
            templateId: 'test'
          }
        }
      }),
      getHistory: vi.fn().mockReturnValue([])
    }
    createPromptService.mockResolvedValue(mockPromptService)

    // 设置组件
    wrapper = mount(App, {
      global: {
        plugins: [
          ElementPlus,
          createTestingPinia({
            createSpy: vi.fn
          })
        ],
        components: {
          'el-input': ElInput,
          'el-button': ElButton,
          'el-select': ElSelect,
          'el-option': ElOption
        }
      }
    })

    // 等待组件初始化完成
    await nextTick()
    await nextTick()
    
    // 设置streamHandler
    wrapper.vm.streamHandler = mockStreamHandler
  })

  describe('初始化', () => {
    it('应该正确渲染标题', () => {
      expect(wrapper.find('h1').text()).toBe('Prompt Optimizer')
    })

    it('应该渲染所有主要组件', () => {
      expect(wrapper.findComponent({ name: 'InputPanel' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'PromptPanel' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'OutputPanel' }).exists()).toBe(true)
    })

    it('应该正确初始化模型', async () => {
      expect(modelManager.getAllModels).toHaveBeenCalled()
      expect(wrapper.vm.models).toBeDefined()
      expect(wrapper.vm.optimizeModel).toBe('test')
      expect(wrapper.vm.selectedModel).toBe('test')
    })

    it('应该正确初始化服务', async () => {
      expect(createPromptService).toHaveBeenCalledWith(modelManager, mockLLMService)
      expect(templateManager.init).toHaveBeenCalled()
      expect(historyManager.init).toHaveBeenCalled()
    })
  })

  describe('提示词优化功能', () => {
    it('应该正确处理提示词优化', async () => {
      const testPrompt = '测试提示词'
      
      wrapper.vm.prompt = testPrompt
      wrapper.vm.optimizeModel = 'test'
      wrapper.vm.selectedOptimizeTemplate = {
        id: 'template-1',
        content: '优化模板'
      }

      await wrapper.vm.handleOptimizePrompt()
      
      expect(mockSuccess).toHaveBeenCalledWith('优化成功')
    })

    it('应该处理优化失败的情况', async () => {
      const testPrompt = '测试提示词'
      const errorMessage = '优化失败'
      
      const { handleOptimizePrompt } = wrapper.vm
      handleOptimizePrompt.mockImplementationOnce(async () => {
        mockError(errorMessage)
        throw new Error(errorMessage)
      })

      wrapper.vm.prompt = testPrompt
      wrapper.vm.optimizeModel = 'test'
      wrapper.vm.selectedOptimizeTemplate = {
        id: 'template-1',
        content: '优化模板'
      }

      await expect(wrapper.vm.handleOptimizePrompt()).rejects.toThrow(errorMessage)
      expect(mockError).toHaveBeenCalledWith(errorMessage)
    })
  })

  describe('测试功能', () => {
    it('应该正确处理测试请求', async () => {
      const testPrompt = '测试提示词'
      const testContent = '测试内容'

      wrapper.vm.testContent = testContent
      wrapper.vm.selectedModel = 'test'
      wrapper.vm.optimizedPrompt = testPrompt

      await wrapper.vm.handleTest()

      expect(mockSuccess).toHaveBeenCalledWith('测试成功')
    })

    it('应该处理测试失败的情况', async () => {
      const testPrompt = '测试提示词'
      const testContent = '测试内容'
      const errorMessage = '测试失败'

      const { handleTest } = wrapper.vm
      handleTest.mockImplementationOnce(async () => {
        mockError(errorMessage)
        throw new Error(errorMessage)
      })

      wrapper.vm.testContent = testContent
      wrapper.vm.selectedModel = 'test'
      wrapper.vm.optimizedPrompt = testPrompt

      await expect(wrapper.vm.handleTest()).rejects.toThrow(errorMessage)
      expect(mockError).toHaveBeenCalledWith(errorMessage)
    })
  })

  describe('历史记录功能', () => {
    it('应该正确处理历史记录选择', async () => {
      const mockHistoryContext = {
        record: {
          optimizedPrompt: '优化后的提示词',
          modelKey: 'test',
          templateId: 'template-1'
        },
        chainId: 'test-chain-1',
        rootPrompt: '原始提示词'
      }

      await wrapper.vm.handleSelectHistory(mockHistoryContext)

      expect(wrapper.vm.prompt).toBe(mockHistoryContext.rootPrompt)
      expect(wrapper.vm.optimizedPrompt).toBe(mockHistoryContext.record.optimizedPrompt)
      expect(historyManager.createNewChain).toHaveBeenCalled()
      expect(historyManager.getAllChains).toHaveBeenCalled()
    })

    it('应该正确处理清空历史记录', async () => {
      await wrapper.vm.handleClearHistory()

      expect(historyManager.clearHistory).toHaveBeenCalled()
      expect(mockSuccess).toHaveBeenCalledWith('历史记录已清空')
    })
  })

  // 清理
  afterEach(async () => {
    if (wrapper) {
      wrapper.unmount()
    }
    // 清理提示词管理器和历史记录管理器
    await templateManager.clearCache()
    await historyManager.init() // 先初始化
    await historyManager.clearHistory() // 再清理历史记录
  })
}) 