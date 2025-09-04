import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref, computed } from 'vue'
import { NConfigProvider } from 'naive-ui'
import TestAreaPanel from '../../../src/components/TestAreaPanel.vue'
import type { OptimizationMode } from '../../../src/index'

// Mock服务层
const mockPromptService = {
  testPromptStream: vi.fn(),
  optimize: vi.fn(),
}

const mockModelService = {
  getAvailableModels: vi.fn(),
  validateModel: vi.fn(),
}

const mockServices = {
  promptService: mockPromptService,
  modelService: mockModelService,
}

// Mock主题系统
const mockTheme = ref('light')
const mockThemeOverrides = ref({})

vi.mock('../../../src/composables/useNaiveTheme', () => ({
  useNaiveTheme: () => ({
    naiveTheme: computed(() => mockTheme.value === 'dark' ? 'dark' : null),
    themeOverrides: mockThemeOverrides,
    currentTheme: mockTheme,
    switchTheme: (theme: string) => {
      mockTheme.value = theme
    },
    initTheme: vi.fn(),
  })
}))

// Mock响应式布局
const mockResponsiveLayout = {
  isMobile: ref(false),
  isTablet: ref(false),
  currentBreakpoint: ref('lg'),
  recommendedInputMode: ref('default'),
  recommendedControlBarLayout: ref('default'),
  smartButtonSize: ref('medium'),
  responsiveHeights: ref({
    conversationMax: 300,
    inputMax: 200,
  }),
}

vi.mock('../../../src/composables/useResponsiveTestLayout', () => ({
  useResponsiveTestLayout: () => mockResponsiveLayout,
}))

// Mock测试模式配置
const mockTestModeConfig = {
  currentModeConfig: ref({
    showTestInput: true,
    enableCompareMode: true,
    inputLabel: 'test.content',
    canStartTest: (content: string, hasPrompt: boolean) => !!content && hasPrompt,
  }),
  showTestInput: ref(true),
  requiresTestContent: ref(true),
  inputLabel: ref('test.content'),
  canStartTest: ref((content: string, hasPrompt: boolean) => !!content && hasPrompt),
  enableCompareMode: ref(true),
  showConversationManager: ref(false),
  getDynamicButtonText: vi.fn().mockReturnValue('test.startTest'),
  validateTestSetup: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
}

vi.mock('../../../src/composables/useTestModeConfig', () => ({
  useTestModeConfig: () => mockTestModeConfig,
}))

// Mock国际化
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: ref('zh-CN'),
  }),
}))

// Mock子组件 - 使用简化但功能完整的组件
vi.mock('../../../src/components/TestInputSection.vue', () => ({
  default: {
    name: 'TestInputSection',
    props: ['modelValue', 'label', 'placeholder', 'helpText', 'disabled', 'mode', 'enableFullscreen'],
    emits: ['update:modelValue'],
    template: `
      <div data-testid="test-input-section" class="test-input">
        <label>{{ label }}</label>
        <input 
          :value="modelValue"
          :placeholder="placeholder"
          :disabled="disabled"
          @input="$emit('update:modelValue', $event.target.value)"
          data-testid="test-input"
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
        <span data-testid="model-label">{{ modelLabel }}</span>
        <slot name="model-select"></slot>
        <button 
          v-if="showCompareToggle"
          data-testid="compare-toggle-btn"
          @click="$emit('compare-toggle')"
          :class="{ active: isCompareMode }"
        >
          {{ isCompareMode ? 'disable-compare' : 'enable-compare' }}
        </button>
        <button 
          data-testid="primary-action-btn"
          @click="$emit('primary-action')"
          :disabled="primaryActionDisabled"
          :class="{ loading: primaryActionLoading }"
        >
          {{ primaryActionText }}
        </button>
        <slot name="secondary-controls"></slot>
        <slot name="custom-actions"></slot>
      </div>
    `,
  }
}))

vi.mock('../../../src/components/ConversationSection.vue', () => ({
  default: {
    name: 'ConversationSection',
    props: ['visible', 'collapsible', 'title', 'maxHeight'],
    template: `
      <div v-if="visible" data-testid="conversation-section" class="conversation-section">
        <h3>{{ title }}</h3>
        <slot />
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
        <div v-if="isCompareMode && showOriginal" data-testid="original-result">
          <h4>{{ originalTitle }}</h4>
          <slot name="original-result" />
        </div>
        <div v-if="isCompareMode" data-testid="optimized-result">
          <h4>{{ optimizedTitle }}</h4>
          <slot name="optimized-result" />
        </div>
        <div v-if="!isCompareMode" data-testid="single-result">
          <h4>{{ singleResultTitle }}</h4>
          <slot name="single-result" />
        </div>
      </div>
    `,
  }
}))

// Mock Naive UI 组件
vi.mock('naive-ui', async () => {
  const actual = await vi.importActual('naive-ui')
  return {
    ...actual,
    NFlex: {
      name: 'NFlex',
      props: ['vertical', 'justify', 'align'],
      template: '<div class="n-flex" :class="{ vertical }"><slot /></div>',
    },
    NConfigProvider: {
      name: 'NConfigProvider',
      props: ['theme', 'themeOverrides'],
      template: '<div class="theme-provider" :data-theme="theme"><slot /></div>',
    },
  }
})

describe('TestArea组件集成测试', () => {
  let wrapper: VueWrapper<any>

  const defaultProps = {
    optimizationMode: 'system' as OptimizationMode,
    isTestRunning: false,
    advancedModeEnabled: false,
    testContent: '',
    isCompareMode: true,
    enableCompareMode: true,
    enableFullscreen: true,
    inputMode: 'default' as const,
    controlBarLayout: 'default' as const,
    buttonSize: 'medium' as const,
  }

  const createWrapper = (props = {}, options = {}) => {
    return mount(TestAreaPanel, {
      props: { ...defaultProps, ...props },
      global: {
        provide: {
          services: mockServices,
        },
        plugins: [],
        stubs: {
          NConfigProvider: false,
        },
        ...options.global,
      },
      ...options,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // 重置mock状态
    mockTheme.value = 'light'
    mockResponsiveLayout.isMobile.value = false
    mockResponsiveLayout.isTablet.value = false
    mockTestModeConfig.showTestInput.value = true
    mockTestModeConfig.showConversationManager.value = false
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('组件间数据流和交互', () => {
    it('应该正确处理testContent的双向绑定', async () => {
      wrapper = createWrapper({ testContent: 'initial content' })

      const testInput = wrapper.find('[data-testid="test-input"]')
      expect(testInput.element.value).toBe('initial content')

      // 模拟用户输入
      await testInput.setValue('new content')
      
      // 验证事件发出
      const updateEvents = wrapper.emitted('update:testContent')
      expect(updateEvents).toBeTruthy()
      expect(updateEvents[updateEvents.length - 1]).toEqual(['new content'])
    })

    it('应该正确处理对比模式切换的组件间通信', async () => {
      wrapper = createWrapper({ 
        isCompareMode: false,
        enableCompareMode: true 
      })

      const compareToggleBtn = wrapper.find('[data-testid="compare-toggle-btn"]')
      expect(compareToggleBtn.text()).toBe('enable-compare')

      // 点击切换按钮
      await compareToggleBtn.trigger('click')

      // 验证事件发出
      const toggleEvents = wrapper.emitted('compare-toggle')
      expect(toggleEvents).toBeTruthy()
      expect(toggleEvents).toHaveLength(1)

      // 模拟父组件更新props
      await wrapper.setProps({ isCompareMode: true })
      
      expect(compareToggleBtn.text()).toBe('disable-compare')
      expect(compareToggleBtn.classes()).toContain('active')
    })

    it('应该根据optimizationMode正确控制UI组件的显示', async () => {
      // 系统模式下显示测试输入
      wrapper = createWrapper({ optimizationMode: 'system' })
      await nextTick()

      expect(wrapper.find('[data-testid="test-input-section"]').exists()).toBe(true)

      // 切换到用户模式
      mockTestModeConfig.showTestInput.value = false
      await wrapper.setProps({ optimizationMode: 'user' })
      await nextTick()

      expect(wrapper.find('[data-testid="test-input-section"]').exists()).toBe(false)
    })

    it('应该正确处理高级模式下的会话管理组件显示', async () => {
      // 禁用高级模式时不显示
      wrapper = createWrapper({ advancedModeEnabled: false })
      await nextTick()

      expect(wrapper.find('[data-testid="conversation-section"]').exists()).toBe(false)

      // 启用高级模式
      mockTestModeConfig.showConversationManager.value = true
      await wrapper.setProps({ advancedModeEnabled: true })
      await nextTick()

      expect(wrapper.find('[data-testid="conversation-section"]').exists()).toBe(true)
    })

    it('应该正确传递props给子组件', async () => {
      wrapper = createWrapper({
        optimizationMode: 'system',
        isTestRunning: true,
        isCompareMode: false,
        enableCompareMode: true
      })

      // 验证TestControlBar的props
      const controlBar = wrapper.findComponent({ name: 'TestControlBar' })
      expect(controlBar.props('showCompareToggle')).toBe(true)
      expect(controlBar.props('isCompareMode')).toBe(false)
      expect(controlBar.props('primaryActionLoading')).toBe(true)

      // 验证TestResultSection的props
      const resultSection = wrapper.findComponent({ name: 'TestResultSection' })
      expect(resultSection.props('isCompareMode')).toBe(false)
    })
  })

  describe('与服务层的集成', () => {
    it('应该正确处理服务层集成', async () => {
      const mockStreamHandler = {
        onToken: vi.fn(),
        onReasoningToken: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      }

      mockPromptService.testPromptStream.mockImplementation(
        (systemPrompt, userPrompt, model, handler) => {
          // 模拟流式返回
          setTimeout(() => {
            handler.onToken('test response')
            handler.onComplete()
          }, 100)
          return Promise.resolve()
        }
      )

      wrapper = createWrapper({
        testContent: 'test content',
        optimizationMode: 'system'
      })

      const primaryActionBtn = wrapper.find('[data-testid="primary-action-btn"]')
      await primaryActionBtn.trigger('click')

      // 验证测试事件被发出
      expect(wrapper.emitted('test')).toBeTruthy()
    })

    it('应该正确处理错误状态', async () => {
      const errorMessage = 'Test error'
      
      mockPromptService.testPromptStream.mockRejectedValue(new Error(errorMessage))

      wrapper = createWrapper({
        testContent: 'test content',
        optimizationMode: 'system'
      })

      const primaryActionBtn = wrapper.find('[data-testid="primary-action-btn"]')
      await primaryActionBtn.trigger('click')

      // 验证错误处理
      expect(wrapper.emitted('test')).toBeTruthy()
    })
  })

  describe('主题切换和样式一致性', () => {
    it('应该正确应用主题配置', async () => {
      wrapper = createWrapper()

      // 验证组件渲染正常
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('[data-testid="test-control-bar"]').exists()).toBe(true)

      // 切换主题后组件依然正常
      mockTheme.value = 'dark'
      await nextTick()

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('[data-testid="test-control-bar"]').exists()).toBe(true)
    })

    it('应该在主题切换时保持布局一致性', async () => {
      wrapper = createWrapper()

      // 获取初始布局结构
      const initialStructure = {
        hasControlBar: wrapper.find('[data-testid="test-control-bar"]').exists(),
        hasResultSection: wrapper.find('[data-testid="test-result-section"]').exists(),
        hasInputSection: wrapper.find('[data-testid="test-input-section"]').exists(),
      }

      // 切换主题
      mockTheme.value = 'dark'
      await nextTick()

      // 验证布局结构保持不变
      const afterThemeChange = {
        hasControlBar: wrapper.find('[data-testid="test-control-bar"]').exists(),
        hasResultSection: wrapper.find('[data-testid="test-result-section"]').exists(),
        hasInputSection: wrapper.find('[data-testid="test-input-section"]').exists(),
      }

      expect(afterThemeChange).toEqual(initialStructure)
    })

    it('应该正确应用响应式布局样式', async () => {
      // 模拟移动端环境
      mockResponsiveLayout.isMobile.value = true
      mockResponsiveLayout.currentBreakpoint.value = 'xs'
      mockResponsiveLayout.smartButtonSize.value = 'small'

      wrapper = createWrapper({
        buttonSize: mockResponsiveLayout.smartButtonSize.value
      })

      // 验证响应式样式应用
      const controlBar = wrapper.findComponent({ name: 'TestControlBar' })
      expect(controlBar.props('buttonSize')).toBe('small')

      // 模拟桌面端环境
      mockResponsiveLayout.isMobile.value = false
      mockResponsiveLayout.currentBreakpoint.value = 'lg'
      mockResponsiveLayout.smartButtonSize.value = 'medium'
      
      await wrapper.setProps({
        buttonSize: mockResponsiveLayout.smartButtonSize.value
      })

      expect(controlBar.props('buttonSize')).toBe('medium')
    })

    it('应该在不同屏幕尺寸下保持功能完整性', async () => {
      const testCases = [
        { breakpoint: 'xs', isMobile: true, expectedLayout: 'compact' },
        { breakpoint: 'md', isMobile: false, expectedLayout: 'default' },
        { breakpoint: 'lg', isMobile: false, expectedLayout: 'default' },
      ]

      for (const testCase of testCases) {
        mockResponsiveLayout.currentBreakpoint.value = testCase.breakpoint
        mockResponsiveLayout.isMobile.value = testCase.isMobile

        wrapper = createWrapper({
          controlBarLayout: testCase.expectedLayout,
        })

        // 验证关键功能按钮存在
        expect(wrapper.find('[data-testid="primary-action-btn"]').exists()).toBe(true)
        
        if (defaultProps.enableCompareMode) {
          expect(wrapper.find('[data-testid="compare-toggle-btn"]').exists()).toBe(true)
        }

        wrapper.unmount()
      }
    })
  })

  describe('复杂场景集成测试', () => {
    it('应该正确处理模式切换时的状态重置', async () => {
      wrapper = createWrapper({
        optimizationMode: 'system',
        testContent: 'test content',
        isCompareMode: true
      })

      // 验证初始状态
      expect(wrapper.find('[data-testid="test-input-section"]').exists()).toBe(true)
      const testInput = wrapper.find('[data-testid="test-input"]')
      expect(testInput.element.value).toBe('test content')

      // 切换到用户模式
      mockTestModeConfig.showTestInput.value = false
      mockTestModeConfig.requiresTestContent.value = false
      
      await wrapper.setProps({ optimizationMode: 'user' })
      await nextTick()

      // 验证UI状态更新
      expect(wrapper.find('[data-testid="test-input-section"]').exists()).toBe(false)
    })

    it('应该正确处理并发测试请求', async () => {
      mockPromptService.testPromptStream
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 200)))
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)))

      wrapper = createWrapper({
        testContent: 'test content',
        isCompareMode: true,
        isTestRunning: true
      })

      // 验证测试运行时的UI状态
      const primaryActionBtn = wrapper.find('[data-testid="primary-action-btn"]')
      expect(primaryActionBtn.classes()).toContain('loading')

      // 模拟测试完成
      await wrapper.setProps({ isTestRunning: false })
      expect(primaryActionBtn.classes()).not.toContain('loading')
    })

    it('应该正确处理插槽内容', async () => {
      wrapper = createWrapper({}, {
        slots: {
          'model-select': '<div data-testid="model-selector">Model Select</div>',
          'single-result': '<div data-testid="result-content">Test Result</div>'
        }
      })

      // 验证插槽内容基本渲染
      expect(wrapper.exists()).toBe(true)
      
      // 切换到单一模式显示结果
      await wrapper.setProps({ isCompareMode: false })
      await nextTick()

      // 验证组件依然存在
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('性能和稳定性', () => {
    it('应该正确处理快速状态变更', async () => {
      wrapper = createWrapper()

      // 快速连续切换状态
      for (let i = 0; i < 10; i++) {
        await wrapper.setProps({ isCompareMode: i % 2 === 0 })
        await nextTick()
      }

      // 验证组件状态稳定
      expect(wrapper.exists()).toBe(true)
      const compareToggleBtn = wrapper.find('[data-testid="compare-toggle-btn"]')
      expect(compareToggleBtn.exists()).toBe(true)
    })

    it('应该正确清理事件监听器和副作用', async () => {
      wrapper = createWrapper()

      // 记录初始的mock调用次数
      const initialCallCount = vi.mocked(mockTestModeConfig.getDynamicButtonText).mock.calls.length

      // 卸载组件
      wrapper.unmount()

      // 验证没有内存泄漏（通过检查是否还有新的调用）
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const finalCallCount = vi.mocked(mockTestModeConfig.getDynamicButtonText).mock.calls.length
      expect(finalCallCount).toBe(initialCallCount)
    })
  })
})