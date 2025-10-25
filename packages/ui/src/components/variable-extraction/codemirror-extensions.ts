import {
  Decoration,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  hoverTooltip,
  type DecorationSet
} from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import type { ThemeCommonVars } from 'naive-ui'
import { autocompletion, CompletionContext, type CompletionResult } from '@codemirror/autocomplete'
import type { DetectedVariable } from './useVariableDetection'

export interface VariableDetectionLabels {
  sourceGlobal: string
  sourceTemporary: string
  sourcePredefined: string
  missingVariable: string
  addToTemporary: string
  emptyValue: string
  valuePreview: (value: string) => string
}

export interface MissingVariableTooltipTheme {
  backgroundColor?: string
  borderColor?: string
  borderRadius?: string
  textColor?: string
  primaryColor?: string
  primaryColorHover?: string
}

/** 变量名允许的字符集合 (支持 Unicode 字母与数字与分隔符) */
const VARIABLE_CHAR_CLASS = '[\\p{L}\\p{N}_\\-.]'
const VARIABLE_TRIGGER_REGEX = new RegExp(`\\{\\{${VARIABLE_CHAR_CLASS}*`, 'u')
const VARIABLE_VALID_REGEX = new RegExp(`^${VARIABLE_CHAR_CLASS}*$`, 'u')

/**
 * 变量高亮扩展
 *
 * 根据变量来源显示不同颜色的背景高亮:
 * - 全局变量: 蓝色
 * - 临时变量: 绿色
 * - 预定义变量: 紫色
 * - 缺失变量: 红色
 */
export function variableHighlighter(
  getVariables: (doc: string) => DetectedVariable[]
) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view)
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>()
        const variables = getVariables(view.state.doc.toString())

        for (const variable of variables) {
          // 确保位置在文档范围内
          if (variable.from >= 0 && variable.to <= view.state.doc.length) {
            const decoration = Decoration.mark({
              class: `cm-variable-${variable.source}`,
              attributes: {
                'data-variable-name': variable.name,
                'data-variable-source': variable.source,
                'data-variable-value': variable.value || ''
              }
            })
            builder.add(variable.from, variable.to, decoration)
          }
        }

        return builder.finish()
      }
    },
    {
      decorations: (v) => v.decorations
    }
  )
}

/**
 * 变量自动完成扩展
 *
 * 当用户输入 {{ 时,显示可用变量列表
 * 包含变量名、来源标签和值预览
 */
export function variableAutocompletion(
  globalVariables: Record<string, string>,
  temporaryVariables: Record<string, string>,
  predefinedVariables: Record<string, string>,
  labels: VariableDetectionLabels
) {
  return autocompletion({
    override: [
      (context: CompletionContext): CompletionResult | null => {
        // 检测是否在 {{ 后面
        const word = context.matchBefore(VARIABLE_TRIGGER_REGEX)
        if (!word) return null

        const options = []

        // 添加预定义变量 (优先级最高)
        for (const [name, value] of Object.entries(predefinedVariables)) {
          options.push({
            label: name,
            type: 'variable',
            detail: labels.sourcePredefined,
            info: value
              ? labels.valuePreview(`${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`)
              : labels.emptyValue,
            apply: `${name}}}`,
            boost: 3 // 最高优先级
          })
        }

        // 添加全局变量
        for (const [name, value] of Object.entries(globalVariables)) {
          options.push({
            label: name,
            type: 'variable',
            detail: labels.sourceGlobal,
            info: value
              ? labels.valuePreview(`${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`)
              : labels.emptyValue,
            apply: `${name}}}`,
            boost: 2
          })
        }

        // 添加临时变量
        for (const [name, value] of Object.entries(temporaryVariables)) {
          options.push({
            label: name,
            type: 'variable',
            detail: labels.sourceTemporary,
            info: value
              ? labels.valuePreview(`${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`)
              : labels.emptyValue,
            apply: `${name}}}`,
            boost: 1
          })
        }

        return {
          from: word.from + 2, // 跳过 {{
          options,
          validFor: VARIABLE_VALID_REGEX
        }
      }
    ],
    // 自动完成配置
    activateOnTyping: true,
    maxRenderedOptions: 20,
    defaultKeymap: true
  })
}

/**
 * 缺失变量悬浮提示扩展
 *
 * 当鼠标悬停在缺失变量上时,显示提示和"添加到临时变量"按钮
 */
export function missingVariableTooltip(
  onAddVariable: (varName: string) => void,
  labels: VariableDetectionLabels,
  theme: MissingVariableTooltipTheme = {}
) {
  return hoverTooltip((view, pos, _side) => {
    // 获取当前位置的元素
    const { node } = view.domAtPos(pos)
    const element = node instanceof Element ? node : node.parentElement

    if (!element) return null

    // 检查是否是缺失变量
    const isMissing =
      element.classList?.contains('cm-variable-missing') ||
      element.parentElement?.classList?.contains('cm-variable-missing')

    if (!isMissing) return null

    // 获取变量名
    const varName =
      element.getAttribute('data-variable-name') ||
      element.parentElement?.getAttribute('data-variable-name')

    if (!varName) return null

    // 获取变量的位置范围
    const text = view.state.doc.toString()
    const escapedVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\{\\{${escapedVarName}\\}\\}`, 'gu')
    let match
    let varFrom = -1
    let varTo = -1

    while ((match = regex.exec(text)) !== null) {
      const matchFrom = match.index
      const matchTo = matchFrom + match[0].length
      if (pos >= matchFrom && pos <= matchTo) {
        varFrom = matchFrom
        varTo = matchTo
        break
      }
    }

    if (varFrom === -1) return null

    return {
      pos: varFrom,
      end: varTo,
      above: true,
      create() {
        const dom = document.createElement('div')
        dom.className = 'cm-missing-variable-tooltip-container'

        const backgroundColor = theme.backgroundColor || '#ffffff'
        const borderColor = theme.borderColor || '#dcdcdc'
        const borderRadius = theme.borderRadius || '4px'
        const textColor = theme.textColor || '#4c4f69'
        const primaryColor = theme.primaryColor || '#18a058'
        const primaryColorHover = theme.primaryColorHover || '#36ad6a'

        dom.style.padding = '8px 12px'
        dom.style.background = backgroundColor
        dom.style.border = `1px solid ${borderColor}`
        dom.style.borderRadius = borderRadius
        dom.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)'
        dom.style.fontSize = '14px'
        dom.style.color = textColor

        const message = document.createElement('div')
        message.style.marginBottom = '8px'
        message.style.color = textColor
        message.textContent = labels.missingVariable

        const button = document.createElement('button')
        button.className = 'n-button n-button--primary-type n-button--small-type'
        button.style.padding = '4px 12px'
        button.style.background = primaryColor
        button.style.color = '#ffffff'
        button.style.border = 'none'
        button.style.borderRadius = borderRadius
        button.style.cursor = 'pointer'
        button.style.fontSize = '12px'
        button.style.transition = 'all 0.3s'
        button.textContent = labels.addToTemporary

        button.addEventListener('mouseenter', () => {
          button.style.background = primaryColorHover
        })
        button.addEventListener('mouseleave', () => {
          button.style.background = primaryColor
        })
        button.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          onAddVariable(varName)
        })

        dom.appendChild(message)
        dom.appendChild(button)

        return { dom }
      }
    }
  })
}

/**
 * 主题扩展 - 适配 Naive UI 主题
 */
export function createThemeExtension(themeVars: ThemeCommonVars) {
  return EditorView.theme({
    '&': {
      backgroundColor: themeVars.cardColor,
      color: themeVars.textColor1,
      fontSize: '14px',
      fontFamily: 'inherit',
      height: '100%'
    },
    '.cm-content': {
      padding: '8px',
      caretColor: themeVars.primaryColor,
      fontFamily: 'inherit'
    },
    '.cm-cursor': {
      borderLeftColor: themeVars.primaryColor
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: themeVars.primaryColorSuppl + '40' // 40% opacity
    },
    '&.cm-focused .cm-selectionBackground, &.cm-focused ::selection': {
      backgroundColor: themeVars.primaryColorSuppl + '60' // 60% opacity
    },
    '.cm-activeLine': {
      backgroundColor: themeVars.hoverColor
    },
    '.cm-gutters': {
      backgroundColor: themeVars.cardColor,
      color: themeVars.textColor3,
      border: 'none'
    },
    // 变量高亮样式
    '.cm-variable-global': {
      backgroundColor: '#e6f7ff',
      borderRadius: '2px',
      padding: '0 2px'
    },
    '.cm-variable-temporary': {
      backgroundColor: '#f6ffed',
      borderRadius: '2px',
      padding: '0 2px'
    },
    '.cm-variable-predefined': {
      backgroundColor: '#f9f0ff',
      borderRadius: '2px',
      padding: '0 2px'
    },
    '.cm-variable-missing': {
      backgroundColor: '#fff1f0',
      borderRadius: '2px',
      padding: '0 2px',
      textDecoration: 'underline wavy red',
      textDecorationThickness: '2px',
      textUnderlineOffset: '2px'
    }
  })
}
