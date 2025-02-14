import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import App from '../../src/App.vue'
import { createLLMService, createPromptService, modelManager, templateManager, historyManager } from '@prompt-optimizer/core'
import ElementPlus from 'element-plus'
import { createTestingPinia } from '@pinia/testing'
import { ElInput, ElButton, ElSelect, ElOption } from 'element-plus'
import { useToast } from '../../src/composables/useToast'

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

// Mock useToast
vi.mock('../../src/composables/useToast', () => ({
  useToast: () => ({
    success: mockSuccess,
    error: mockError,
    info: mockInfo,
    warning: mockWarning
  })
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
    createNewChain: vi.fn(),
    addIteration: vi.fn(),
    getAllChains: vi.fn()
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

// Mock components
const createComponent = (name, template = '<div><slot></slot></div>') => ({
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
})

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
      getHistory: vi.fn().mockReturnValue([
        {
          id: '1',
          currentPrompt: '测试提示词',
          optimizedPrompt: '优化后的提示词',
          type: 'optimize',
          chainId: 'test-chain-1',
          version: 1,
          timestamp: Date.now(),
          modelKey: 'test-model',
          templateId: 'template-1'
        }
      ])
    }
    createPromptService.mockResolvedValue(mockPromptService)

    // 设置组件
    wrapper = mount(App, {
      global: {
        plugins: [createTestingPinia()],
        components: {
          'el-input': ElInput,
          'el-button': ElButton,
          'el-select': ElSelect,
          'el-option': ElOption
        }
      }
    })
    
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

    it('应该正确初始化', async () => {
      expect(modelManager.getAllModels).toHaveBeenCalled()
      expect(wrapper.vm.models.length).toBe(1)
      expect(wrapper.vm.optimizeModel).toBe('test')
      expect(wrapper.vm.selectedModel).toBe('test')
    })
  })

  describe('提示词优化功能', () => {
    it('应该正确处理提示词优化', async () => {
      const testPrompt = '测试提示词'
      const optimizedPrompt = '优化后的提示词'
      const chainId = 'test-chain-1'
      const recordId = '1'
      const mockRecord = {
        id: recordId,
        originalPrompt: testPrompt,
        optimizedPrompt: optimizedPrompt,
        type: 'optimize',
        chainId,
        version: 1,
        timestamp: Date.now(),
        modelKey: 'test-model',
        templateId: 'template-1'
      }

      wrapper.vm.prompt = testPrompt
      wrapper.vm.optimizeModel = 'test-model'
      wrapper.vm.selectedOptimizeTemplate = {
        id: 'template-1',
        content: '优化模板'
      }

      // Mock historyManager
      historyManager.createNewChain.mockReturnValue({
        chainId,
        rootRecord: mockRecord,
        currentRecord: mockRecord,
        versions: [mockRecord]
      })

      historyManager.getAllChains.mockReturnValue([{
        chainId,
        rootRecord: mockRecord,
        currentRecord: mockRecord,
        versions: [mockRecord]
      }])

      mockPromptService.optimizePromptStream.mockImplementation(async (prompt, model, template, handlers) => {
        handlers.onToken(optimizedPrompt)
        await nextTick()
        handlers.onComplete()
        return {
          chainId,
          currentRecord: mockRecord
        }
      })

      await wrapper.vm.handleOptimizePrompt()
      
      expect(mockPromptService.optimizePromptStream).toHaveBeenCalled()
      expect(wrapper.vm.optimizedPrompt).toBe(optimizedPrompt)
      expect(mockSuccess).toHaveBeenCalledWith('优化成功')
    })

    it('应该处理优化失败的情况', async () => {
      const testPrompt = '测试提示词'
      const errorMessage = '优化失败'
      
      mockPromptService.optimizePromptStream.mockImplementationOnce(
        async (prompt, model, template, handlers) => {
          handlers.onError(new Error(errorMessage))
          throw new Error(errorMessage)
        }
      )

      wrapper.vm.prompt = testPrompt
      wrapper.vm.optimizeModel = 'test-model'
      wrapper.vm.selectedOptimizeTemplate = {
        id: 'template-1',
        content: '优化模板'
      }

      await wrapper.vm.handleOptimizePrompt()
      
      expect(mockError).toHaveBeenCalledWith(errorMessage)
    })
  })

  describe('测试功能', () => {
    beforeEach(() => {
      // 确保每个测试前重置 mockStreamHandler
      wrapper.vm.streamHandler = mockStreamHandler
    })

    it('应该正确处理流式输出测试请求', async () => {
      const testPrompt = '测试提示词'
      const testContent = '测试内容'
      const selectedModel = 'test'
      const testResponse = '测试响应'

      // 设置 mock 返回值
      mockPromptService.testPromptStream.mockImplementation(async (prompt, content, model, handlers) => {
        handlers.onToken(testResponse)
        handlers.onComplete()
      })

      // 设置必要的值
      wrapper.vm.testContent = testContent
      wrapper.vm.selectedModel = selectedModel
      wrapper.vm.optimizedPrompt = testPrompt

      await wrapper.vm.handleTest()

      // 验证调用
      expect(mockPromptService.testPromptStream).toHaveBeenCalledWith(
        testPrompt,
        testContent,
        selectedModel,
        expect.any(Object)
      )
      expect(wrapper.vm.testResult).toBe(testResponse)
    })

    it('应该在流式输出发生错误时正确处理', async () => {
      const testError = new Error('测试错误')
      const testPrompt = '测试提示词'
      const testContent = '测试内容'
      const selectedModel = 'test'

      // 设置 mock 返回值
      mockPromptService.testPromptStream.mockImplementation(async (prompt, content, model, handlers) => {
        handlers.onError(testError)
      })

      // 设置必要的值
      wrapper.vm.testContent = testContent
      wrapper.vm.selectedModel = selectedModel
      wrapper.vm.optimizedPrompt = testPrompt

      await wrapper.vm.handleTest()

      // 验证错误状态
      expect(wrapper.vm.testError).toBe(testError.message)
    })
  })

  describe('历史记录功能', () => {
    it('应该在优化成功后立即更新历史记录', async () => {
      const testPrompt = '测试提示词'
      const optimizedPrompt = '优化后的提示词'
      const chainId = 'test-chain-1'
      const recordId = '1'
      const mockRecord = {
        id: recordId,
        originalPrompt: testPrompt,
        optimizedPrompt: optimizedPrompt,
        type: 'optimize',
        chainId,
        version: 1,
        timestamp: Date.now(),
        modelKey: 'test-model',
        templateId: 'template-1'
      }
      
      // 设置提示词和模板
      wrapper.vm.prompt = testPrompt
      wrapper.vm.selectedOptimizeTemplate = {
        id: 'template-1',
        name: '提示词优化',
        content: 'template content'
      }

      // Mock historyManager
      historyManager.createNewChain.mockReturnValue({
        chainId,
        rootRecord: mockRecord,
        currentRecord: mockRecord,
        versions: [mockRecord]
      })

      historyManager.getAllChains.mockReturnValue([{
        chainId,
        rootRecord: mockRecord,
        currentRecord: mockRecord,
        versions: [mockRecord]
      }])

      // 设置模拟返回值
      mockPromptService.optimizePromptStream.mockImplementation(async (prompt, model, template, handlers) => {
        handlers.onToken(optimizedPrompt)
        await nextTick()
        handlers.onComplete()
        return {
          chainId,
          currentRecord: mockRecord
        }
      })

      // 触发优化
      await wrapper.vm.handleOptimizePrompt()
      
      // 等待异步操作
      await nextTick()
      await nextTick()

      // 验证历史记录更新
      expect(historyManager.createNewChain).toHaveBeenCalled()
      expect(historyManager.getAllChains).toHaveBeenCalled()
      expect(wrapper.vm.history[0].chainId).toBe(chainId)
      expect(wrapper.vm.history[0].currentRecord.id).toBe(recordId)
      expect(wrapper.vm.history[0].currentRecord.originalPrompt).toBe(testPrompt)
      expect(wrapper.vm.history[0].currentRecord.optimizedPrompt).toBe(optimizedPrompt)
    })

    it('应该在迭代优化成功后立即更新历史记录', async () => {
      const originalPrompt = '测试提示词'
      const iterateInput = '迭代输入'
      const iteratedPrompt = '迭代后的提示词'
      const chainId = 'test-chain-1'
      const recordId = '2'
      const previousId = '1'
      const mockRecord = {
        id: recordId,
        originalPrompt: originalPrompt,
        optimizedPrompt: iteratedPrompt,
        type: 'iterate',
        chainId,
        version: 2,
        timestamp: Date.now(),
        modelKey: 'test-model',
        templateId: 'template-2',
        previousId
      }

      // 设置当前链ID和迭代模板
      wrapper.vm.currentChainId = chainId
      wrapper.vm.selectedIterateTemplate = {
        id: 'template-2',
        name: '迭代优化',
        content: 'template content'
      }

      // Mock historyManager
      historyManager.addIteration.mockReturnValue({
        chainId,
        rootRecord: {
          id: previousId,
          originalPrompt: originalPrompt,
          optimizedPrompt: '优化后的提示词',
          type: 'optimize',
          chainId,
          version: 1,
          timestamp: Date.now(),
          modelKey: 'test-model',
          templateId: 'template-1'
        },
        currentRecord: mockRecord,
        versions: [
          {
            id: previousId,
            originalPrompt: originalPrompt,
            optimizedPrompt: '优化后的提示词',
            type: 'optimize',
            chainId,
            version: 1,
            timestamp: Date.now(),
            modelKey: 'test-model',
            templateId: 'template-1'
          },
          mockRecord
        ]
      })

      historyManager.getAllChains.mockReturnValue([{
        chainId,
        rootRecord: {
          id: previousId,
          originalPrompt: originalPrompt,
          optimizedPrompt: '优化后的提示词',
          type: 'optimize',
          chainId,
          version: 1,
          timestamp: Date.now(),
          modelKey: 'test-model',
          templateId: 'template-1'
        },
        currentRecord: mockRecord,
        versions: [
          {
            id: previousId,
            originalPrompt: originalPrompt,
            optimizedPrompt: '优化后的提示词',
            type: 'optimize',
            chainId,
            version: 1,
            timestamp: Date.now(),
            modelKey: 'test-model',
            templateId: 'template-1'
          },
          mockRecord
        ]
      }])

      mockPromptService.iteratePromptStream.mockImplementation(async (prompt, input, model, handlers) => {
        handlers.onToken(iteratedPrompt)
        handlers.onComplete()
        return {
          chainId,
          currentRecord: mockRecord
        }
      })

      // 触发迭代
      await wrapper.vm.handleIteratePrompt({ originalPrompt, iterateInput })
      
      // 等待异步操作
      await nextTick()
      await nextTick()

      // 验证历史记录更新
      expect(historyManager.addIteration).toHaveBeenCalled()
      expect(historyManager.getAllChains).toHaveBeenCalled()
      expect(wrapper.vm.history[0].chainId).toBe(chainId)
      expect(wrapper.vm.history[0].currentRecord.id).toBe(recordId)
      expect(wrapper.vm.history[0].currentRecord.originalPrompt).toBe(originalPrompt)
      expect(wrapper.vm.history[0].currentRecord.optimizedPrompt).toBe(iteratedPrompt)
      expect(wrapper.vm.history[0].currentRecord.previousId).toBe(previousId)
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