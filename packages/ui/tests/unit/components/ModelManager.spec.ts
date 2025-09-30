import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ModelManager from '../../../src/components/ModelManager.vue'

// Mock dependencies
vi.mock('@prompt-optimizer/core', () => ({
  // In core, advancedParameterDefinitions is a flat array
  // of definitions with an "appliesToProviders" field.
  // For these tests we don't rely on its contents, so an empty array is fine.
  advancedParameterDefinitions: [],
  createImageAdapterRegistry: vi.fn().mockReturnValue({
    getAvailableProviders: vi.fn().mockReturnValue([
      {
        value: 'openai',
        label: 'OpenAI',
        aliases: []
      },
      {
        value: 'gemini',
        label: 'Google Gemini',
        aliases: []
      }
    ])
  })
}))

// Mock composables
vi.mock('../../../src/composables/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  })
}))

// Mock i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

// Mock services
const mockServices = {
  value: {
    modelManager: {
      getAllModels: vi.fn().mockResolvedValue([
        {
          key: 'test-model-1',
          name: 'Test Model 1',
          enabled: true,
          provider: 'openai',
          baseURL: 'https://api.openai.com/v1',
          apiKey: 'test-key',
          defaultModel: 'gpt-3.5-turbo'
        },
        {
          key: 'test-model-2',
          name: 'Test Model 2',
          enabled: false,
          provider: 'custom',
          baseURL: 'https://api.custom.com/v1',
          apiKey: 'custom-key',
          defaultModel: 'custom-model'
        }
      ]),
      enableModel: vi.fn().mockResolvedValue(undefined),
      disableModel: vi.fn().mockResolvedValue(undefined),
      deleteModel: vi.fn().mockResolvedValue(undefined),
      addModel: vi.fn().mockResolvedValue(undefined),
      updateModel: vi.fn().mockResolvedValue(undefined),
      getModel: vi.fn().mockResolvedValue({
        key: 'test-model-1',
        name: 'Test Model 1',
        enabled: true,
        provider: 'openai',
        baseURL: 'https://api.openai.com/v1',
        apiKey: 'test-key',
        defaultModel: 'gpt-3.5-turbo'
      })
    },
    llmService: {
      // Mock LLM service methods if needed
      testConnection: vi.fn().mockResolvedValue({ success: true })
    },
    imageModelManager: {
      getAllModels: vi.fn().mockResolvedValue([
        {
          id: 'test-image-config-1',
          name: 'Test OpenAI Image',
          enabled: true,
          providerId: 'openai',
          modelId: 'gpt-image-1',
          connectionConfig: { apiKey: 'test-key' },
          paramOverrides: {}
        }
      ]),
      enableModel: vi.fn().mockResolvedValue(undefined),
      disableModel: vi.fn().mockResolvedValue(undefined),
      deleteModel: vi.fn().mockResolvedValue(undefined),
      addModel: vi.fn().mockResolvedValue(undefined),
      updateModel: vi.fn().mockResolvedValue(undefined),
      getModel: vi.fn().mockResolvedValue({
        id: 'test-image-config-1',
        name: 'Test OpenAI Image',
        enabled: true,
        providerId: 'openai',
        modelId: 'gpt-image-1',
        connectionConfig: { apiKey: 'test-key' },
        paramOverrides: {}
      })
    },
    imageAdapterRegistry: {
      getAvailableProviders: vi.fn().mockReturnValue([
        {
          value: 'openai',
          label: 'OpenAI',
          aliases: []
        },
        {
          value: 'gemini',
          label: 'Google Gemini',
          aliases: []
        }
      ])
    }
  }
}

describe('ModelManager', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = null
  })

  const createWrapper = (props = {}) => {
    return mount(ModelManager, {
      props: {
        show: true,
        ...props
      },
      global: {
        provide: {
          services: mockServices
        },
        stubs: {
          'n-modal': {
            template: '<div class="mock-modal"><slot /><slot name="header-extra" /><slot name="action" /></div>',
            props: ['show'],
            emits: ['update:show']
          },
          'n-scrollbar': {
            template: '<div class="mock-scrollbar"><slot /></div>'
          },
          'n-tabs': {
            template: '<div class="mock-tabs"><slot /></div>',
            props: ['value'],
            emits: ['update:value']
          },
          'n-tab-pane': {
            template: '<div class="mock-tab-pane"><slot /></div>',
            props: ['name', 'tab']
          },
          'n-space': {
            template: '<div class="mock-space"><slot /></div>',
            props: ['vertical', 'size', 'justify', 'align']
          },
          'n-card': {
            template: '<div class="mock-card"><slot name="header" /><slot /><slot name="action" /></div>',
            props: ['hoverable', 'style']
          },
          'n-text': {
            template: '<span class="mock-text"><slot /></span>',
            props: ['strong', 'tag', 'depth']
          },
          'n-tag': {
            template: '<span class="mock-tag"><slot /></span>',
            props: ['type', 'size']
          },
          'n-button': {
            template: '<button class="mock-button" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>',
            props: ['type', 'ghost', 'size'],
            emits: ['click']
          },
          'n-input': {
            template: '<input class="mock-input" :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
            props: ['value', 'placeholder', 'type', 'required'],
            emits: ['update:value']
          },
          'n-select': {
            template: '<select class="mock-select" :value="value" @change="$emit(\'update:value\', $event.target.value)"><slot /></select>',
            props: ['value', 'options', 'placeholder'],
            emits: ['update:value']
          },
          'n-checkbox': {
            template: '<input type="checkbox" class="mock-checkbox" :checked="checked" @change="$emit(\'update:checked\', $event.target.checked)" />',
            props: ['checked', 'label'],
            emits: ['update:checked']
          },
          'n-divider': {
            template: '<hr class="mock-divider" />'
          },
          'n-h4': {
            template: '<h4 class="mock-h4"><slot /></h4>'
          },
          'input-with-select': {
            template: '<div class="mock-input-with-select"></div>',
            props: ['modelValue', 'options', 'isLoading', 'loadingText', 'noOptionsText', 'hintText', 'required', 'placeholder'],
            emits: ['update:modelValue', 'fetchOptions']
          },
          'image-model-manager': {
            template: '<div class="mock-image-model-manager"></div>'
          }
        },
        mocks: {
          $t: (key: string) => key
        }
      }
    })
  }

  describe('组件渲染', () => {
    it('应该正确渲染并获取服务', () => {
      wrapper = createWrapper()

      // 验证组件能正常挂载
      expect(wrapper.vm).toBeDefined()

      // 验证服务调用
      expect(mockServices.value.modelManager.getAllModels).toHaveBeenCalled()
    })
  })

  describe('核心功能测试', () => {
    it('应该加载文本模型列表', () => {
      wrapper = createWrapper()
      expect(mockServices.value.modelManager.getAllModels).toHaveBeenCalled()
    })

    it('应该支持模型编辑功能', async () => {
      wrapper = createWrapper()

      // 设置编辑模式
      if (wrapper.vm.editModel) {
        await wrapper.vm.editModel('test-model-1')
        expect(mockServices.value.modelManager.getModel).toHaveBeenCalledWith('test-model-1')
      }
    })

    it('应该处理错误情况', async () => {
      // Mock 失败的API调用
      mockServices.value.modelManager.getAllModels.mockRejectedValueOnce(new Error('Network error'))

      wrapper = createWrapper()

      // 验证组件仍能正常渲染
      expect(wrapper.vm).toBeDefined()
    })
  })
})
