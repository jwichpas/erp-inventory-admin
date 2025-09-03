import { ref, type Ref } from 'vue'

interface ToastItem {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

// Global toast state
const toasts: Ref<ToastItem[]> = ref([])
const timeouts = new Map<string, NodeJS.Timeout>()

export const useToast = () => {
  const addToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: ToastItem = {
      ...toast,
      id,
      duration: toast.duration || 5000,
    }

    toasts.value.push(newToast)

    // Auto-remove toast after duration
    if (newToast.duration && newToast.duration > 0) {
      const timeout = setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
      timeouts.set(id, timeout)
    }

    return id
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex((toast) => toast.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }

    // Clear timeout
    const timeout = timeouts.get(id)
    if (timeout) {
      clearTimeout(timeout)
      timeouts.delete(id)
    }
  }

  const clearAllToasts = () => {
    toasts.value.forEach((toast) => {
      removeToast(toast.id)
    })
  }

  // Convenience methods
  const success = (title: string, message?: string, duration?: number) => {
    return addToast({ type: 'success', title, message, duration })
  }

  const error = (title: string, message?: string, duration?: number) => {
    return addToast({ type: 'error', title, message, duration })
  }

  const warning = (title: string, message?: string, duration?: number) => {
    return addToast({ type: 'warning', title, message, duration })
  }

  const info = (title: string, message?: string, duration?: number) => {
    return addToast({ type: 'info', title, message, duration })
  }

  // Convenience function for the POS components that use showToast(message, type)
  const showToast = (title: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', message?: string, duration?: number) => {
    return addToast({ type, title, message, duration })
  }

  return {
    toasts: toasts as Readonly<Ref<ToastItem[]>>,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
    showToast,
  }
}
