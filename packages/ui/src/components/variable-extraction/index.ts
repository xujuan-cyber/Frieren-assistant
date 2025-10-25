/**
 * 变量提取功能模块
 *
 * 提供以下功能：
 * 1. VariableExtractionDialog - 变量提取对话框
 * 2. VariableAwareInput - 支持变量提取的智能输入框
 * 3. useTextSelection - 文本选择检测 composable
 * 4. useInputHistory - 输入历史记录管理 composable
 */

export { default as VariableExtractionDialog } from './VariableExtractionDialog.vue'
export { default as VariableAwareInput } from './VariableAwareInput.vue'
export { useTextSelection } from './useTextSelection'
export { useInputHistory } from './useInputHistory'

export type { TextSelection } from './useTextSelection'
export type { HistoryRecord, UseInputHistoryOptions } from './useInputHistory'
