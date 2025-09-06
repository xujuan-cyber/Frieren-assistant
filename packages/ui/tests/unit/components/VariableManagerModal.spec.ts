import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VariableManagerModal from '../../../src/components/VariableManagerModal.vue'

// Mock子组件
vi.mock('../../../src/components/VariableEditor.vue', () => ({
  default: {
    name: 'VariableEditor',
    template: '<div data-testid="variable-editor">VariableEditor Mock</div>',
    props: ['variable', 'existingNames'],
    emits: ['save', 'cancel']
  }
}))

vi.mock('../../../src/components/VariableImporter.vue', () => ({
  default: {
    name: 'VariableImporter',
    template: '<div data-testid="variable-importer">VariableImporter Mock</div>',
    emits: ['import', 'cancel']
  }
}))

// Mock Naive UI 组件
vi.mock('naive-ui', () => ({
  NModal: {
    name: 'NModal',
    template: `
      <div class="n-modal" data-testid="modal">
        <div class="n-card">
          <div class="n-card__header"><slot name="header" /></div>
          <div class="n-card__content"><slot /></div>
          <div class="n-card__footer"><slot name="footer" /></div>
        </div>
      </div>
    `,
    props: ['show', 'maskClosable', 'preset', 'title', 'size', 'segmented', 'style'],
    emits: ['update:show', 'afterLeave']
  },
  NButton: {
    name: 'NButton',
    template: '<button :disabled="disabled" :loading="loading" @click="$emit(\'click\')"><slot /></button>',
    props: ['disabled', 'loading', 'type', 'size', 'quaternary', 'title'],
    emits: ['click']
  },
  NSpace: {
    name: 'NSpace',
    template: '<div class="n-space"><slot /></div>',
    props: ['justify', 'size']
  },
  NTag: {
    name: 'NTag',
    template: '<span class="n-tag"><slot /></span>',
    props: ['size', 'type']
  },
  NDataTable: {
    name: 'NDataTable',
    template: '<div class="n-data-table" data-testid="data-table"><slot /></div>',
    props: ['columns', 'data', 'maxHeight', 'bordered', 'size', 'rowProps', 'loading']
  }
}))

// Mock i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => params ? `${key}:${JSON.stringify(params)}` : key
  })
}))

// Mock变量管理器
const mockVariableManager = {
  variableManager: {
    value: {
      resolveAllVariables: vi.fn(() => ({
        'var1': 'value1',
        'var2': 'value2',
        'predefined1': 'predefined value'
      })),
      getVariableSource: vi.fn((name: string) => 
        name.startsWith('predefined') ? 'predefined' : 'custom'
      ),
      listAllVariables: vi.fn(() => ({
        'var1': 'value1',
        'var2': 'value2'
      })),
      listCustomVariables: vi.fn(() => ({
        'var1': 'value1',
        'var2': 'value2'
      }))
    }
  },
  addVariable: vi.fn(),
  deleteVariable: vi.fn()
}

describe('VariableManagerModal', () => {
  const defaultProps = {
    visible: true,
    variableManager: mockVariableManager,
    size: 'medium' as const,
    showImportExport: true,
    readonly: false,
    disabled: false,
    loading: false
  }

  let wrapper: any

  beforeEach(() => {
    wrapper?.unmount()
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}, options = {}) => {
    return mount(VariableManagerModal, {
      props: { ...defaultProps, ...props },
      ...options,
      global: {
        stubs: {
          NModal: false,
          NButton: false,
          NSpace: false,
          NTag: false,
          NDataTable: false
        },
        ...(options.global || {})
      }
    })
  }

  describe('基础渲染', () => {
    it('应该正确渲染组件', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('[data-testid="modal"]').exists()).toBe(true)
    })

    it('应该显示正确的标题', () => {
      wrapper = createWrapper({ title: 'Custom Title' })
      const modal = wrapper.findComponent({ name: 'NModal' })
      expect(modal.props('title')).toBe('Custom Title')
    })

    it('应该显示数据表格', () => {
      wrapper = createWrapper()
      expect(wrapper.find('[data-testid="data-table"]').exists()).toBe(true)
    })
  })

  describe('变量数据', () => {
    it('应该正确解析和显示变量', async () => {
      wrapper = createWrapper()
      await nextTick()

      const vm = wrapper.vm
      expect(vm.allVariables).toHaveLength(3)
      expect(vm.allVariables[0].name).toBe('var1')
      expect(vm.allVariables[0].value).toBe('value1')
      expect(vm.allVariables[0].source).toBe('custom')
    })

    it('应该正确区分预定义变量和自定义变量', async () => {
      wrapper = createWrapper()
      await nextTick()

      const vm = wrapper.vm
      const predefinedVar = vm.allVariables.find((v: any) => v.name === 'predefined1')
      const customVar = vm.allVariables.find((v: any) => v.name === 'var1')
      
      expect(predefinedVar.source).toBe('predefined')
      expect(customVar.source).toBe('custom')
    })
  })

  describe('按钮交互', () => {
    it('应该显示添加变量按钮', () => {
      wrapper = createWrapper()
      const addButton = wrapper.findAll('button').find((btn: any) => 
        btn.text().includes('variables.management.addVariable')
      )
      expect(addButton.exists()).toBe(true)
    })

    it('点击添加变量应该打开编辑器', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.showAddVariable()
      await nextTick()

      expect(wrapper.vm.showEditor).toBe(true)
      expect(wrapper.vm.editingVariable).toBe(null)
    })

    it('应该显示导入导出按钮', () => {
      wrapper = createWrapper()
      const buttons = wrapper.findAll('button')
      const importButton = buttons.find((btn: any) => 
        btn.text().includes('variables.management.import')
      )
      const exportButton = buttons.find((btn: any) => 
        btn.text().includes('variables.management.export')
      )
      
      expect(importButton.exists()).toBe(true)
      expect(exportButton.exists()).toBe(true)
    })

    it('readonly模式下应该禁用相应按钮', () => {
      wrapper = createWrapper({ readonly: true })
      
      const buttons = wrapper.findAll('button')
      const importButton = buttons.find((btn: any) => 
        btn.text().includes('variables.management.import')
      )
      
      expect(importButton.element.disabled).toBe(true)
    })
  })

  describe('变量操作', () => {
    it('应该正确保存新变量', async () => {
      wrapper = createWrapper()
      
      const newVariable = { name: 'newVar', value: 'newValue' }
      await wrapper.vm.onVariableSave(newVariable)

      expect(mockVariableManager.addVariable).toHaveBeenCalledWith('newVar', 'newValue')
      expect(wrapper.vm.showEditor).toBe(false)
    })

    it('应该正确删除变量', async () => {
      // Mock confirm dialog
      global.confirm = vi.fn(() => true)
      
      wrapper = createWrapper()
      await wrapper.vm.deleteVariable('var1')

      expect(mockVariableManager.deleteVariable).toHaveBeenCalledWith('var1')
    })

    it('取消删除确认应该不执行删除', async () => {
      global.confirm = vi.fn(() => false)
      
      wrapper = createWrapper()
      await wrapper.vm.deleteVariable('var1')

      expect(mockVariableManager.deleteVariable).not.toHaveBeenCalled()
    })
  })

  describe('导入导出功能', () => {
    it('应该处理变量导入', async () => {
      wrapper = createWrapper()
      
      const importVariables = { 'imported1': 'value1', 'imported2': 'value2' }
      await wrapper.vm.onVariablesImport(importVariables)

      expect(mockVariableManager.addVariable).toHaveBeenCalledWith('imported1', 'value1')
      expect(mockVariableManager.addVariable).toHaveBeenCalledWith('imported2', 'value2')
      expect(wrapper.vm.showImporter).toBe(false)
    })

    it('应该处理变量导出', async () => {
      // Mock DOM API
      global.URL.createObjectURL = vi.fn(() => 'blob:url')
      global.URL.revokeObjectURL = vi.fn()
      
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      }
      global.document.createElement = vi.fn(() => mockLink)
      
      wrapper = createWrapper()
      await wrapper.vm.exportVariables()

      expect(mockLink.click).toHaveBeenCalled()
      expect(wrapper.emitted('export')).toBeTruthy()
    })
  })

  describe('事件处理', () => {
    it('应该正确发出确认事件', async () => {
      wrapper = createWrapper()
      await wrapper.vm.handleConfirm()

      expect(wrapper.emitted('confirm')).toBeTruthy()
      expect(wrapper.emitted('update:visible')).toBeTruthy()
      expect(wrapper.emitted('update:visible')[0]).toEqual([false])
    })

    it('应该正确发出取消事件', async () => {
      wrapper = createWrapper()
      await wrapper.vm.handleCancel()

      expect(wrapper.emitted('cancel')).toBeTruthy()
      expect(wrapper.emitted('update:visible')).toBeTruthy()
    })

    it('应该处理关闭事件', async () => {
      wrapper = createWrapper()
      await wrapper.vm.handleClose()

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('cancel')).toBeTruthy()
    })
  })

  describe('焦点变量功能', () => {
    it('visible变为true时应该处理focusVariable', async () => {
      wrapper = createWrapper({ 
        visible: false, 
        focusVariable: 'var1' 
      })

      await wrapper.setProps({ visible: true })
      await nextTick()

      expect(wrapper.vm.showEditor).toBe(true)
      expect(wrapper.vm.editingVariable.name).toBe('var1')
    })

    it('focusVariable不存在时应该创建新变量', async () => {
      wrapper = createWrapper({ 
        visible: false, 
        focusVariable: 'newVar' 
      })

      await wrapper.setProps({ visible: true })
      await nextTick()

      expect(wrapper.vm.showEditor).toBe(true)
      expect(wrapper.vm.editingVariable.name).toBe('newVar')
      expect(wrapper.vm.editingVariable.value).toBe('')
      expect(wrapper.vm.editingVariable.source).toBe('custom')
    })
  })

  describe('错误处理', () => {
    it('应该处理变量解析错误', async () => {
      const errorManager = {
        ...mockVariableManager,
        variableManager: {
          value: {
            resolveAllVariables: vi.fn(() => {
              throw new Error('Resolution failed')
            })
          }
        }
      }

      wrapper = createWrapper({ variableManager: errorManager })
      await nextTick()

      expect(wrapper.vm.allVariables).toEqual([])
    })

    it('应该处理保存变量错误', async () => {
      const errorManager = {
        ...mockVariableManager,
        addVariable: vi.fn(() => {
          throw new Error('Save failed')
        })
      }

      wrapper = createWrapper({ variableManager: errorManager })
      
      const newVariable = { name: 'newVar', value: 'newValue' }
      await wrapper.vm.onVariableSave(newVariable)

      expect(wrapper.emitted('error')).toBeTruthy()
    })
  })

  describe('双向绑定', () => {
    it('应该正确更新visible状态', async () => {
      wrapper = createWrapper({ visible: true })
      
      wrapper.vm.localVisible = false
      await nextTick()

      expect(wrapper.emitted('update:visible')).toBeTruthy()
      expect(wrapper.emitted('update:visible')[0]).toEqual([false])
    })
  })

  describe('子组件渲染', () => {
    it('showEditor为true时应该渲染VariableEditor', async () => {
      wrapper = createWrapper()
      wrapper.vm.showEditor = true
      await nextTick()

      expect(wrapper.find('[data-testid="variable-editor"]').exists()).toBe(true)
    })

    it('showImporter为true时应该渲染VariableImporter', async () => {
      wrapper = createWrapper()
      wrapper.vm.showImporter = true
      await nextTick()

      expect(wrapper.find('[data-testid="variable-importer"]').exists()).toBe(true)
    })
  })

  describe('无变量管理器情况', () => {
    it('应该处理null变量管理器', () => {
      wrapper = createWrapper({ variableManager: null })
      
      expect(wrapper.vm.allVariables).toEqual([])
      expect(wrapper.exists()).toBe(true)
    })
  })
})