import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import TestInputSection from '../../../src/components/TestInputSection.vue'

// Mock Naive UI 组件
vi.mock('naive-ui', () => ({
  NSpace: {
    name: 'NSpace',
    template: '<div class="n-space"><slot /></div>',
    props: ['vertical', 'size']
  },
  NFlex: {
    name: 'NFlex',
    template: '<div class="n-flex"><slot /></div>',
    props: ['justify', 'align', 'wrap']
  },
  NText: {
    name: 'NText',
    template: '<span class="n-text"><slot /></span>',
    props: ['depth']
  },
  NButton: {
    name: 'NButton',
    template: '<button class="n-button" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'size', 'title', 'ghost', 'round'],
    emits: ['click']
  },
  NIcon: {
    name: 'NIcon',
    template: '<span class="n-icon"><slot /></span>'
  },
  NInput: {
    name: 'NInput',
    template: `<input 
      class="n-input" 
      :value="value" 
      @input="$emit('update:value', $event.target.value)"
      :placeholder="placeholder"
      :disabled="disabled"
    />`,
    props: ['value', 'placeholder', 'disabled', 'type', 'autosize', 'clearable', 'showCount', 'size'],
    emits: ['update:value']
  }
}))

// Mock composables
vi.mock('../../../src/composables/useFullscreen', () => ({
  useFullscreen: () => ({
    isFullscreen: { value: false },
    fullscreenValue: { value: '' },
    openFullscreen: vi.fn()
  })
}))

// Mock FullscreenDialog 组件
vi.mock('../../../src/components/FullscreenDialog.vue', () => ({
  default: {
    name: 'FullscreenDialog',
    template: '<div data-test="fullscreen-dialog">FullscreenDialog Mock</div>',
    props: ['modelValue', 'title']
  }
}))

// Mock i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

describe('TestInputSection', () => {
  const defaultProps = {
    modelValue: '',
    label: 'Test Label',
    placeholder: 'Test Placeholder',
    helpText: 'Test Help Text',
    disabled: false,
    size: 'medium' as const,
    mode: 'normal' as const,
    enableFullscreen: true,
    minRows: 3,
    maxRows: 8
  }

  let wrapper: any

  beforeEach(() => {
    wrapper?.unmount()
  })

  const createWrapper = (props = {}) => {
    return mount(TestInputSection, {
      props: { ...defaultProps, ...props },
      global: {
        stubs: {
          NSpace: false,
          NFlex: false,  
          NText: false,
          NButton: false,
          NIcon: false,
          NInput: false,
          FullscreenDialog: true
        }
      }
    })
  }

  describe('基础功能', () => {
    it('应该正确渲染组件', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('应该根据模式计算autosize配置', () => {
      wrapper = createWrapper({ mode: 'compact', minRows: 3, maxRows: 8 })
      const vm = wrapper.vm
      expect(vm.autosizeConfig).toBeDefined()
      expect(vm.autosizeConfig.minRows).toBeGreaterThan(0)
      expect(vm.autosizeConfig.maxRows).toBeGreaterThan(vm.autosizeConfig.minRows)
    })

    it('应该处理边界值', () => {
      wrapper = createWrapper({ mode: 'compact', minRows: 1, maxRows: 2 })
      const vm = wrapper.vm
      expect(vm.autosizeConfig.minRows).toBeGreaterThanOrEqual(2) // 确保最小值
      expect(vm.autosizeConfig.maxRows).toBeGreaterThanOrEqual(4) // 确保最小值
    })
  })
})