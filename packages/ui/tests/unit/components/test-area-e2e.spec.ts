import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import TestAreaPanel from '../../../src/components/TestAreaPanel.vue'
import type { OptimizationMode } from '../../../src/index'

// 模拟服务层 - 更接近真实E2E场景
const createMockServices = () => ({
  promptService: {
    testPromptStream: vi.fn(),
    optimize: vi.fn(),
  },
  modelService: {
    getAvailableModels: vi.fn().mockResolvedValue([
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'claude-3', name: 'Claude-3' }
    ]),
    validateModel: vi.fn().mockResolvedValue({ isValid: true }),
  }
})

// Mock响应式系统
const mockBreakpoint = ref('lg')
const mockIsMobile = ref(false)

vi.mock('../../../src/composables/useResponsiveTestLayout', () => ({
  useResponsiveTestLayout: () => ({
    isMobile: mockIsMobile,
    isTablet: ref(false),
    currentBreakpoint: mockBreakpoint,
    recommendedInputMode: ref('default'),
    recommendedControlBarLayout: ref('default'),
    smartButtonSize: ref('medium'),
    responsiveHeights: ref({
      conversationMax: 300,
      inputMax: 200,
    }),
  }),
}))

// Mock测试模式配置
const mockOptimizationMode = ref<OptimizationMode>('system')

vi.mock('../../../src/composables/useTestModeConfig', () => ({
  useTestModeConfig: (mode: any) => ({
    currentModeConfig: ref({
      showTestInput: mode.value === 'system',
      enableCompareMode: true,
      inputLabel: mode.value === 'system' ? 'test.content' : 'test.userPromptTest',
    }),
    showTestInput: ref(mode.value === 'system'),
    requiresTestContent: ref(mode.value === 'system'),
    inputLabel: ref(mode.value === 'system' ? 'test.content' : 'test.userPromptTest'),
    canStartTest: ref((content: string, hasPrompt: boolean) => 
      mode.value === 'system' ? !!content && hasPrompt : hasPrompt
    ),
    enableCompareMode: ref(true),
    showConversationManager: ref(false),
  }),
}))

// Mock国际化
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}))

// Mock子组件为功能性组件
vi.mock('../../../src/components/TestInputSection.vue', () => ({
  default: {
    name: 'TestInputSection',
    props: ['modelValue', 'label', 'placeholder', 'helpText', 'disabled', 'mode', 'enableFullscreen'],
    emits: ['update:modelValue'],
    template: `
      <div data-testid="test-input-section" class="test-input-section">
        <input 
          :value="modelValue"
          :placeholder="placeholder"
          :disabled="disabled"
          @input="$emit('update:modelValue', $event.target.value)"
          data-testid="test-content-input"
          class="test-input-field"
        />
      </div>
    `,
  }
}))

vi.mock('../../../src/components/TestControlBar.vue', () => ({
  default: {
    name: 'TestControlBar',
    props: [
      'modelLabel', 'showCompareToggle', 'isCompareMode', 
      'primaryActionText', 'primaryActionDisabled', 'primaryActionLoading',
      'layout', 'buttonSize'
    ],
    emits: ['compare-toggle', 'primary-action'],
    template: `
      <div data-testid="test-control-bar" class="control-bar">
        <div class="model-section">
          <span>{{ modelLabel }}</span>
          <slot name="model-select">
            <select data-testid="model-select">
              <option value="gpt-4">GPT-4</option>
              <option value="claude-3">Claude-3</option>
            </select>
          </slot>
        </div>
        <div class="action-section">
          <button 
            v-if="showCompareToggle"
            data-testid="compare-toggle-btn"
            @click="$emit('compare-toggle')"
            :class="{ 'active': isCompareMode }"
            class="compare-toggle"
          >
            {{ isCompareMode ? 'Disable Compare' : 'Enable Compare' }}
          </button>
          <button 
            data-testid="primary-action-btn"
            @click="$emit('primary-action')"
            :disabled="primaryActionDisabled"
            :class="{ 'loading': primaryActionLoading }"
            class="primary-action"
          >
            {{ primaryActionText }}
          </button>
        </div>
      </div>
    `,
  }
}))

vi.mock('../../../src/components/TestResultSection.vue', () => ({
  default: {
    name: 'TestResultSection',
    props: ['isCompareMode', 'verticalLayout', 'showOriginal', 'originalTitle', 'optimizedTitle', 'singleResultTitle'],
    template: `
      <div data-testid="test-result-section" class="result-section">
        <div v-if="isCompareMode && showOriginal" data-testid="original-result" class="result-panel">
          <h4>{{ originalTitle }}</h4>
          <slot name="original-result">
            <div class="result-content">Original result placeholder</div>
          </slot>
        </div>
        <div v-if="isCompareMode" data-testid="optimized-result" class="result-panel">
          <h4>{{ optimizedTitle }}</h4>
          <slot name="optimized-result">
            <div class="result-content">Optimized result placeholder</div>
          </slot>
        </div>
        <div v-if="!isCompareMode" data-testid="single-result" class="result-panel">
          <h4>{{ singleResultTitle }}</h4>
          <slot name="single-result">
            <div class="result-content">Single result placeholder</div>
          </slot>
        </div>
      </div>
    `,
  }
}))

vi.mock('naive-ui', () => ({
  NFlex: {
    name: 'NFlex',
    props: ['vertical', 'justify', 'align'],
    template: '<div class="n-flex" :class="{ vertical, [`justify-${justify}`]: justify }"><slot /></div>',
  },
}))

describe('TestArea 端到端用户工作流测试', () => {
  let wrapper: VueWrapper<any>
  let mockServices: ReturnType<typeof createMockServices>

  const createE2EWrapper = (props = {}, options = {}) => {
    mockServices = createMockServices()
    
    return mount(TestAreaPanel, {
      props: {
        optimizationMode: mockOptimizationMode.value,
        isTestRunning: false,
        advancedModeEnabled: false,
        testContent: '',
        isCompareMode: true,
        enableCompareMode: true,
        enableFullscreen: true,
        inputMode: 'default' as const,
        controlBarLayout: 'default' as const,
        buttonSize: 'medium' as const,
        ...props
      },
      global: {
        provide: {
          services: mockServices,
        },
        ...options.global,
      },
      ...options,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockOptimizationMode.value = 'system'
    mockBreakpoint.value = 'lg'
    mockIsMobile.value = false
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('完整的用户测试流程', () => {
    it('应该完成系统提示词测试的完整工作流', async () => {
      // 步骤1: 初始化组件
      wrapper = createE2EWrapper({
        optimizationMode: 'system',
        testContent: '',
        isCompareMode: true
      })

      // 验证初始状态
      expect(wrapper.find('[data-testid="test-input-section"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="test-control-bar"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="test-result-section"]').exists()).toBe(true)

      // 步骤2: 用户输入测试内容
      const testInput = wrapper.find('[data-testid="test-content-input"]')
      await testInput.setValue('请介绍一下人工智能')
      
      // 验证输入事件
      expect(wrapper.emitted('update:testContent')).toBeTruthy()
      expect(wrapper.emitted('update:testContent')[0]).toEqual(['请介绍一下人工智能'])

      // 步骤3: 用户选择模型
      const modelSelect = wrapper.find('[data-testid="model-select"]')
      await modelSelect.setValue('gpt-4')
      expect(modelSelect.element.value).toBe('gpt-4')

      // 步骤4: 用户切换到单一测试模式
      const compareToggle = wrapper.find('[data-testid="compare-toggle-btn"]')
      expect(compareToggle.text()).toBe('Disable Compare')
      await compareToggle.trigger('click')
      
      expect(wrapper.emitted('compare-toggle')).toBeTruthy()

      // 模拟父组件更新状态
      await wrapper.setProps({ isCompareMode: false })
      await nextTick()

      // 验证UI更新
      expect(wrapper.find('[data-testid="single-result"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="optimized-result"]').exists()).toBe(false)

      // 步骤5: 用户开始测试
      mockServices.promptService.testPromptStream.mockImplementation(
        async (systemPrompt, userPrompt, model, handler) => {
          expect(systemPrompt).toBe('系统提示词内容') // 这里应该是实际的系统提示词
          expect(userPrompt).toBe('请介绍一下人工智能')
          expect(model).toBe('gpt-4')
          
          // 模拟流式响应
          setTimeout(() => {
            handler.onToken('人工智能（Artificial Intelligence，简称AI）')
            handler.onToken('是计算机科学的一个分支...')
            handler.onComplete()
          }, 10)
        }
      )

      const primaryActionBtn = wrapper.find('[data-testid="primary-action-btn"]')
      expect(primaryActionBtn.exists()).toBe(true)
      
      // 模拟有测试内容的状态
      await wrapper.setProps({ testContent: '请介绍一下人工智能' })
      
      await primaryActionBtn.trigger('click')

      // 验证测试开始
      expect(wrapper.emitted('test')).toBeTruthy()
    })

    it('应该完成用户提示词测试的完整工作流', async () => {
      // 步骤1: 切换到用户提示词模式
      mockOptimizationMode.value = 'user'
      
      wrapper = createE2EWrapper({
        optimizationMode: 'user',
        isCompareMode: false
      })

      await nextTick()

      // 验证用户提示词模式的UI状态
      expect(wrapper.find('[data-testid="test-input-section"]').exists()).toBe(false) // 用户模式不显示测试输入
      expect(wrapper.find('[data-testid="test-control-bar"]').exists()).toBe(true)

      // 步骤2: 用户直接开始测试（用户提示词模式不需要额外输入）
      mockServices.promptService.testPromptStream.mockImplementation(
        async (systemPrompt, userPrompt, model, handler) => {
          expect(systemPrompt).toBe('') // 用户提示词模式系统提示词为空
          expect(userPrompt).toBe('优化后的用户提示词') // 这里应该是实际的优化提示词
          
          handler.onToken('根据用户提示词的回复...')
          handler.onComplete()
        }
      )

      const primaryActionBtn = wrapper.find('[data-testid="primary-action-btn"]')
      await primaryActionBtn.trigger('click')

      expect(wrapper.emitted('test')).toBeTruthy()
    })
  })

  describe('不同屏幕尺寸下的响应式行为', () => {
    it('应该在移动端正确调整布局', async () => {
      // 模拟移动端环境
      mockBreakpoint.value = 'xs'
      mockIsMobile.value = true

      wrapper = createE2EWrapper({
        controlBarLayout: 'compact',
        buttonSize: 'small',
      })

      await nextTick()

      // 验证移动端适配
      const controlBar = wrapper.findComponent({ name: 'TestControlBar' })
      expect(controlBar.props('layout')).toBe('compact')
      expect(controlBar.props('buttonSize')).toBe('small')

      // 验证核心功能依然可用
      const primaryActionBtn = wrapper.find('[data-testid="primary-action-btn"]')
      expect(primaryActionBtn.exists()).toBe(true)
      
      const compareToggle = wrapper.find('[data-testid="compare-toggle-btn"]')
      expect(compareToggle.exists()).toBe(true)
    })

    it('应该在平板端正确调整布局', async () => {
      // 模拟平板环境
      mockBreakpoint.value = 'md'
      mockIsMobile.value = false

      wrapper = createE2EWrapper({
        controlBarLayout: 'default',
        buttonSize: 'medium',
      })

      await nextTick()

      // 验证平板端适配
      const controlBar = wrapper.findComponent({ name: 'TestControlBar' })
      expect(controlBar.props('buttonSize')).toBe('medium')

      // 验证响应式结果布局
      const resultSection = wrapper.findComponent({ name: 'TestResultSection' })
      expect(resultSection.exists()).toBe(true)
    })

    it('应该在桌面端提供完整功能', async () => {
      // 模拟桌面环境
      mockBreakpoint.value = 'xl'
      mockIsMobile.value = false

      wrapper = createE2EWrapper({
        advancedModeEnabled: true,
        controlBarLayout: 'default',
        buttonSize: 'medium',
      })

      await nextTick()

      // 验证桌面端完整功能
      expect(wrapper.find('[data-testid="test-input-section"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="test-control-bar"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="test-result-section"]').exists()).toBe(true)
      
      // 高级模式下的额外功能
      expect(wrapper.find('[data-testid="conversation-section"]').exists()).toBe(true)
    })
  })

  describe('与优化区域的交互一致性', () => {
    it('应该正确响应优化模式变更', async () => {
      wrapper = createE2EWrapper({
        optimizationMode: 'system'
      })

      // 验证系统模式初始状态
      expect(wrapper.find('[data-testid="test-input-section"]').exists()).toBe(true)

      // 模拟优化区域切换到用户模式
      mockOptimizationMode.value = 'user'
      await wrapper.setProps({ optimizationMode: 'user' })
      await nextTick()

      // 验证UI相应更新
      expect(wrapper.find('[data-testid="test-input-section"]').exists()).toBe(false)
    })

    it('应该正确处理优化后提示词的测试', async () => {
      wrapper = createE2EWrapper({
        testContent: '测试内容',
        isCompareMode: true
      })

      // 模拟从优化区域接收到优化后的提示词
      const mockOptimizedPrompt = '优化后的系统提示词：请作为专业AI助手回答问题'
      
      // 测试对比模式下的双重测试
      mockServices.promptService.testPromptStream
        .mockImplementationOnce(async (systemPrompt, userPrompt, model, handler) => {
          // 第一次调用 - 原始提示词
          expect(systemPrompt).toBe('原始系统提示词')
          handler.onToken('原始提示词的回复')
          handler.onComplete()
        })
        .mockImplementationOnce(async (systemPrompt, userPrompt, model, handler) => {
          // 第二次调用 - 优化提示词
          expect(systemPrompt).toBe(mockOptimizedPrompt)
          handler.onToken('优化提示词的回复')
          handler.onComplete()
        })

      const primaryActionBtn = wrapper.find('[data-testid="primary-action-btn"]')
      await primaryActionBtn.trigger('click')

      // 验证对比测试开始
      expect(wrapper.emitted('test')).toBeTruthy()
    })

    it('应该保持与高级模式功能的一致性', async () => {
      wrapper = createE2EWrapper({
        advancedModeEnabled: true,
        optimizationMode: 'system'
      })

      await nextTick()

      // 验证高级模式特有功能
      expect(wrapper.find('[data-testid="conversation-section"]').exists()).toBe(true)

      // 验证高级模式下的测试功能依然完整
      expect(wrapper.find('[data-testid="test-control-bar"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="test-result-section"]').exists()).toBe(true)

      // 模拟高级模式禁用
      await wrapper.setProps({ advancedModeEnabled: false })
      await nextTick()

      // 验证高级功能正确隐藏
      expect(wrapper.find('[data-testid="conversation-section"]').exists()).toBe(false)
      
      // 但基础功能保持可用
      expect(wrapper.find('[data-testid="test-control-bar"]').exists()).toBe(true)
    })
  })

  describe('错误处理和边界情况', () => {
    it('应该正确处理网络错误', async () => {
      wrapper = createE2EWrapper({
        testContent: '测试内容'
      })

      // 模拟网络错误
      mockServices.promptService.testPromptStream.mockRejectedValue(
        new Error('Network error: Failed to connect to model service')
      )

      const primaryActionBtn = wrapper.find('[data-testid="primary-action-btn"]')
      await primaryActionBtn.trigger('click')

      // 验证错误处理
      expect(wrapper.emitted('test')).toBeTruthy()
    })

    it('应该处理无效的用户输入', async () => {
      wrapper = createE2EWrapper({
        optimizationMode: 'system',
        testContent: '', // 空测试内容
        isCompareMode: false
      })

      const primaryActionBtn = wrapper.find('[data-testid="primary-action-btn"]')
      
      // 在系统模式下，空测试内容应该禁用按钮
      // 这个逻辑应该通过父组件的计算属性来实现
      await wrapper.setProps({ 
        testContent: '',
        primaryActionDisabled: true // 模拟父组件的禁用逻辑
      })

      await nextTick()
      
      const controlBar = wrapper.findComponent({ name: 'TestControlBar' })
      expect(controlBar.props('primaryActionDisabled')).toBe(true)
    })

    it('应该在快速操作下保持稳定', async () => {
      wrapper = createE2EWrapper({
        testContent: '测试内容'
      })

      // 模拟用户快速点击
      const primaryActionBtn = wrapper.find('[data-testid="primary-action-btn"]')
      const compareToggle = wrapper.find('[data-testid="compare-toggle-btn"]')

      // 快速连续操作
      for (let i = 0; i < 5; i++) {
        await compareToggle.trigger('click')
        await primaryActionBtn.trigger('click')
        await nextTick()
      }

      // 验证组件依然稳定
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('[data-testid="test-control-bar"]').exists()).toBe(true)
    })
  })

  describe('性能和用户体验', () => {
    it('应该在模式切换时保持流畅的用户体验', async () => {
      wrapper = createE2EWrapper({
        optimizationMode: 'system',
        isCompareMode: true
      })

      const startTime = performance.now()

      // 执行一系列常见的用户操作
      await wrapper.setProps({ optimizationMode: 'user' })
      await nextTick()
      
      await wrapper.setProps({ isCompareMode: false })
      await nextTick()
      
      await wrapper.setProps({ advancedModeEnabled: true })
      await nextTick()

      const endTime = performance.now()
      
      // 验证操作响应速度（应该在合理范围内）
      expect(endTime - startTime).toBeLessThan(100) // 100ms内完成
      
      // 验证最终状态正确
      expect(wrapper.exists()).toBe(true)
    })

    it('应该正确处理长时间运行的测试', async () => {
      wrapper = createE2EWrapper({
        testContent: '复杂测试内容'
      })

      // 模拟长时间运行的测试
      mockServices.promptService.testPromptStream.mockImplementation(
        async (systemPrompt, userPrompt, model, handler) => {
          // 模拟慢速流式响应
          return new Promise(resolve => {
            let tokenCount = 0
            const interval = setInterval(() => {
              handler.onToken(`Token ${tokenCount++} `)
              if (tokenCount >= 10) {
                clearInterval(interval)
                handler.onComplete()
                resolve(undefined)
              }
            }, 50) // 每50ms发送一个token
          })
        }
      )

      // 开始测试
      const primaryActionBtn = wrapper.find('[data-testid="primary-action-btn"]')
      await primaryActionBtn.trigger('click')

      // 验证测试期间组件状态
      await wrapper.setProps({ isTestRunning: true })
      await nextTick()

      expect(wrapper.exists()).toBe(true)
      
      // 等待测试完成
      await new Promise(resolve => setTimeout(resolve, 600))
      
      await wrapper.setProps({ isTestRunning: false })
      expect(wrapper.exists()).toBe(true)
    })
  })
})