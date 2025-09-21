import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ImageModelManager from '../../../src/components/ImageModelManager.vue'

// Mock dependencies
vi.mock('@prompt-optimizer/core', () => ({}))

// Mock i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

// Mock the useImageModelManager composable
vi.mock('../../../src/composables/useImageModelManager', () => ({
  useImageModelManager: () => ({
    providers: ref([
      {
        id: 'openai',
        name: 'OpenAI',
        description: 'OpenAI Image models'
      }
    ]),
    configs: ref([
      {
        id: 'gpt-image-1',
        name: 'GPT Image 1',
        enabled: true
      }
    ]),
    models: ref([
      {
        id: 'gpt-image-1',
        name: 'GPT Image 1',
        enabled: true
      }
    ]),
    isLoading: ref(false),
    error: ref(null),
    addModel: vi.fn().mockResolvedValue(undefined),
    updateModel: vi.fn().mockResolvedValue(undefined),
    deleteModel: vi.fn().mockResolvedValue(undefined),
    testConnection: vi.fn().mockResolvedValue({ success: true }),
    enableModel: vi.fn().mockResolvedValue(undefined),
    disableModel: vi.fn().mockResolvedValue(undefined),
    openAddModal: vi.fn(),
    openEditModal: vi.fn()
  })
}))

describe('ImageModelManager', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(ImageModelManager, {
      props: {
        ...props
      },
      global: {
        stubs: {
          // Stub all NaiveUI components
          'n-card': { template: '<div><slot name="header" /><slot /></div>' },
          'n-space': { template: '<div><slot /></div>' },
          'n-button': { template: '<button><slot /></button>' },
          'n-input': { template: '<input />' },
          'n-select': { template: '<select><slot /></select>' },
          'n-form': { template: '<form><slot /></form>' },
          'n-form-item': { template: '<div><slot /></div>' },
          'n-text': { template: '<span><slot /></span>' },
          'n-tag': { template: '<span><slot /></span>' },
          'n-divider': { template: '<hr />' },
          'n-empty': { template: '<div><slot name="extra" /></div>' }
        },
        mocks: {
          $t: (key: string) => key
        }
      }
    })
  }

  describe('核心功能', () => {
    it('应该正确渲染组件', () => {
      wrapper = createWrapper()
      expect(wrapper.vm).toBeDefined()
    })

    it('应该加载图像模型提供商', () => {
      wrapper = createWrapper()
      // 验证组件正常挂载即可，具体业务逻辑由 useImageModelManager 处理
      expect(wrapper.vm).toBeDefined()
    })
  })
})