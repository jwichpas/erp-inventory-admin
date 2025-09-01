<template>
    <button :type="type" :disabled="disabled || loading" :class="buttonClasses" @click="handleClick">
        <div v-if="loading" class="flex items-center">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                </path>
            </svg>
            <span>{{ loadingText || 'Loading...' }}</span>
        </div>
        <div v-else class="flex items-center">
            <component v-if="leftIcon" :is="leftIcon" class="mr-2 h-4 w-4" />
            <slot />
            <component v-if="rightIcon" :is="rightIcon" class="ml-2 h-4 w-4" />
        </div>
    </button>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'

interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'outline'
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    loading?: boolean
    loadingText?: string
    leftIcon?: Component
    rightIcon?: Component
    fullWidth?: boolean
}

interface ButtonEmits {
    click: [event: MouseEvent]
}

const props = withDefaults(defineProps<ButtonProps>(), {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false,
    fullWidth: false,
})

const emit = defineEmits<ButtonEmits>()

const handleClick = (event: MouseEvent) => {
    if (!props.disabled && !props.loading) {
        emit('click', event)
    }
}

const buttonClasses = computed(() => {
    const baseClasses = [
        'inline-flex',
        'items-center',
        'justify-center',
        'font-medium',
        'rounded-md',
        'transition-colors',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-offset-2',
        'disabled:opacity-50',
        'disabled:cursor-not-allowed',
    ]

    // Size classes
    const sizeClasses = {
        xs: 'px-2.5 py-1.5 text-xs',
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-4 py-2 text-base',
        xl: 'px-6 py-3 text-base',
    }

    // Variant classes
    const variantClasses = {
        primary: [
            'bg-blue-600',
            'text-white',
            'hover:bg-blue-700',
            'focus:ring-blue-500',
            'dark:bg-blue-500',
            'dark:hover:bg-blue-600',
            'dark:focus:ring-blue-400',
        ],
        secondary: [
            'bg-gray-600',
            'text-white',
            'hover:bg-gray-700',
            'focus:ring-gray-500',
            'dark:bg-gray-500',
            'dark:hover:bg-gray-600',
            'dark:focus:ring-gray-400',
        ],
        success: [
            'bg-green-600',
            'text-white',
            'hover:bg-green-700',
            'focus:ring-green-500',
            'dark:bg-green-500',
            'dark:hover:bg-green-600',
            'dark:focus:ring-green-400',
        ],
        danger: [
            'bg-red-600',
            'text-white',
            'hover:bg-red-700',
            'focus:ring-red-500',
            'dark:bg-red-500',
            'dark:hover:bg-red-600',
            'dark:focus:ring-red-400',
        ],
        warning: [
            'bg-yellow-600',
            'text-white',
            'hover:bg-yellow-700',
            'focus:ring-yellow-500',
            'dark:bg-yellow-500',
            'dark:hover:bg-yellow-600',
            'dark:focus:ring-yellow-400',
        ],
        ghost: [
            'bg-transparent',
            'text-gray-700',
            'hover:bg-gray-100',
            'focus:ring-gray-500',
            'dark:text-gray-300',
            'dark:hover:bg-gray-800',
            'dark:focus:ring-gray-400',
        ],
        outline: [
            'bg-transparent',
            'border',
            'border-gray-300',
            'text-gray-700',
            'hover:bg-gray-50',
            'focus:ring-gray-500',
            'dark:border-gray-600',
            'dark:text-gray-300',
            'dark:hover:bg-gray-800',
            'dark:focus:ring-gray-400',
        ],
    }

    const classes = [
        ...baseClasses,
        sizeClasses[props.size],
        ...variantClasses[props.variant],
    ]

    if (props.fullWidth) {
        classes.push('w-full')
    }

    return classes.join(' ')
})
</script>
