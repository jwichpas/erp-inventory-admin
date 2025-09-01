<template>
    <div aria-live="assertive"
        class="fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-50">
        <div class="w-full flex flex-col items-center space-y-4 sm:items-end">
            <Toast v-for="toast in toasts" :key="toast.id" :show="toast.show" :type="toast.type" :title="toast.title"
                :message="toast.message" @close="removeToast(toast.id)" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Toast from './Toast.vue'

interface ToastItem {
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message?: string
    show: boolean
    duration?: number
}

const toasts = ref<ToastItem[]>([])
const timeouts = new Map<string, NodeJS.Timeout>()

const addToast = (toast: Omit<ToastItem, 'id' | 'show'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: ToastItem = {
        ...toast,
        id,
        show: true,
        duration: toast.duration || 5000,
    }

    toasts.value.push(newToast)

    // Auto-remove toast after duration
    if (newToast.duration > 0) {
        const timeout = setTimeout(() => {
            removeToast(id)
        }, newToast.duration)
        timeouts.set(id, timeout)
    }
}

const removeToast = (id: string) => {
    const index = toasts.value.findIndex(toast => toast.id === id)
    if (index > -1) {
        toasts.value[index].show = false

        // Remove from array after animation
        setTimeout(() => {
            const currentIndex = toasts.value.findIndex(toast => toast.id === id)
            if (currentIndex > -1) {
                toasts.value.splice(currentIndex, 1)
            }
        }, 300)
    }

    // Clear timeout
    const timeout = timeouts.get(id)
    if (timeout) {
        clearTimeout(timeout)
        timeouts.delete(id)
    }
}

const clearAllToasts = () => {
    toasts.value.forEach(toast => {
        removeToast(toast.id)
    })
}

// Global toast methods
const showSuccess = (title: string, message?: string, duration?: number) => {
    addToast({ type: 'success', title, message, duration })
}

const showError = (title: string, message?: string, duration?: number) => {
    addToast({ type: 'error', title, message, duration })
}

const showWarning = (title: string, message?: string, duration?: number) => {
    addToast({ type: 'warning', title, message, duration })
}

const showInfo = (title: string, message?: string, duration?: number) => {
    addToast({ type: 'info', title, message, duration })
}

// Cleanup timeouts on unmount
onUnmounted(() => {
    timeouts.forEach(timeout => clearTimeout(timeout))
    timeouts.clear()
})

// Expose methods for global use
defineExpose({
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
})
</script>
