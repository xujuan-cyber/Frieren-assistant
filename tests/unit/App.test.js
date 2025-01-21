import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import App from '../../src/App.vue'
import { createLLMService } from '../../src/services/llm/service'
import { createPromptService } from '../../src/services/prompt/service'
import { modelManager } from '../../src/services/model/manager'

// Mock toast functions
const mockSuccess = vi.fn()
const mockError = vi.fn()
const mockInfo = vi.fn()
const mockWarning = vi.fn()

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
  optimizePrompt: vi.fn(() => Promise.resolve('Optimized prompt')),
  iteratePrompt: vi.fn(() => Promise.resolve('Iterated prompt'))
}

const mockPromptService = {
  optimizePrompt: vi.fn(() => Promise.resolve('Optimized prompt')),
  iteratePrompt: vi.fn(() => Promise.resolve('Iterated prompt')),
  testPrompt: vi.fn(() => Promise.resolve('Test response')),
  getHistory: vi.fn(() => [])
}

vi.mock('../../src/services/llm/service', () => ({
  createLLMService: vi.fn(() => mockLLMService)
}))

vi.mock('../../src/services/prompt/service', () => ({
  createPromptService: vi.fn(() => mockPromptService)
}))

vi.mock('../../src/services/model/manager', () => ({
  modelManager: {
    getAllModels: vi.fn(() => [
      { key: 'test', name: 'Test Model', model: 'test-model', enabled: true }
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

  beforeEach(() => {
    // 重置 mocks
    vi.clearAllMocks()
    mockSuccess.mockClear()
    mockError.mockClear()
    mockInfo.mockClear()
    mockWarning.mockClear()
    
    wrapper = mount(App, {
      global: {
        stubs: {
          InputPanel: createComponent('InputPanel'),
          PromptPanel: createComponent('PromptPanel'),
          OutputPanel: createComponent('OutputPanel'),
          ModelManager: createComponent('ModelManager'),
          HistoryDrawer: createComponent('HistoryDrawer'),
          Toast: createComponent('Toast')
        }
      }
    })
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
      const testPrompt = '你是一个作家'
      const optimizedPrompt = '优化后的提示词'

      // 设置模拟返回值
      mockPromptService.optimizePrompt.mockResolvedValue(optimizedPrompt)

      // 找到第一个 InputPanel（提示词输入）
      const inputPanel = wrapper.findComponent({ name: 'InputPanel' })
      
      // 触发输入
      await inputPanel.vm.$emit('update:modelValue', testPrompt)
      
      // 触发提交
      await inputPanel.vm.$emit('submit')
      
      // 等待异步操作
      await nextTick()

      // 验证服务调用
      expect(mockPromptService.optimizePrompt).toHaveBeenCalledWith(testPrompt, 'test')
      
      // 验证结果更新
      expect(wrapper.vm.optimizedPrompt).toBe(optimizedPrompt)
      
      // 验证成功提示
      expect(mockSuccess).toHaveBeenCalledWith('优化成功')
    })

    it('应该处理优化失败的情况', async () => {
      const testPrompt = '测试提示词'
      const errorMessage = '优化失败'

      // 设置模拟错误
      mockPromptService.optimizePrompt.mockRejectedValue(new Error(errorMessage))

      // 找到输入面板
      const inputPanel = wrapper.findComponent({ name: 'InputPanel' })
      
      // 触发输入和提交
      await inputPanel.vm.$emit('update:modelValue', testPrompt)
      await inputPanel.vm.$emit('submit')
      
      // 等待异步操作
      await nextTick()

      // 验证错误状态
      expect(wrapper.vm.isOptimizing).toBe(false)
      expect(mockError).toHaveBeenCalledWith(errorMessage)
    })
  })

  describe('测试功能', () => {
    it('应该正确处理测试请求', async () => {
      const testContent = '测试内容'
      const testResult = '测试结果'
      const systemPrompt = '系统提示词'

      // 设置初始状态
      wrapper.vm.optimizedPrompt = systemPrompt

      // 设置模拟返回值
      mockPromptService.testPrompt.mockResolvedValue(testResult)

      // 找到测试输入面板（第二个 InputPanel）
      const inputPanels = wrapper.findAllComponents({ name: 'InputPanel' })
      const testPanel = inputPanels[1]
      
      // 触发输入
      await testPanel.vm.$emit('update:modelValue', testContent)
      
      // 触发提交
      await testPanel.vm.$emit('submit')
      
      // 等待异步操作
      await nextTick()

      // 验证服务调用
      expect(mockPromptService.testPrompt).toHaveBeenCalledWith(
        systemPrompt,
        testContent,
        'test'
      )
      
      // 验证结果更新
      expect(wrapper.vm.testResult).toBe(testResult)
    })

    it('应该在没有优化提示词时使用原始提示词', async () => {
      const testContent = '测试内容'
      const originalPrompt = '原始提示词'
      const testResult = '测试结果'

      // 设置初始状态
      wrapper.vm.prompt = originalPrompt
      wrapper.vm.optimizedPrompt = ''

      // 设置模拟返回值
      mockPromptService.testPrompt.mockResolvedValue(testResult)

      // 找到测试输入面板
      const inputPanels = wrapper.findAllComponents({ name: 'InputPanel' })
      const testPanel = inputPanels[1]
      
      // 触发输入和提交
      await testPanel.vm.$emit('update:modelValue', testContent)
      await testPanel.vm.$emit('submit')
      
      // 等待异步操作
      await nextTick()

      // 验证服务调用使用了原始提示词
      expect(mockPromptService.testPrompt).toHaveBeenCalledWith(
        originalPrompt,
        testContent,
        'test'
      )
    })

    it('应该处理测试失败的情况', async () => {
      const testContent = '测试内容'
      const errorMessage = '测试失败'

      // 设置模拟错误
      mockPromptService.testPrompt.mockRejectedValue(new Error(errorMessage))

      // 找到测试输入面板
      const inputPanels = wrapper.findAllComponents({ name: 'InputPanel' })
      const testPanel = inputPanels[1]
      
      // 触发输入和提交
      await testPanel.vm.$emit('update:modelValue', testContent)
      await testPanel.vm.$emit('submit')
      
      // 等待异步操作
      await nextTick()

      // 验证错误状态
      expect(wrapper.vm.isTesting).toBe(false)
      expect(wrapper.vm.testError).toBe('测试失败：' + errorMessage)
    })
  })

  describe('历史记录功能', () => {
    it('应该在优化成功后立即更新历史记录', async () => {
      const testPrompt = '测试提示词'
      const optimizedPrompt = '优化后的提示词'
      const mockHistory = [{ id: '1', prompt: testPrompt, result: optimizedPrompt }]

      mockPromptService.optimizePrompt.mockResolvedValue(optimizedPrompt)
      mockPromptService.getHistory.mockReturnValue(mockHistory)

      // 触发优化
      const inputPanel = wrapper.findComponent({ name: 'InputPanel' })
      await inputPanel.vm.$emit('update:modelValue', testPrompt)
      await inputPanel.vm.$emit('submit')
      
      // 等待异步操作
      await nextTick()

      // 验证历史记录更新
      expect(mockPromptService.getHistory).toHaveBeenCalled()
      expect(wrapper.vm.history).toEqual(mockHistory)
    })

    it('应该在迭代优化成功后立即更新历史记录', async () => {
      const originalPrompt = '原始提示词'
      const iterateInput = '迭代输入'
      const iteratedPrompt = '迭代后的提示词'
      const mockHistory = [{ id: '1', prompt: originalPrompt, result: iteratedPrompt }]

      mockPromptService.iteratePrompt.mockResolvedValue(iteratedPrompt)
      mockPromptService.getHistory.mockReturnValue(mockHistory)

      // 触发迭代
      const promptPanel = wrapper.findComponent({ name: 'PromptPanel' })
      await promptPanel.vm.$emit('iterate', { originalPrompt, iterateInput })
      
      // 等待异步操作
      await nextTick()

      // 验证历史记录更新
      expect(mockPromptService.getHistory).toHaveBeenCalled()
      expect(wrapper.vm.history).toEqual(mockHistory)
    })
  })
}) 