export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

// 全局消息API实例 - 在NMessageProvider上下文中初始化
let globalMessageApi: any = null

// 设置全局消息API（在Toast组件中调用）
export function setGlobalMessageApi(api: any) {
  globalMessageApi = api
  console.log('[useToast] Global message API set successfully')
}

export function useToast() {
  const getMessageApi = () => {
    if (!globalMessageApi) {
      throw new Error('[useToast] NMessageProvider context not available. Ensure Toast component is properly initialized in the component tree.')
    }
    return globalMessageApi
  }

  const add = (content: string, type: Toast['type'] = 'info', duration: number = 3000) => {
    const message = getMessageApi()

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
