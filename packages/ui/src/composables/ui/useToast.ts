import type { MessageApiInjection, MessageOptions, MessageReactive } from 'naive-ui'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

// 全局消息API实例 - 在NMessageProvider上下文中初始化
let globalMessageApi: MessageApiInjection | null = null

// 设置全局消息API（在Toast组件中调用）
export function setGlobalMessageApi(api: MessageApiInjection) {
  globalMessageApi = api
  console.log('[useToast] Global message API set successfully')
}

export function useToast() {
  const getMessageApi = (): MessageApiInjection | null => {
    if (!globalMessageApi) {
      console.warn('[useToast] NMessageProvider context not available yet.')
    }
    return globalMessageApi
  }

  const add = (
    content: string,
    type: Toast['type'] = 'info',
    duration: number = 3000
  ): MessageReactive | undefined => {
    const message = getMessageApi()
    if (!message) return undefined

    const options: MessageOptions = {
      duration,
      content,
      closable: true,
      keepAliveOnHover: true
    }
    
    switch (type) {
      case 'success':
        return message.success(content, options)
      case 'error':
        return message.error(content, options)
      case 'warning':
        return message.warning(content, options)
      case 'info':
      default:
        return message.info(content, options)
    }
  }

  const remove = (messageReactive?: MessageReactive) => {
    // Naive UI消息实例可以直接调用destroy方法
    if (messageReactive && typeof messageReactive.destroy === 'function') {
      messageReactive.destroy()
    }
  }

  const success = (content: string, duration?: number) => add(content, 'success', duration)
  const error = (content: string, duration?: number) => add(content, 'error', duration)
  const info = (content: string, duration?: number) => add(content, 'info', duration)
  const warning = (content: string, duration?: number) => add(content, 'warning', duration)

  return {
    add,
    remove,
    success,
    error,
    info,
    warning,
    // 向后兼容
    toasts: [] as never[], // Naive UI不需要维护toasts数组
  }
}
