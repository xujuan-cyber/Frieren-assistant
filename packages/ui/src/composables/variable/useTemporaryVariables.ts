/**
 * 临时变量管理 Composable
 *
 * 功能说明：
 * - 管理会话级别的临时变量（不持久化，仅存在于内存中）
 * - 全局单例模式，确保所有组件访问同一实例
 * - 用于存储从文本提取的变量、测试区域的临时变量等
 *
 * 使用场景：
 * - 用户在输入框中提取的变量（提取后存为临时变量）
 * - 测试区域新增的测试变量
 * - 任何不需要持久化的会话级变量
 *
 * 与全局变量的区别：
 * - 全局变量：持久化存储，跨会话保留（通过 useVariableManager）
 * - 临时变量：仅在当前会话有效，刷新页面后丢失（通过 useTemporaryVariables）
 */

import { ref, readonly, type Ref } from 'vue'

// 全局单例状态
const temporaryVariablesStore = ref<Record<string, string>>({})

/**
 * 临时变量管理器接口
 */
export interface TemporaryVariablesManager {
  /** 临时变量存储（只读） */
  readonly temporaryVariables: Readonly<Ref<Record<string, string>>>

  /** 设置临时变量 */
  setVariable: (name: string, value: string) => void

  /** 获取临时变量值 */
  getVariable: (name: string) => string | undefined

  /** 删除临时变量 */
  deleteVariable: (name: string) => void

  /** 清空所有临时变量 */
  clearAll: () => void

  /** 检查变量是否存在 */
  hasVariable: (name: string) => boolean

  /** 列出所有临时变量 */
  listVariables: () => Record<string, string>

  /** 批量设置变量 */
  batchSet: (variables: Record<string, string>) => void

  /** 批量删除变量 */
  batchDelete: (names: string[]) => void
}

/**
 * 使用临时变量管理器
 *
 * 特性：
 * - 全局单例：所有组件共享同一份临时变量
 * - 响应式：变量更新自动触发组件重渲染
 * - 轻量级：仅内存存储，无持久化开销
 *
 * @example
 * ```typescript
 * // 在任意组件中使用
 * const tempVars = useTemporaryVariables()
 *
 * // 设置临时变量
 * tempVars.setVariable('userName', 'Alice')
 *
 * // 获取变量值
 * const name = tempVars.getVariable('userName')
 *
 * // 清空所有临时变量
 * tempVars.clearAll()
 * ```
 */
export function useTemporaryVariables(): TemporaryVariablesManager {

  /**
   * 设置临时变量
   * @param name 变量名
   * @param value 变量值
   */
  const setVariable = (name: string, value: string): void => {
    temporaryVariablesStore.value[name] = value
  }

  /**
   * 获取临时变量值
   * @param name 变量名
   * @returns 变量值，如果不存在返回 undefined
   */
  const getVariable = (name: string): string | undefined => {
    return temporaryVariablesStore.value[name]
  }

  /**
   * 删除临时变量
   * @param name 变量名
   */
  const deleteVariable = (name: string): void => {
    delete temporaryVariablesStore.value[name]
  }

  /**
   * 清空所有临时变量
   */
  const clearAll = (): void => {
    temporaryVariablesStore.value = {}
  }

  /**
   * 检查变量是否存在
   * @param name 变量名
   * @returns 是否存在
   */
  const hasVariable = (name: string): boolean => {
    return name in temporaryVariablesStore.value
  }

  /**
   * 列出所有临时变量（返回副本，避免直接修改）
   * @returns 所有临时变量的副本
   */
  const listVariables = (): Record<string, string> => {
    return { ...temporaryVariablesStore.value }
  }

  /**
   * 批量设置变量
   * @param variables 变量键值对
   */
  const batchSet = (variables: Record<string, string>): void => {
    temporaryVariablesStore.value = {
      ...temporaryVariablesStore.value,
      ...variables
    }
  }

  /**
   * 批量删除变量
   * @param names 要删除的变量名列表
   */
  const batchDelete = (names: string[]): void => {
    names.forEach(name => {
      delete temporaryVariablesStore.value[name]
    })
  }

  return {
    temporaryVariables: readonly(temporaryVariablesStore),
    setVariable,
    getVariable,
    deleteVariable,
    clearAll,
    hasVariable,
    listVariables,
    batchSet,
    batchDelete
  }
}
