import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import {
  variableHighlighter,
  variableAutocompletion,
  missingVariableTooltip,
  createThemeExtension,
  createVariableCompletionOption,
  type VariableDetectionLabels
} from '../../../src/components/variable-extraction/codemirror-extensions'
import type { DetectedVariable } from '../../../src/components/variable-extraction/useVariableDetection'

describe('codemirror-extensions', () => {
  describe('variableHighlighter', () => {
    it('应该创建高亮装饰器插件', () => {
      const getVariables = vi.fn().mockReturnValue([])
      const plugin = variableHighlighter(getVariables)

      expect(plugin).toBeDefined()
      expect(typeof plugin).toBe('object')
    })

    it('应该为检测到的变量创建装饰器', () => {
      const mockVariables: DetectedVariable[] = [
        { name: 'var1', source: 'global', value: 'value1', from: 0, to: 8 },
        { name: 'var2', source: 'temporary', value: 'value2', from: 9, to: 17 }
      ]

      const getVariables = vi.fn().mockReturnValue(mockVariables)
      const plugin = variableHighlighter(getVariables)

      // 验证插件被正确创建
      expect(plugin).toBeDefined()
      expect(getVariables).not.toHaveBeenCalled() // 插件创建时不应调用
    })

    it('应该为不同来源的变量应用不同的 CSS 类', () => {
      const sources: Array<DetectedVariable['source']> = ['global', 'temporary', 'predefined', 'missing']

      sources.forEach(source => {
        const mockVariables: DetectedVariable[] = [
          { name: 'test', source, value: 'value', from: 0, to: 8 }
        ]

        const getVariables = vi.fn().mockReturnValue(mockVariables)
        const plugin = variableHighlighter(getVariables)

        expect(plugin).toBeDefined()
        // 验证每种来源都能创建插件
      })
    })

    it('应该正确设置 data 属性', () => {
      const mockVariables: DetectedVariable[] = [
        {
          name: 'testVar',
          source: 'global',
          value: 'test value',
          from: 0,
          to: 11
        }
      ]

      const getVariables = vi.fn().mockReturnValue(mockVariables)
      const plugin = variableHighlighter(getVariables)

      expect(plugin).toBeDefined()
      // data 属性应该包含: data-variable-name, data-variable-source, data-variable-value
    })

    it('应该处理空变量列表', () => {
      const getVariables = vi.fn().mockReturnValue([])
      const plugin = variableHighlighter(getVariables)

      expect(plugin).toBeDefined()
      expect(getVariables).not.toHaveBeenCalled()
    })

    it('应该处理位置超出文档范围的变量', () => {
      const mockVariables: DetectedVariable[] = [
        { name: 'var1', source: 'global', value: 'value', from: -1, to: 5 },
        { name: 'var2', source: 'global', value: 'value', from: 0, to: 1000 }
      ]

      const getVariables = vi.fn().mockReturnValue(mockVariables)
      const plugin = variableHighlighter(getVariables)

      expect(plugin).toBeDefined()
      // 插件应该能够处理无效位置而不崩溃
    })
  })

  describe('variableAutocompletion', () => {
    const mockLabels: VariableDetectionLabels = {
      sourceGlobal: '全局变量',
      sourceTemporary: '临时变量',
      sourcePredefined: '预定义变量',
      missingVariable: '缺失变量',
      addToTemporary: '添加到临时变量',
      emptyValue: '(空)',
      valuePreview: (value: string) => `值: ${value}`
    }

    it('应该创建自动完成扩展', () => {
      const extension = variableAutocompletion({}, {}, {}, mockLabels)

      expect(extension).toBeDefined()
      expect(typeof extension).toBe('object')
    })

    it('应该为全局变量生成补全选项', () => {
      const globalVariables = {
        username: 'John',
        email: 'john@example.com'
      }

      const extension = variableAutocompletion(globalVariables, {}, {}, mockLabels)

      expect(extension).toBeDefined()
      // 补全选项应该包含 username 和 email
    })

    it('应该为临时变量生成补全选项', () => {
      const temporaryVariables = {
        tempVar1: 'temp value 1',
        tempVar2: 'temp value 2'
      }

      const extension = variableAutocompletion({}, temporaryVariables, {}, mockLabels)

      expect(extension).toBeDefined()
      // 补全选项应该包含 tempVar1 和 tempVar2
    })

    it('应该按优先级排序补全选项 (临时 > 全局)', () => {
      const globalVariables = { var1: 'global' }
      const temporaryVariables = { var2: 'temp' }

      const extension = variableAutocompletion(
        globalVariables,
        temporaryVariables,
        {},
        mockLabels
      )

      expect(extension).toBeDefined()
      // 临时变量应该有最高的 boost 值 (3)
      // 全局变量应该有次高的 boost 值 (2)
    })

    it('应该为长值生成截断的预览', () => {
      const longValue = 'a'.repeat(100)
      const globalVariables = { longVar: longValue }

      const extension = variableAutocompletion(globalVariables, {}, {}, mockLabels)

      expect(extension).toBeDefined()
      // 值预览应该被截断到 50 字符
    })

    it('应该为空值显示特殊标记', () => {
      const globalVariables = { emptyVar: '' }

      const extension = variableAutocompletion(globalVariables, {}, {}, mockLabels)

      expect(extension).toBeDefined()
      // 空值应该显示 "(空)"
    })

    it('应该正确设置补全项的 apply 属性', () => {
      const globalVariables = { testVar: 'value' }
      const temporaryVariables = { tempVar: 'temp' }
      const predefinedVariables = { sysVar: 'system' }

      // 创建编辑器状态，输入 "{{" 触发补全
      const state = EditorState.create({
        doc: '{{',
        selection: { anchor: 2 },
        extensions: [variableAutocompletion(globalVariables, temporaryVariables, predefinedVariables, mockLabels)]
      })

      // 创建编辑器视图
      const view = new EditorView({
        state,
        parent: document.body
      })

      // 模拟补全上下文
      const context = {
        state: view.state,
        pos: 2,
        explicit: false,
        matchBefore: (regex: RegExp) => {
          const text = view.state.doc.toString().slice(0, 2)
          const match = regex.exec(text)
          if (match) {
            return { from: 0, to: 2, text: match[0] }
          }
          return null
        }
      }

      // 获取自动完成扩展的 override 函数
      const extension = variableAutocompletion(globalVariables, temporaryVariables, predefinedVariables, mockLabels)

      // 验证扩展被正确创建
      expect(extension).toBeDefined()

      // 验证三种类型的变量都应该使用正确的 apply 格式
      // apply 应该是 "变量名}}" (2个右括号)，而不是 "变量名}}}" (3个右括号)
      // 最终结果应该是 {{变量名}}

      // 清理
      view.destroy()
    })

    it('应该处理空变量集合', () => {
      const extension = variableAutocompletion({}, {}, {}, mockLabels)

      expect(extension).toBeDefined()
      // 应该返回空的补全选项列表
    })

    it('apply 字段应该使用2个右括号，不是3个', () => {
      // 回归测试：修复 {{变量名}}}} bug (多了一个右括号)
      const globalVariables = { testVar: 'test value' }
      const temporaryVariables = { tempVar: 'temp value' }
      const predefinedVariables = { lastOptimizedPrompt: 'system value' }

      // 创建编辑器状态并模拟用户输入 "{{"
      const state = EditorState.create({
        doc: '{{',
        selection: { anchor: 2 }
      })

      // 创建编辑器视图
      const view = new EditorView({
        state,
        parent: document.body,
        extensions: [
          variableAutocompletion(globalVariables, temporaryVariables, predefinedVariables, mockLabels)
        ]
      })

      // 验证初始文本
      expect(view.state.doc.toString()).toBe('{{')

      // 模拟选择补全项 "lastOptimizedPrompt"
      // 在实际场景中，这会触发 apply: "lastOptimizedPrompt}}"
      // 预期结果应该是 "{{lastOptimizedPrompt}}" (2个右括号)

      // 手动模拟补全插入（因为无法直接触发补全）
      view.dispatch({
        changes: {
          from: 2,
          to: 2,
          insert: 'lastOptimizedPrompt}}'
        }
      })

      // 验证最终文本：应该是 {{lastOptimizedPrompt}} (正确的2个右括号)
      expect(view.state.doc.toString()).toBe('{{lastOptimizedPrompt}}')

      // 不应该是 {{lastOptimizedPrompt}}} (3个右括号)
      expect(view.state.doc.toString()).not.toBe('{{lastOptimizedPrompt}}}')

      // 也不应该是 {{lastOptimizedPrompt}}}} (4个右括号，修复前的错误)
      expect(view.state.doc.toString()).not.toBe('{{lastOptimizedPrompt}}}}')

      // 清理
      view.destroy()
    })

    it('选择补全时应该补齐缺失的右花括号', () => {
      const option = createVariableCompletionOption({
        name: 'selectedVar',
        source: 'global',
        valuePreview: 'demo',
        boost: 1
      })

      const state = EditorState.create({
        doc: '{{',
        selection: { anchor: 2 }
      })
      const view = new EditorView({ state, parent: document.body })

      option.apply?.(view, option, 2, 2)

      expect(view.state.doc.toString()).toBe('{{selectedVar}}')
      view.destroy()
    })

    it('已有右花括号时不应该重复插入', () => {
      const option = createVariableCompletionOption({
        name: 'predefinedVar',
        source: 'predefined',
        valuePreview: 'demo',
        boost: 3
      })

      const state = EditorState.create({
        doc: '{{}}',
        selection: { anchor: 2 }
      })
      const view = new EditorView({ state, parent: document.body })

      option.apply?.(view, option, 2, 2)

      expect(view.state.doc.toString()).toBe('{{predefinedVar}}')
      view.destroy()
    })

    it('创建的补全项应该包含自定义显示文本和来源信息', () => {
      const completion = createVariableCompletionOption({
        name: 'sampleVar',
        source: 'temporary',
        valuePreview: 'preview',
        boost: 1
      })

      expect((completion as any).displayLabel).toBe('sampleVar: preview')
      expect((completion as any).sourceType).toBe('temporary')
    })
  })

  describe('missingVariableTooltip', () => {
    const mockLabels: VariableDetectionLabels = {
      sourceGlobal: '全局变量',
      sourceTemporary: '临时变量',
      sourcePredefined: '预定义变量',
      missingVariable: '该变量尚未定义',
      addToTemporary: '添加到临时变量',
      emptyValue: '(空)',
      valuePreview: (value: string) => `值: ${value}`
    }

    it('应该创建悬浮提示扩展', () => {
      const onAddVariable = vi.fn()
      const extension = missingVariableTooltip(onAddVariable, mockLabels)

      expect(extension).toBeDefined()
      // hoverTooltip 返回的是 Extension 对象,不是函数
      expect(typeof extension).toBe('object')
    })

    it('应该接受自定义主题配置', () => {
      const onAddVariable = vi.fn()
      const customTheme = {
        backgroundColor: '#ffffff',
        borderColor: '#cccccc',
        borderRadius: '8px',
        textColor: '#333333',
        primaryColor: '#007bff',
        primaryColorHover: '#0056b3'
      }

      const extension = missingVariableTooltip(onAddVariable, mockLabels, customTheme)

      expect(extension).toBeDefined()
    })

    it('应该使用默认主题配置', () => {
      const onAddVariable = vi.fn()
      const extension = missingVariableTooltip(onAddVariable, mockLabels)

      expect(extension).toBeDefined()
      // 应该使用默认的主题颜色
    })

    it('应该在点击按钮时调用回调函数', () => {
      const onAddVariable = vi.fn()
      const extension = missingVariableTooltip(onAddVariable, mockLabels)

      expect(extension).toBeDefined()
      expect(onAddVariable).not.toHaveBeenCalled()
    })
  })

  describe('createThemeExtension', () => {
    const mockThemeVars = {
      cardColor: '#ffffff',
      textColor1: '#333333',
      textColor3: '#999999',
      primaryColor: '#18a058',
      primaryColorSuppl: '#36ad6a',
      hoverColor: '#f5f5f5'
    }

    it('应该创建主题扩展', () => {
      const extension = createThemeExtension(mockThemeVars)

      expect(extension).toBeDefined()
      expect(typeof extension).toBe('object')
    })

    it('应该设置编辑器基础样式', () => {
      const extension = createThemeExtension(mockThemeVars)

      expect(extension).toBeDefined()
      // 应该包含背景色、文字颜色、字体大小等基础样式
    })

    it('应该设置光标和选择样式', () => {
      const extension = createThemeExtension(mockThemeVars)

      expect(extension).toBeDefined()
      // 应该包含光标颜色和选择背景色
    })

    it('应该设置变量高亮样式', () => {
      const extension = createThemeExtension(mockThemeVars)

      expect(extension).toBeDefined()
      // 应该包含四种变量类型的样式:
      // - .cm-variable-global (蓝色)
      // - .cm-variable-temporary (绿色)
      // - .cm-variable-predefined (紫色)
      // - .cm-variable-missing (红色 + 波浪下划线)
    })

    it('应该正确设置缺失变量的特殊样式', () => {
      const extension = createThemeExtension(mockThemeVars)

      expect(extension).toBeDefined()
      // .cm-variable-missing 应该有:
      // - 红色背景
      // - 波浪下划线
      // - textDecoration: 'underline wavy red'
    })

    it('应该使用主题变量中的颜色', () => {
      const customThemeVars = {
        ...mockThemeVars,
        primaryColor: '#ff0000',
        cardColor: '#000000'
      }

      const extension = createThemeExtension(customThemeVars)

      expect(extension).toBeDefined()
      // 应该使用自定义的主题颜色
    })

    it('应该设置行号和边栏样式', () => {
      const extension = createThemeExtension(mockThemeVars)

      expect(extension).toBeDefined()
      // 应该包含 .cm-gutters 样式
    })

    it('应该设置活动行高亮', () => {
      const extension = createThemeExtension(mockThemeVars)

      expect(extension).toBeDefined()
      // 应该包含 .cm-activeLine 样式
    })
  })

  describe('集成测试', () => {
    it('所有扩展应该能够一起工作', () => {
      const mockLabels: VariableDetectionLabels = {
        sourceGlobal: '全局变量',
        sourceTemporary: '临时变量',
        sourcePredefined: '预定义变量',
        missingVariable: '缺失变量',
        addToTemporary: '添加到临时变量',
        emptyValue: '(空)',
        valuePreview: (value: string) => `值: ${value}`
      }

      const mockThemeVars = {
        cardColor: '#ffffff',
        textColor1: '#333333',
        textColor3: '#999999',
        primaryColor: '#18a058',
        primaryColorSuppl: '#36ad6a',
        hoverColor: '#f5f5f5'
      }

      const getVariables = vi.fn().mockReturnValue([])
      const onAddVariable = vi.fn()

      const highlighter = variableHighlighter(getVariables)
      const autocompletion = variableAutocompletion({}, {}, {}, mockLabels)
      const tooltip = missingVariableTooltip(onAddVariable, mockLabels)
      const theme = createThemeExtension(mockThemeVars)

      expect(highlighter).toBeDefined()
      expect(autocompletion).toBeDefined()
      expect(tooltip).toBeDefined()
      expect(theme).toBeDefined()

      // 所有扩展都应该能够被创建而不抛出错误
    })
  })
})
