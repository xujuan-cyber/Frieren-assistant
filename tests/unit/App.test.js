import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import App from '../../src/App.vue'
import { llmService } from '../../src/services/llm'
import { promptManager } from '../../src/services/promptManager'

// Mock services
vi.mock('../../src/services/llm', () => ({
  llmService: {
    getAllModels: vi.fn(() => [
      { key: 'gemini', name: 'Google Gemini', enabled: true }
    ]),
    optimizePrompt: vi.fn(),
    sendMessage: vi.fn()
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
      expect(llmService.optimizePrompt).toHaveBeenCalledWith(testPrompt, 'optimize')
      
      // 验证结果更新
      expect(wrapper.vm.optimizedPrompt).toBe(optimizedPrompt)
      
      // 验证历史记录添加
      expect(promptManager.addToHistory).toHaveBeenCalledWith(testPrompt, optimizedPrompt)
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
      expect(llmService.sendMessage).toHaveBeenCalledWith([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: testContent }
      ])
      
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
      expect(llmService.sendMessage).toHaveBeenCalledWith([
        { role: 'system', content: originalPrompt },
        { role: 'user', content: testContent }
      ])
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
    it('应该正确处理历史记录选择', async () => {
      const historyItem = {
        prompt: '历史提示词',
        optimized: '历史优化结果'
      }

      // 触发历史记录选择
      await wrapper.vm.handleSelectHistory(historyItem)
      
      // 验证状态更新
      expect(wrapper.vm.prompt).toBe(historyItem.prompt)
      expect(wrapper.vm.optimizedPrompt).toBe(historyItem.optimized)
      expect(wrapper.vm.showHistory).toBe(false)
    })
  })
}) 