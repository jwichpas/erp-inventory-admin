<template>
    <TransitionRoot appear :show="show" as="template">
        <Dialog as="div" class="relative z-50" @close="handleClose">
            <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
                leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
                <div class="fixed inset-0 bg-black bg-opacity-25 dark:bg-opacity-50" />
            </TransitionChild>

            <div class="fixed inset-0 overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4 text-center">
                    <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
                        enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
                        leave-to="opacity-0 scale-95">
                        <DialogPanel :class="modalClasses">
                            <!-- Header -->
                            <div v-if="$slots.header || title"
                                class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                                <div class="flex items-center">
                                    <slot name="header">
                                        <DialogTitle as="h3"
                                            class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                                            {{ title }}
                                        </DialogTitle>
                                    </slot>
                                </div>
                                <button v-if="!persistent" type="button"
                                    class="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                                    @click="handleClose">
                                    <span class="sr-only">Close</span>
                                    <XMarkIcon class="h-6 w-6" aria-hidden="true" />
                                </button>
                            </div>

                            <!-- Body -->
                            <div :class="bodyClasses">
                                <slot />
                            </div>

                            <!-- Footer -->
                            <div v-if="$slots.footer"
                                class="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                                <slot name="footer" />
                            </div>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </div>
        </Dialog>
    </TransitionRoot>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
    Dialog,
    DialogPanel,
    DialogTitle,
    TransitionChild,
    TransitionRoot,
} from '@headlessui/vue'
import { X as XMarkIcon } from 'lucide-vue-next'

interface ModalProps {
    show: boolean
    title?: string
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
    persistent?: boolean
    noPadding?: boolean
}

interface ModalEmits {
    close: []
}

const props = withDefaults(defineProps<ModalProps>(), {
    size: 'md',
    persistent: false,
    noPadding: false,
})

const emit = defineEmits<ModalEmits>()

const handleClose = () => {
    if (!props.persistent) {
        emit('close')
    }
}

const modalClasses = computed(() => {
    const baseClasses = [
        'w-full',
        'transform',
        'overflow-hidden',
        'rounded-2xl',
        'bg-white',
        'dark:bg-gray-900',
        'text-left',
        'align-middle',
        'shadow-xl',
        'transition-all',
    ]

    // Size classes
    const sizeClasses = {
        xs: 'max-w-xs',
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        full: 'max-w-full mx-4',
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
    return 'p-6'
})
</script>
