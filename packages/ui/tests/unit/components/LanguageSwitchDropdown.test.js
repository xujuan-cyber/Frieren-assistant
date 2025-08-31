import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { nextTick } from 'vue'
import LanguageSwitchDropdown from '../../../src/components/LanguageSwitchDropdown.vue'

// Mock Naive UI components
vi.mock('naive-ui', () => ({
  NButton: {
    name: 'NButton',
    template: '<button><slot name="icon"></slot><slot></slot></button>'
  },
  NDropdown: {
    name: 'NDropdown',
    template: '<div><slot></slot></div>',
    emits: ['select'],
    props: ['options', 'placement', 'trigger']
  }
}))

// 简单的测试i18n实例
const createTestI18n = () => createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: {
    'zh-CN': {},
    'en-US': {}
  }
})

// Mock服务注入
const mockServices = {
  value: {
    preferenceService: {
      get: vi.fn().mockResolvedValue('zh-CN'),
      set: vi.fn().mockResolvedValue(true)
    }
  }
}

describe('LanguageSwitchDropdown', () => {
  let wrapper
  let i18n

  beforeEach(() => {
    i18n = createTestI18n()
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(LanguageSwitchDropdown, {
      global: {
        plugins: [i18n],
        provide: {
          services: mockServices
        }
      },
      props
    })
  }

  describe('基本功能', () => {
    it('应该正确渲染组件', () => {
      wrapper = createWrapper()
      expect(wrapper.vm).toBeDefined()
    })

    it('应该包含正确的语言选项', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm
      expect(vm.availableLanguages).toHaveLength(2)
      expect(vm.availableLanguages[0].key).toBe('zh-CN')
      expect(vm.availableLanguages[1].key).toBe('en-US')
    })

    it('应该正确处理语言切换', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm
      
      await vm.handleLanguageSelect('en-US')
      expect(i18n.global.locale.value).toBe('en-US')
      expect(mockServices.value.preferenceService.set).toHaveBeenCalled()
    })

    it('应该处理无效的语言选择', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm
      const originalLocale = i18n.global.locale.value
      
      await vm.handleLanguageSelect('invalid-lang')
      expect(i18n.global.locale.value).toBe(originalLocale)
    })
  })
})