import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VariableImporter from '../../../src/components/VariableImporter.vue'

// Mock Naive UI 组件
vi.mock('naive-ui', () => ({
  NModal: {
    name: 'NModal',
    template: `
      <div class="n-modal" data-testid="modal">
        <div class="n-card">
          <div class="n-card__header">{{ title }}</div>
          <div class="n-card__content"><slot /></div>
          <div class="n-card__footer"><slot name="footer" /></div>
        </div>
      </div>
    `,
    props: ['show', 'preset', 'title', 'size', 'segmented', 'style', 'maskClosable'],
    emits: ['close']
  },
  NButton: {
    name: 'NButton',
    template: '<button :disabled="disabled" :loading="loading" @click="$emit(\'click\')"><slot /></button>',
    props: ['disabled', 'loading', 'type'],
    emits: ['click']
  },
  NTabs: {
    name: 'NTabs',
    template: '<div class="n-tabs" data-testid="tabs"><slot /></div>',
    props: ['value', 'type'],
    emits: ['update:value']
  },
  NTabPane: {
    name: 'NTabPane',
    template: '<div class="n-tab-pane" :data-name="name"><slot /></div>',
    props: ['name', 'tab']
  },
  NUpload: {
    name: 'NUpload',
    template: '<div class="n-upload" data-testid="upload"><slot /></div>',
    props: ['ref', 'fileList', 'max', 'accept', 'customRequest', 'showFileList'],
    emits: ['beforeUpload']
  },
  NUploadDragger: {
    name: 'NUploadDragger',
    template: '<div class="n-upload-dragger" data-testid="upload-dragger"><slot /></div>'
  },
  NText: {
    name: 'NText',
    template: '<span class="n-text"><slot /></span>',
    props: ['depth', 'type']
  },
  NAlert: {
    name: 'NAlert',
    template: `
      <div class="n-alert" :class="[type]" data-testid="alert">
        <div class="n-alert__header"><slot name="header" /></div>
        <div class="n-alert__content"><slot /></div>
      </div>
    `,
    props: ['type', 'size', 'showIcon']
  },
  NUl: {
    name: 'NUl',
    template: '<ul class="n-ul"><slot /></ul>'
  },
  NLi: {
    name: 'NLi',
    template: '<li class="n-li"><slot /></li>'
  },
  NFormItem: {
    name: 'NFormItem',
    template: `
      <div class="n-form-item">
        <label>{{ label }}</label>
        <div class="n-form-item__content"><slot /></div>
        <div class="n-form-item__feedback"><slot name="feedback" /></div>
      </div>
    `,
    props: ['label', 'labelPlacement']
  },
  NInput: {
    name: 'NInput',
    template: '<textarea v-if="type === \'textarea\'" class="n-input" :value="value" :placeholder="placeholder" :disabled="disabled" @input="$emit(\'update:value\', $event.target.value)"></textarea>',
    props: ['value', 'type', 'placeholder', 'autosize', 'inputProps'],
    emits: ['update:value']
  },
  NCard: {
    name: 'NCard',
    template: `
      <div class="n-card" data-testid="preview-card">
        <div class="n-card__header"><slot name="header" /></div>
        <div class="n-card__content"><slot /></div>
      </div>
    `,
    props: ['size', 'embedded']
  },
  NScrollbar: {
    name: 'NScrollbar',
    template: '<div class="n-scrollbar" :style="{ maxHeight: maxHeight }"><slot /></div>',
    props: ['style']
  },
  NSpace: {
    name: 'NSpace',
    template: '<div class="n-space"><slot /></div>',
    props: ['vertical', 'size', 'justify', 'align']
  },
  NTag: {
    name: 'NTag',
    template: '<span class="n-tag" :class="[type]"><slot /></span>',
    props: ['size', 'type']
  }
}))

// Mock i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => params ? `${key}:${JSON.stringify(params)}` : key
  })
}))

// Mock FileReader
global.FileReader = class {
  result: string = ''
  onload: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  
  readAsText(file: File) {
    setTimeout(() => {
      this.result = file.name === 'test.json' ? '{"var1": "value1"}' : 'invalid content'
      if (this.onload) {
        this.onload({ target: { result: this.result } })
      }
    }, 0)
  }
}

describe('VariableImporter', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper?.unmount()
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}, options = {}) => {
    return mount(VariableImporter, {
      props,
      ...options,
      global: {
        stubs: {},
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

    it('应该显示标签页', () => {
      wrapper = createWrapper()
      expect(wrapper.find('[data-testid="tabs"]').exists()).toBe(true)
    })

    it('应该显示文件上传区域', () => {
      wrapper = createWrapper()
      expect(wrapper.find('[data-testid="upload"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="upload-dragger"]').exists()).toBe(true)
    })
  })

  describe('标签页切换', () => {
    it('默认应该选中文件导入标签页', () => {
      wrapper = createWrapper()
      expect(wrapper.vm.activeMethod).toBe('file')
    })

    it('切换到文本导入应该清除错误和预览', async () => {
      wrapper = createWrapper()
      
      // 设置一些初始状态
      wrapper.vm.parsedVariables = [{ name: 'var1', value: 'value1', hasConflict: false }]
      wrapper.vm.error = 'Some error'
      wrapper.vm.importText = 'some text'
      
      // 切换方法
      wrapper.vm.activeMethod = 'text'
      await nextTick()
      
      expect(wrapper.vm.error).toBe('')
      expect(wrapper.vm.parsedVariables).toEqual([])
    })

    it('切换到文件导入应该清除文本内容', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.importText = 'some text'
      wrapper.vm.activeMethod = 'text'
      await nextTick()
      
      wrapper.vm.activeMethod = 'file'
      await nextTick()
      
      expect(wrapper.vm.importText).toBe('')
    })
  })

  describe('文件处理', () => {
    it('应该处理文件上传前验证', () => {
      wrapper = createWrapper()
      
      const jsonFile = new File(['{}'], 'test.json', { type: 'application/json' })
      const fileInfo = { file: jsonFile, name: 'test.json' }
      
      const result = wrapper.vm.handleBeforeUpload({ file: fileInfo, fileList: [] })
      
      expect(result).toBe(false) // 阻止自动上传
    })

    it('应该拒绝非JSON文件', () => {
      wrapper = createWrapper()
      
      const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' })
      
      wrapper.vm.handleFile(txtFile)
      
      expect(wrapper.vm.error).toBe('variables.importer.errors.invalidFileType')
    })

    it('应该拒绝过大的文件', () => {
      wrapper = createWrapper()
      
      const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.json', { type: 'application/json' })
      
      wrapper.vm.handleFile(largeFile)
      
      expect(wrapper.vm.error).toBe('variables.importer.errors.fileTooLarge')
    })

    it('应该处理文件读取成功', async () => {
      wrapper = createWrapper()
      
      const jsonFile = new File(['{"var1": "value1"}'], 'test.json', { type: 'application/json' })
      
      wrapper.vm.handleFile(jsonFile)
      
      // 等待 FileReader 异步操作
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(wrapper.vm.importText).toBe('{"var1": "value1"}')
      expect(wrapper.vm.parsedVariables).toHaveLength(1)
    })
  })

  describe('变量解析', () => {
    it('应该正确解析简单变量对象', () => {
      wrapper = createWrapper()
      
      const data = {
        'var1': 'value1',
        'var2': 'value2'
      }
      
      const result = wrapper.vm.parseVariables(data)
      
      expect(result).toEqual({
        'var1': 'value1',
        'var2': 'value2'
      })
    })

    it('应该正确解析导出格式', () => {
      wrapper = createWrapper()
      
      const exportData = {
        variables: {
          'var1': 'value1',
          'var2': 'value2'
        }
      }
      
      const result = wrapper.vm.parseVariables(exportData)
      
      expect(result).toEqual({
        'var1': 'value1',
        'var2': 'value2'
      })
    })

    it('应该拒绝无效的数据类型', () => {
      wrapper = createWrapper()
      
      expect(() => {
        wrapper.vm.parseVariables('invalid string')
      }).toThrow('variables.importer.errors.invalidFormat')
      
      expect(() => {
        wrapper.vm.parseVariables(null)
      }).toThrow('variables.importer.errors.invalidFormat')
    })

    it('应该验证变量名格式', () => {
      wrapper = createWrapper()
      
      const data = {
        'validVar': 'value',
        '123invalid': 'value',
        'invalid-name': 'value'
      }
      
      expect(() => {
        wrapper.vm.parseVariables(data)
      }).toThrow()
    })

    it('应该验证变量值类型', () => {
      wrapper = createWrapper()
      
      const data = {
        'var1': 'string value',
        'var2': 123, // 非字符串值
        'var3': 'another string'
      }
      
      expect(() => {
        wrapper.vm.parseVariables(data)
      }).toThrow()
    })
  })

  describe('文本内容监听', () => {
    it('应该监听importText变化并处理变量', async () => {
      wrapper = createWrapper()
      
      const jsonText = '{"testVar": "testValue"}'
      
      wrapper.vm.importText = jsonText
      await nextTick()
      
      expect(wrapper.vm.parsedVariables).toHaveLength(1)
      expect(wrapper.vm.parsedVariables[0].name).toBe('testVar')
      expect(wrapper.vm.parsedVariables[0].value).toBe('testValue')
    })

    it('空文本应该清除变量和错误', async () => {
      wrapper = createWrapper()
      
      // 先设置一些内容
      wrapper.vm.importText = '{"var1": "value1"}'
      await nextTick()
      
      // 然后清空
      wrapper.vm.importText = ''
      await nextTick()
      
      expect(wrapper.vm.parsedVariables).toEqual([])
      expect(wrapper.vm.error).toBe('')
    })

    it('无效JSON应该设置错误', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.importText = 'invalid json'
      await nextTick()
      
      expect(wrapper.vm.error).toBeTruthy()
      expect(wrapper.vm.parsedVariables).toEqual([])
    })
  })

  describe('冲突检测', () => {
    it('应该检测与预定义变量的冲突', async () => {
      wrapper = createWrapper()
      
      const conflictData = '{"originalPrompt": "conflict value", "customVar": "ok value"}'
      
      wrapper.vm.importText = conflictData
      await nextTick()
      
      const conflictVar = wrapper.vm.parsedVariables.find((v: any) => v.name === 'originalPrompt')
      const normalVar = wrapper.vm.parsedVariables.find((v: any) => v.name === 'customVar')
      
      expect(conflictVar?.hasConflict).toBe(true)
      expect(normalVar?.hasConflict).toBe(false)
    })

    it('应该正确计算冲突数量', async () => {
      wrapper = createWrapper()
      
      const conflictData = '{"originalPrompt": "value1", "lastOptimizedPrompt": "value2", "normalVar": "value3"}'
      
      wrapper.vm.importText = conflictData
      await nextTick()
      
      expect(wrapper.vm.conflictCount).toBe(2)
    })
  })

  describe('导入操作', () => {
    it('有变量且无错误时应该可以导入', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.parsedVariables = [
        { name: 'var1', value: 'value1', hasConflict: false }
      ]
      wrapper.vm.error = ''
      
      await nextTick()
      
      expect(wrapper.vm.canImport).toBe(true)
    })

    it('无变量时不应该可以导入', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.parsedVariables = []
      wrapper.vm.error = ''
      
      await nextTick()
      
      expect(wrapper.vm.canImport).toBe(false)
    })

    it('有错误时不应该可以导入', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.parsedVariables = [
        { name: 'var1', value: 'value1', hasConflict: false }
      ]
      wrapper.vm.error = 'Some error'
      
      await nextTick()
      
      expect(wrapper.vm.canImport).toBe(false)
    })

    it('执行导入应该排除冲突变量', () => {
      wrapper = createWrapper()
      
      wrapper.vm.parsedVariables = [
        { name: 'var1', value: 'value1', hasConflict: false },
        { name: 'originalPrompt', value: 'conflict', hasConflict: true },
        { name: 'var2', value: 'value2', hasConflict: false }
      ]
      
      wrapper.vm.importVariables()
      
      expect(wrapper.emitted('import')).toBeTruthy()
      const importedVars = wrapper.emitted('import')[0][0]
      expect(importedVars).toEqual({
        'var1': 'value1',
        'var2': 'value2'
      })
      expect(importedVars['originalPrompt']).toBeUndefined()
    })

    it('没有可导入变量时不应该执行导入', () => {
      wrapper = createWrapper()
      wrapper.vm.parsedVariables = []
      
      wrapper.vm.importVariables()
      
      expect(wrapper.emitted('import')).toBeFalsy()
    })
  })

  describe('取消操作', () => {
    it('取消应该发出cancel事件', () => {
      wrapper = createWrapper()
      
      wrapper.vm.cancel()
      
      expect(wrapper.emitted('cancel')).toBeTruthy()
    })
  })

  describe('工具函数', () => {
    it('truncateValue应该正确截断长文本', () => {
      wrapper = createWrapper()
      
      const shortText = 'short'
      const longText = 'a'.repeat(100)
      
      expect(wrapper.vm.truncateValue(shortText)).toBe('short')
      expect(wrapper.vm.truncateValue(longText)).toBe('a'.repeat(60) + '...')
      expect(wrapper.vm.truncateValue(longText, 10)).toBe('a'.repeat(10) + '...')
    })

    it('formatVariableName应该正确格式化变量名', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.formatVariableName('testVar')).toBe('{{testVar}}')
    })
  })

  describe('错误显示', () => {
    it('有错误时应该显示错误alert', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.error = 'Test error message'
      await nextTick()
      
      const alerts = wrapper.findAll('[data-testid="alert"]')
      const errorAlert = alerts.find((alert: any) => alert.classes().includes('error'))
      
      expect(errorAlert.exists()).toBe(true)
      expect(errorAlert.text()).toContain('Test error message')
    })
  })

  describe('预览显示', () => {
    it('有变量时应该显示预览卡片', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.parsedVariables = [
        { name: 'var1', value: 'value1', hasConflict: false }
      ]
      await nextTick()
      
      expect(wrapper.find('[data-testid="preview-card"]').exists()).toBe(true)
    })

    it('有冲突时应该显示警告', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.parsedVariables = [
        { name: 'var1', value: 'value1', hasConflict: false },
        { name: 'originalPrompt', value: 'conflict', hasConflict: true }
      ]
      await nextTick()
      
      const alerts = wrapper.findAll('[data-testid="alert"]')
      const warningAlert = alerts.find((alert: any) => alert.classes().includes('warning'))
      
      expect(warningAlert.exists()).toBe(true)
      expect(wrapper.vm.conflictCount).toBe(1)
    })
  })

  describe('加载状态', () => {
    it('加载时按钮应该禁用', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.loading = true
      wrapper.vm.parsedVariables = [
        { name: 'var1', value: 'value1', hasConflict: false }
      ]
      
      await nextTick()
      
      const buttons = wrapper.findAll('button')
      const importButton = buttons.find((btn: any) => 
        btn.text().includes('variables.importer.import')
      )
      const cancelButton = buttons.find((btn: any) => 
        btn.text().includes('common.cancel')
      )
      
      expect(importButton.element.disabled).toBe(true)
      expect(cancelButton.element.disabled).toBe(true)
    })
  })
})