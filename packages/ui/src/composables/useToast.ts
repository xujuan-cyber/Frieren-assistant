import { useMessage } from 'naive-ui'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

export function useToast() {
  // 使用Naive UI的消息API
  const message = useMessage()

  const add = (content: string, type: Toast['type'] = 'info', duration: number = 3000) => {
    const options = {
      content,
      duration,
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

  const remove = (id: any) => {
    // Naive UI消息实例可以直接调用destroy方法
    if (id && typeof id.destroy === 'function') {
      id.destroy()
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
    toasts: [], // Naive UI不需要维护toasts数组
  }
}
