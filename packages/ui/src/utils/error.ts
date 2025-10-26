/**
 * 错误处理工具函数
 * 提供统一的错误处理和类型安全的错误信息提取
 */

import { useToast } from '../composables/ui/useToast'

/**
 * 扩展错误类型，支持更详细的错误信息
 */
export interface ExtendedError extends Error {
  /** 详细的错误消息 */
  detailedMessage?: string
  /** 原始错误对象 */
  originalError?: unknown
  /** 错误代码 */
  code?: string
  /** 错误上下文 */
  context?: Record<string, unknown>
}

/**
 * 应用错误类
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * 从未知类型的错误中提取错误消息
 * @param error - 未知类型的错误对象
 * @param fallback - 默认错误消息
 * @returns 错误消息字符串
 */
export function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error === null || error === undefined) {
    return fallback
  }
  return String(error)
}

/**
 * 类型守卫：检查是否为 ExtendedError
 * @param error - 待检查的错误对象
 * @returns 是否为 ExtendedError
 */
export function isExtendedError(error: unknown): error is ExtendedError {
  return (
    error instanceof Error &&
    ('detailedMessage' in error || 'originalError' in error || 'code' in error || 'context' in error)
  )
}

/**
 * 安全地将未知错误转换为 ExtendedError
 * @param error - 未知类型的错误对象
 * @returns ExtendedError 或 null
 */
export function asExtendedError(error: unknown): ExtendedError | null {
  if (isExtendedError(error)) {
    return error
  }
  return null
}

/**
 * 获取详细的错误消息，优先使用 ExtendedError 的详细信息
 * @param error - 未知类型的错误对象
 * @param fallback - 默认错误消息
 * @returns 详细的错误消息字符串
 */
export function getDetailedErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  const extendedError = asExtendedError(error)

  if (extendedError) {
    // 优先使用详细消息
    if (extendedError.detailedMessage) {
      return extendedError.detailedMessage
    }

    // 其次使用原始错误
    if (extendedError.originalError !== undefined) {
      return String(extendedError.originalError)
    }

    // 最后使用标准错误消息
    return extendedError.message
  }

  return getErrorMessage(error, fallback)
}

/**
 * 创建一个 ExtendedError 实例
 * @param message - 错误消息
 * @param options - 扩展选项
 * @returns ExtendedError 实例
 */
export function createExtendedError(
  message: string,
  options?: {
    detailedMessage?: string
    originalError?: unknown
    code?: string
    context?: Record<string, unknown>
  }
): ExtendedError {
  const error = new Error(message) as ExtendedError

  if (options?.detailedMessage) {
    error.detailedMessage = options.detailedMessage
  }

  if (options?.originalError !== undefined) {
    error.originalError = options.originalError
  }

  if (options?.code) {
    error.code = options.code
  }

  if (options?.context) {
    error.context = options.context
  }

  return error
}

/**
 * 创建错误处理器
 * @param context - 错误上下文描述
 * @returns 错误处理器对象
 */
export function createErrorHandler(context: string) {
  const toast = useToast()

  return {
    handleError(error: unknown) {
      console.error(`[${context}]错误:`, error)

      if (error instanceof AppError) {
        toast.error(error.message)
        return
      }

      if (error instanceof Error) {
        toast.error(error.message || `${context}过程中发生错误`)
        return
      }

      toast.error(`${context}过程中发生未知错误`)
    }
  }
}

/**
 * 在开发环境中记录详细的错误信息
 * @param context - 错误上下文描述
 * @param error - 错误对象
 */
export function logErrorInDev(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[${context}] Error occurred:`, error)

    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        ...(isExtendedError(error) && {
          detailedMessage: error.detailedMessage,
          originalError: error.originalError,
          code: error.code,
          context: error.context
        })
      })
    }
  }
}

/**
 * 预定义错误消息常量
 */
export const errorMessages = {
  SERVICE_NOT_INITIALIZED: '服务未初始化，请稍后重试',
  TEMPLATE_NOT_SELECTED: '请先选择提示词模板',
  INCOMPLETE_TEST_INFO: '请填写完整的测试信息',
  LOAD_TEMPLATE_FAILED: '加载提示词失败',
  CLEAR_HISTORY_FAILED: '清空历史记录失败'
} as const 