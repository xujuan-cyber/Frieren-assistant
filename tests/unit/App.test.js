import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import App from '../../src/App.vue'
import { createLLMService } from '../../src/services/llm/service'
import { createPromptService } from '../../src/services/prompt/service'
import { modelManager } from '../../src/services/model/manager'
import ElementPlus from 'element-plus'
import { createTestingPinia } from '@pinia/testing'
import { ElInput, ElButton, ElSelect, ElOption } from 'element-plus'

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

// 创建 mock 处理器
const mockStreamHandler = {
  onToken: vi.fn(),
  onComplete: vi.fn(),
  onError: vi.fn()
}

describe('App.vue', () => {
  let wrapper

  beforeEach(() => {
    // 重置所有mock
    mockInfo.mockClear()
    mockWarning.mockClear()
    mockStreamHandler.onToken.mockClear()
    mockStreamHandler.onComplete.mockClear()
    mockStreamHandler.onError.mockClear()
    
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
    beforeEach(() => {
      // 确保每个测试前重置 mockStreamHandler
      wrapper.vm.streamHandler = mockStreamHandler
    })

    it('应该正确处理流式输出测试请求', async () => {
      const testPrompt = '你是一个作家'
      const testContent = '测试内容'
      const selectedModel = 'test'

      // 设置 mock 返回值
      mockPromptService.testPrompt.mockResolvedValue('测试响应')

      // 设置必要的值
      wrapper.vm.testContent = testContent
      wrapper.vm.selectedModel = selectedModel
      wrapper.vm.optimizedPrompt = testPrompt

      await wrapper.vm.handleTest()

      const calls = mockPromptService.testPrompt.mock.calls
      expect(calls.length).toBe(1)
      expect(calls[0].slice(0, 3)).toEqual([testPrompt, testContent, selectedModel])
      expect(Object.keys(calls[0][3])).toEqual(['onToken', 'onComplete', 'onError'])
    })

    it('应该在流式输出发生错误时正确处理', async () => {
      const testError = new Error('测试错误');
      const testPrompt = '你是一个作家';
      const testContent = '测试内容';
      const selectedModel = 'test';

      // 设置 mock 返回值
      mockPromptService.testPrompt.mockResolvedValue('测试响应');

      // 设置必要的值
      wrapper.vm.testContent = testContent;
      wrapper.vm.selectedModel = selectedModel;
      wrapper.vm.optimizedPrompt = testPrompt;

      await wrapper.vm.handleTest();

      const calls = mockPromptService.testPrompt.mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0].slice(0, 3)).toEqual([testPrompt, testContent, selectedModel]);
      expect(Object.keys(calls[0][3])).toEqual(['onToken', 'onComplete', 'onError']);

      // 触发错误回调
      await calls[0][3].onError(testError);
      await nextTick();

      // 验证错误状态
      const outputPanel = wrapper.findComponent({ name: 'OutputPanel' });
      expect(outputPanel.props('error')).toBe(testError.message);
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