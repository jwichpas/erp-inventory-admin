<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center justify-between">
            <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ title }}</p>
                <p class="text-2xl font-semibold text-gray-900 dark:text-white mt-2">
                    <slot name="value">{{ value }}</slot>
                </p>
                <div v-if="change !== undefined" class="flex items-center mt-2">
                    <component :is="changeIcon" :class="[
                        'h-4 w-4 mr-1',
                        changeType === 'positive' ? 'text-green-500' : 'text-red-500'
                    ]" />
                    <span :class="[
                        'text-sm font-medium',
                        changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    ]">
                        {{ Math.abs(change) }}{{ changeUnit }}
                    </span>
                    <span class="text-sm text-gray-500 dark:text-gray-400 ml-1">{{ changeLabel }}</span>
                </div>
            </div>
            <div v-if="icon" class="flex-shrink-0">
                <div class="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <component :is="icon" class="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
            </div>
        </div>
        <div v-if="$slots.footer" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <slot name="footer" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TrendingUp, TrendingDown } from 'lucide-vue-next'
import type { Component } from 'vue'

interface Props {
    title: string
    value?: string | number
    change?: number
    changeUnit?: string
    changeLabel?: string
    icon?: Component
}

const props = withDefaults(defineProps<Props>(), {
    changeUnit: '%',
    changeLabel: 'from last period'
})

const changeType = computed(() => {
    if (props.change === undefined) return null
    return props.change >= 0 ? 'positive' : 'negative'
})

const changeIcon = computed(() => {
    return changeType.value === 'positive' ? TrendingUp : TrendingDown
})
</script>
