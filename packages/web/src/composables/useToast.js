import { ref } from 'vue'

const toasts = ref([])

export function useToast() {
  const add = (message, type = 'info', duration = 3000) => {
    const id = Date.now()
    toasts.value.push({ id, message, type })
    
    setTimeout(() => {
      remove(id)
    }, duration)
  }

  const remove = (id) => {
    const index = toasts.value.findIndex(toast => toast.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const success = (message, duration) => add(message, 'success', duration)
  const error = (message, duration) => add(message, 'error', duration)
  const info = (message, duration) => add(message, 'info', duration)
  const warning = (message, duration) => add(message, 'warning', duration)

  return {
    toasts,
    add,
    remove,
    success,
    error,
    info,
    warning
  }
}
