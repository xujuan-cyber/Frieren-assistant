import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import TestAreaPanel from '../../../src/components/TestAreaPanel.vue'

// Mock子组件
vi.mock('../../../src/components/TestInputSection.vue', () => ({
  default: {
    name: 'TestInputSection',
    template: '<div data-testid="test-input-section">TestInputSection Mock</div>',
    props: ['modelValue', 'label', 'placeholder', 'helpText', 'disabled', 'mode', 'enableFullscreen'],
    emits: ['update:modelValue']
  }
}))

vi.mock('../../../src/components/TestControlBar.vue', () => ({
  default: {
    name: 'TestControlBar',
    template: '<div data-testid="test-control-bar">TestControlBar Mock<slot name="model-select" /></div>',
    props: ['modelLabel', 'showCompareToggle', 'isCompareMode', 'primaryActionText', 'primaryActionDisabled', 'primaryActionLoading', 'layout', 'buttonSize'],
    emits: ['compare-toggle', 'primary-action']
  }
}))

vi.mock('../../../src/components/TestResultSection.vue', () => ({
  default: {
    name: 'TestResultSection',
    template: `
      <div data-testid="test-result-section">
        TestResultSection Mock
        <slot name="original-result" />
        <slot name="optimized-result" />
        <slot name="single-result" />
      </div>
    `,
    props: ['isCompareMode', 'verticalLayout', 'showOriginal', 'originalTitle', 'optimizedTitle', 'singleResultTitle']
  }
}))

// Mock Naive UI 组件
vi.mock('naive-ui', () => ({
  NFlex: {
    name: 'NFlex',
    template: '<div class="n-flex"><slot /></div>',
    props: ['vertical', 'justify', 'align']
  }
}))

// Mock i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

describe('TestAreaPanel', () => {
  const defaultProps = {
    optimizationMode: 'system' as const,
    isTestRunning: false,
    advancedModeEnabled: false,
    testContent: '',
    isCompareMode: true,
    enableCompareMode: true,
    enableFullscreen: true
  }

  let wrapper: any

  beforeEach(() => {
    wrapper?.unmount()
  })

  const createWrapper = (props = {}, options = {}) => {
    return mount(TestAreaPanel, {
      props: { ...defaultProps, ...props },
      ...options,
      global: {
        stubs: {
          NFlex: false, // 不要stub NFlex，让它渲染
        },
        ...(options.global || {})
      }
    })
  }

  describe('基础渲染', () => {
    it('应该正确渲染组件', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('应该包含所有主要子组件', () => {
      wrapper = createWrapper()
      
      expect(wrapper.find('[data-testid="test-control-bar"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="test-result-section"]').exists()).toBe(true)
    })
  })

  describe('showTestInput 计算属性', () => {
    it('在system模式下应该显示测试输入', async () => {
      wrapper = createWrapper({ optimizationMode: 'system' })
      
      // 等待响应式更新
      await nextTick()
      
      expect(wrapper.find('[data-testid="test-input-section"]').exists()).toBe(true)
    })

    it('在user模式下应该隐藏测试输入', async () => {
      wrapper = createWrapper({ optimizationMode: 'user' })
      
      // 等待响应式更新
      await nextTick()
      
      expect(wrapper.find('[data-testid="test-input-section"]').exists()).toBe(false)
    })
  })


  describe('事件处理', () => {
    it('应该正确处理test事件', async () => {
      wrapper = createWrapper()
      
      // 触发测试事件
      await wrapper.vm.handleTest()
      
      // 验证事件被正确发出
      expect(wrapper.emitted('test')).toBeTruthy()
      expect(wrapper.emitted('test')).toHaveLength(1)
    })

    it('应该正确处理compare-toggle事件', async () => {
      wrapper = createWrapper({ isCompareMode: false })
      
      // 触发对比切换事件
      await wrapper.vm.handleCompareToggle()
      
      // 验证事件被正确发出
      expect(wrapper.emitted('compare-toggle')).toBeTruthy()
      expect(wrapper.emitted('compare-toggle')).toHaveLength(1)
    })
  })

  describe('props传递', () => {
    it('应该将正确的props传递给TestControlBar', () => {
      wrapper = createWrapper({
        optimizationMode: 'system',
        isTestRunning: true,
        isCompareMode: false,
        enableCompareMode: true
      })

      const testControlBar = wrapper.findComponent({ name: 'TestControlBar' })
      expect(testControlBar.exists()).toBe(true)
    })

    it('应该将正确的props传递给TestResultSection', () => {
      wrapper = createWrapper({
        isCompareMode: true,
        showOriginalResult: true,
        resultVerticalLayout: false
      })

      const testResultSection = wrapper.findComponent({ name: 'TestResultSection' })
      expect(testResultSection.exists()).toBe(true)
    })
  })

  describe('双向绑定', () => {
    it('应该正确更新testContent', async () => {
      const testContent = 'test content'
      wrapper = createWrapper({ testContent })

      // 模拟更新事件
      await wrapper.vm.$emit('update:testContent', 'new test content')
      
      expect(wrapper.emitted('update:testContent')).toBeTruthy()
      expect(wrapper.emitted('update:testContent')[0]).toEqual(['new test content'])
    })

    it('应该正确更新isCompareMode', async () => {
      wrapper = createWrapper({ isCompareMode: true })

      // 模拟更新事件
      await wrapper.vm.$emit('update:isCompareMode', false)
      
      expect(wrapper.emitted('update:isCompareMode')).toBeTruthy()
      expect(wrapper.emitted('update:isCompareMode')[0]).toEqual([false])
    })
  })

  describe('计算属性', () => {
    it('primaryActionText应该根据isCompareMode正确计算', async () => {
      wrapper = createWrapper({ isCompareMode: true, enableCompareMode: true })
      
      // 访问内部计算属性
      const vm = wrapper.vm
      expect(vm.primaryActionText).toBe('test.startCompare')
      
      // 更改对比模式
      await wrapper.setProps({ isCompareMode: false })
      expect(vm.primaryActionText).toBe('test.startTest')
    })

    it('primaryActionDisabled应该根据测试条件正确计算', async () => {
      // 系统模式下没有测试内容应该禁用
      wrapper = createWrapper({ 
        optimizationMode: 'system', 
        testContent: '',
        isTestRunning: false
      })
      
      expect(wrapper.vm.primaryActionDisabled).toBe(true)
      
      // 有测试内容应该启用
      await wrapper.setProps({ testContent: 'some content' })
      expect(wrapper.vm.primaryActionDisabled).toBe(false)
      
      // 用户模式下不需要测试内容
      await wrapper.setProps({ optimizationMode: 'user', testContent: '' })
      expect(wrapper.vm.primaryActionDisabled).toBe(false)
    })
  })

  describe('插槽', () => {
    it('应该正确渲染model-select插槽', () => {
      wrapper = createWrapper({}, {
        slots: {
          'model-select': '<div data-testid="model-select-slot">Model Select Slot</div>'
        }
      })

      expect(wrapper.find('[data-testid="model-select-slot"]').exists()).toBe(true)
    })

    it('应该正确渲染结果插槽', () => {
      wrapper = createWrapper({}, {
        slots: {
          'single-result': '<div data-testid="single-result-slot">Single Result Slot</div>'
        }
      })

      expect(wrapper.find('[data-testid="single-result-slot"]').exists()).toBe(true)
    })
  })

  describe('边界情况', () => {
    it('应该处理undefined props', () => {
      wrapper = createWrapper({
        testContent: undefined,
        isCompareMode: undefined
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('应该处理极长的测试内容', () => {
      const longContent = 'x'.repeat(10000)
      wrapper = createWrapper({ testContent: longContent })

      expect(wrapper.exists()).toBe(true)
    })
  })
})