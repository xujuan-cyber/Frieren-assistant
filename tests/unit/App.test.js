import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import App from '../../src/App.vue'
import { llmService } from '../../src/services/llm'
import { promptManager } from '../../src/services/promptManager'

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
vi.mock('../../src/services/llm', () => ({
  llmService: {
    getAllModels: vi.fn(() => [
      { key: 'test', name: 'Test Model', model: 'test-model', enabled: true }
    ]),
    optimizePrompt: vi.fn(() => Promise.resolve('Optimized prompt')),
    iteratePrompt: vi.fn(() => Promise.resolve('Iterated prompt')),
    sendMessage: vi.fn(() => Promise.resolve('Test response'))
  }
}))

vi.mock('../../src/services/promptManager', () => ({
  promptManager: {
    init: vi.fn(),
    getHistory: vi.fn(() => []),
    addToHistory: vi.fn()
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
    result: String
  },
  emits: ['update:modelValue', 'update:model', 'submit', 'copy']
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
    it('应该加载模型和历史记录', async () => {
      expect(llmService.getAllModels).toHaveBeenCalled()
      expect(promptManager.init).toHaveBeenCalled()
      expect(promptManager.getHistory).toHaveBeenCalled()
    })

    it('应该正确渲染标题', () => {
      expect(wrapper.find('h1').text()).toBe('Prompt Optimizer')
    })

    it('应该渲染所有主要组件', () => {
      expect(wrapper.findComponent({ name: 'InputPanel' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'PromptPanel' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'OutputPanel' }).exists()).toBe(true)
    })

    it('应该正确初始化', async () => {
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
      llmService.optimizePrompt.mockResolvedValue(optimizedPrompt)

      // 找到第一个 InputPanel（提示词输入）
      const inputPanel = wrapper.findComponent({ name: 'InputPanel' })
      
      // 触发输入
      await inputPanel.vm.$emit('update:modelValue', testPrompt)
      
      // 触发提交
      await inputPanel.vm.$emit('submit')
      
      // 等待异步操作
      await nextTick()

      // 验证服务调用
      expect(llmService.optimizePrompt).toHaveBeenCalledWith(testPrompt, 'optimize', 'test')
      
      // 验证结果更新
      expect(wrapper.vm.optimizedPrompt).toBe(optimizedPrompt)
      
      // 验证历史记录添加
      expect(promptManager.addToHistory).toHaveBeenCalledWith(testPrompt, optimizedPrompt, 'optimize')
    })

    it('应该处理优化失败的情况', async () => {
      const testPrompt = '测试提示词'
      const errorMessage = '优化失败'

      // 设置模拟错误
      llmService.optimizePrompt.mockRejectedValue(new Error(errorMessage))

      // 找到输入面板
      const inputPanel = wrapper.findComponent({ name: 'InputPanel' })
      
      // 触发输入和提交
      await inputPanel.vm.$emit('update:modelValue', testPrompt)
      await inputPanel.vm.$emit('submit')
      
      // 等待异步操作
      await nextTick()

      // 验证错误状态
      expect(wrapper.vm.isOptimizing).toBe(false)
      // 注意：Toast 组件的验证需要根据实际实现调整
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
      llmService.sendMessage.mockResolvedValue(testResult)

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
      expect(llmService.sendMessage).toHaveBeenCalledWith(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: testContent }
        ],
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
      llmService.sendMessage.mockResolvedValue(testResult)

      // 找到测试输入面板
      const inputPanels = wrapper.findAllComponents({ name: 'InputPanel' })
      const testPanel = inputPanels[1]
      
      // 触发输入和提交
      await testPanel.vm.$emit('update:modelValue', testContent)
      await testPanel.vm.$emit('submit')
      
      // 等待异步操作
      await nextTick()

      // 验证服务调用使用了原始提示词
      expect(llmService.sendMessage).toHaveBeenCalledWith(
        [
          { role: 'system', content: originalPrompt },
          { role: 'user', content: testContent }
        ],
        'test'
      )
    })

    it('应该处理测试失败的情况', async () => {
      const testContent = '测试内容'
      const errorMessage = '测试失败'

      // 设置模拟错误
      llmService.sendMessage.mockRejectedValue(new Error(errorMessage))

      // 找到测试输入面板
      const inputPanels = wrapper.findAllComponents({ name: 'InputPanel' })
      const testPanel = inputPanels[1]
      
      // 触发输入和提交
      await testPanel.vm.$emit('update:modelValue', testContent)
      await testPanel.vm.$emit('submit')
      
      // 等待异步操作
      await nextTick()

      // 验证错误状态
      expect(wrapper.vm.testError).toBe('测试失败：' + errorMessage)
      expect(wrapper.vm.isTesting).toBe(false)
    })
  })

  describe('历史记录功能', () => {
    let wrapper
    
    beforeEach(() => {
      // 重置所有mock
      vi.clearAllMocks()
      
      // 设置mock返回值
      llmService.optimizePrompt.mockResolvedValue('优化后的提示词')
      promptManager.getHistory.mockReturnValue([])
      
      // 挂载组件
      wrapper = mount(App)
    })

    it('成功优化后应该更新历史记录', async () => {
      // 设置输入
      wrapper.vm.prompt = '测试提示词'
      await nextTick()
      
      // 触发优化
      await wrapper.vm.handleOptimizePrompt()
      
      // 验证调用和更新
      expect(promptManager.addToHistory).toHaveBeenCalledWith(
        '测试提示词',
        '优化后的提示词',
        'optimize'
      )
      expect(promptManager.getHistory).toHaveBeenCalled()
    })

    it('优化失败时不应该更新历史记录', async () => {
      // 设置输入
      wrapper.vm.prompt = '测试提示词'
      await nextTick()
      
      // 模拟优化失败
      llmService.optimizePrompt.mockRejectedValueOnce(new Error('优化失败'))
      
      // 触发优化
      await wrapper.vm.handleOptimizePrompt()
      
      // 验证没有添加到历史记录
      expect(promptManager.addToHistory).not.toHaveBeenCalled()
    })

    it('应该在迭代优化成功后立即更新历史记录', async () => {
      // 设置mock返回值
      llmService.iteratePrompt.mockResolvedValue('迭代结果')
      promptManager.getHistory.mockReturnValue([{
        id: '1',
        prompt: '原始提示词',
        result: '优化结果',
        type: 'optimize'
      }])
      
      // 触发迭代优化
      await wrapper.vm.handleIteratePrompt({
        originalPrompt: '测试提示词',
        iterateInput: '迭代输入'
      })
      
      // 验证调用和更新
      expect(promptManager.addToHistory).toHaveBeenCalledWith(
        '测试提示词',
        '迭代结果',
        'iterate',
        '1'
      )
      expect(promptManager.getHistory).toHaveBeenCalled()
    })
  })
}) 