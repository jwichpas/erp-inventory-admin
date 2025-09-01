<template>
    <TransitionRoot appear :show="show" as="template" enter="transform ease-out duration-300 transition"
        enter-from="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
        enter-to="translate-y-0 opacity-100 sm:translate-x-0" leave="transition ease-in duration-100"
        leave-from="opacity-100" leave-to="opacity-0">
        <div :class="toastClasses">
            <div class="flex">
                <div class="flex-shrink-0">
                    <component :is="iconComponent" :class="iconClasses" aria-hidden="true" />
                </div>
                <div class="ml-3 w-0 flex-1 pt-0.5">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ title }}
                    </p>
                    <p v-if="message" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {{ message }}
                    </p>
                </div>
                <div class="ml-4 flex flex-shrink-0">
                    <button type="button" :class="closeButtonClasses" @click="$emit('close')">
                        <span class="sr-only">Close</span>
                        <XIcon class="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    </TransitionRoot>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TransitionRoot } from '@headlessui/vue'
import {
    CheckCircle as CheckCircleIcon,
    AlertTriangle as ExclamationTriangleIcon,
    XCircle as XCircleIcon,
    Info as InformationCircleIcon,
    X as XIcon,
} from 'lucide-vue-next'

interface ToastProps {
    show: boolean
    type?: 'success' | 'error' | 'warning' | 'info'
    title: string
    message?: string
}

interface ToastEmits {
    close: []
}

const props = withDefaults(defineProps<ToastProps>(), {
    type: 'info',
})

defineEmits<ToastEmits>()

const iconComponent = computed(() => {
    const icons = {
        success: CheckCircleIcon,
        error: XCircleIcon,
        warning: ExclamationTriangleIcon,
        info: InformationCircleIcon,
    }
    return icons[props.type]
})

const toastClasses = computed(() => {
    const baseClasses = [
        'max-w-sm',
        'w-full',
        'shadow-lg',
        'rounded-lg',
        'pointer-events-auto',
        'ring-1',
        'ring-black',
        'ring-opacity-5',
        'overflow-hidden',
    ]

    const typeClasses = {
        success: [
            'bg-white',
            'dark:bg-gray-800',
        ],
        error: [
            'bg-white',
            'dark:bg-gray-800',
        ],
        warning: [
            'bg-white',
            'dark:bg-gray-800',
        ],
        info: [
            'bg-white',
            'dark:bg-gray-800',
        ],
    }

    return [
        ...baseClasses,
        ...typeClasses[props.type],
        'p-4',
    ].join(' ')
})

const iconClasses = computed(() => {
    const baseClasses = ['h-6', 'w-6']

    const typeClasses = {
        success: ['text-green-400'],
        error: ['text-red-400'],
        warning: ['text-yellow-400'],
        info: ['text-blue-400'],
    }

    return [
        ...baseClasses,
        ...typeClasses[props.type],
    ].join(' ')
})

const closeButtonClasses = computed(() => [
    'inline-flex',
    'rounded-md',
    'bg-white',
    'dark:bg-gray-800',
    'text-gray-400',
    'hover:text-gray-500',
    'dark:hover:text-gray-300',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-indigo-500',
    'focus:ring-offset-2',
    'dark:focus:ring-offset-gray-800',
].join(' '))
</script>
