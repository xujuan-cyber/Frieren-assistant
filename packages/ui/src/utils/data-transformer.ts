import type { ModelConfig, Template } from '@prompt-optimizer/core'
import type { ModelSelectOption, TemplateSelectOption, SelectOption } from '../types/select-options'

/**
 * 数据转换工具类
 * 负责将原始数据转换为SelectWithConfig组件所需的标准化格式
 */
export class DataTransformer {
  /**
   * 将模型配置转换为选择器选项
   * @param models 模型配置数组
   * @returns 标准化的模型选择选项
   */
  static modelsToSelectOptions(models: (ModelConfig & { key: string })[]): ModelSelectOption[] {
    return models.map(model => ({
      primary: model.name,
      secondary: model.provider ?? (model as any)?.providerId ?? 'Unknown',
      value: model.key,
      raw: model,
      // 保持向后兼容性
      label: `${model.name} (${model.provider ?? (model as any)?.providerId ?? 'Unknown'})`
    }))
  }

  /**
   * 将模板配置转换为选择器选项
   * @param templates 模板配置数组
   * @returns 标准化的模板选择选项
   */
  static templatesToSelectOptions(templates: Template[]): TemplateSelectOption[] {
    return templates.map(template => ({
      primary: template.name || '',
      secondary: template.metadata?.description || '',
      value: template.id,
      raw: template,
      // 保持向后兼容性
      label: template.name || ''
    }))
  }

  /**
   * 通用转换函数
   * @param items 原始数据数组
   * @param getPrimary 提取主要显示文本的函数
   * @param getSecondary 提取次要显示文本的函数
   * @param getValue 提取值的函数
   * @returns 标准化的选择选项
   */
  static toSelectOptions<T>(
    items: T[],
    getPrimary: (item: T) => string,
    getSecondary: (item: T) => string,
    getValue: (item: T) => string
  ): SelectOption<T>[] {
    return items.map(item => {
      const primary = getPrimary(item)
      const secondary = getSecondary(item)
      return {
        primary,
        secondary,
        value: getValue(item),
        raw: item,
        // 生成兼容的label格式
        label: secondary ? `${primary} (${secondary})` : primary
      }
    })
  }
}

/**
 * 简化的访问器函数
 * 用于SelectWithConfig组件的prop函数
 */
export const OptionAccessors = {
  /**
   * 获取主要显示文本
   */
  getPrimary: <T>(opt: SelectOption<T>): string => opt.primary,

  /**
   * 获取次要显示文本
   */
  getSecondary: <T>(opt: SelectOption<T>): string => opt.secondary,

  /**
   * 获取选择值
   */
  getValue: <T>(opt: SelectOption<T>): string => opt.value
}