<template>
    <div :class="cardClasses">
        <div v-if="$slots.header || title" :class="headerClasses">
            <slot name="header">
                <h3 v-if="title" class="text-lg font-medium text-gray-900 dark:text-white">
                    {{ title }}
                </h3>
            </slot>
        </div>

        <div :class="bodyClasses">
            <slot />
        </div>

        <div v-if="$slots.footer" :class="footerClasses">
            <slot name="footer" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface CardProps {
    variant?: 'default' | 'outlined' | 'elevated' | 'flat'
    size?: 'sm' | 'md' | 'lg'
    title?: string
    noPadding?: boolean
    hoverable?: boolean
}

const props = withDefaults(defineProps<CardProps>(), {
    variant: 'default',
    size: 'md',
    noPadding: false,
    hoverable: false,
})

const cardClasses = computed(() => {
    const baseClasses = [
        'bg-white',
        'dark:bg-gray-800',
        'rounded-lg',
        'transition-all',
        'duration-200',
    ]

    // Variant classes
    const variantClasses = {
        default: [
            'border',
            'border-gray-200',
            'dark:border-gray-700',
        ],
        outlined: [
            'border-2',
            'border-gray-300',
            'dark:border-gray-600',
        ],
        elevated: [
            'shadow-lg',
            'border',
            'border-gray-100',
            'dark:border-gray-700',
        ],
        flat: [
            'shadow-none',
            'border-0',
        ],
    }

    const classes = [
        ...baseClasses,
        ...variantClasses[props.variant],
    ]

    if (props.hoverable) {
        classes.push(
            'hover:shadow-md',
            'hover:border-gray-300',
            'dark:hover:border-gray-600',
            'cursor-pointer',
        )
    }

    return classes.join(' ')
})

const headerClasses = computed(() => {
    const baseClasses = [
        'border-b',
        'border-gray-200',
        'dark:border-gray-700',
    ]

    // Size-based padding
    const sizeClasses = {
        sm: 'px-4 py-3',
        md: 'px-6 py-4',
        lg: 'px-8 py-5',
    }

    return [
        ...baseClasses,
        sizeClasses[props.size],
    ].join(' ')
})

const bodyClasses = computed(() => {
    if (props.noPadding) {
        return ''
    }

    // Size-based padding
    const sizeClasses = {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    }

    return sizeClasses[props.size]
})

const footerClasses = computed(() => {
    const baseClasses = [
        'border-t',
        'border-gray-200',
        'dark:border-gray-700',
        'bg-gray-50',
        'dark:bg-gray-700',
        'rounded-b-lg',
    ]

    // Size-based padding
    const sizeClasses = {
        sm: 'px-4 py-3',
        md: 'px-6 py-4',
        lg: 'px-8 py-5',
    }

    return [
        ...baseClasses,
        sizeClasses[props.size],
    ].join(' ')
})
</script>
