import { ref } from 'vue'

const toasts = ref<ToastItem[]>([])

interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

let idCounter = 0

function generateId(): string {
  return `toast-${Date.now()}-${idCounter++}`
}

export function useToast() {
  function add(message: string, type: ToastItem['type'], duration?: number) {
    const id = generateId()
    const toast: ToastItem = {
      id,
      message,
      type,
      duration
    }
    toasts.value.push(toast)
    return id
  }

  function remove(id: string) {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  function success(message: string, duration?: number) {
    return add(message, 'success', duration)
  }

  function error(message: string, duration?: number) {
    return add(message, 'error', duration)
  }

  function warning(message: string, duration?: number) {
    return add(message, 'warning', duration)
  }

  function info(message: string, duration?: number) {
    return add(message, 'info', duration)
  }

  function clear() {
    toasts.value = []
  }

  return {
    toasts,
    success,
    error,
    warning,
    info,
    remove,
    clear
  }
}

// 导出一个全局单例
export const toast = useToast()
