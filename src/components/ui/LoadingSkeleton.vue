<template>
    <div class="animate-pulse">
        <!-- Table Skeleton -->
        <div v-if="type === 'table'" class="space-y-4">
            <!-- Table Header -->
            <div class="grid grid-cols-4 gap-4">
                <div v-for="i in 4" :key="`header-${i}`" class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <!-- Table Rows -->
            <div v-for="row in rows" :key="`row-${row}`" class="grid grid-cols-4 gap-4">
                <div v-for="col in 4" :key="`cell-${row}-${col}`" class="h-4 bg-gray-200 dark:bg-gray-700 rounded">
                </div>
            </div>
        </div>

        <!-- Card Skeleton -->
        <div v-else-if="type === 'card'" class="space-y-4">
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <!-- Card Header -->
                <div class="flex items-center space-x-4 mb-4">
                    <div class="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div class="space-y-2 flex-1">
                        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                </div>
                <!-- Card Content -->
                <div class="space-y-3">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
                </div>
            </div>
        </div>

        <!-- Form Skeleton -->
        <div v-else-if="type === 'form'" class="space-y-6">
            <div v-for="field in fields" :key="`field-${field}`" class="space-y-2">
                <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div class="flex space-x-4">
                <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            </div>
        </div>

        <!-- List Skeleton -->
        <div v-else-if="type === 'list'" class="space-y-3">
            <div v-for="item in items" :key="`item-${item}`"
                class="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div class="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div class="space-y-2 flex-1">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div class="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
        </div>

        <!-- Dashboard Skeleton -->
        <div v-else-if="type === 'dashboard'" class="space-y-6">
            <!-- Stats Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div v-for="stat in 4" :key="`stat-${stat}`"
                    class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                        <div class="ml-4 space-y-2 flex-1">
                            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                            <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Charts -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div
                    class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                    <div class="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div
                    class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                    <div class="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
            </div>
        </div>

        <!-- Generic Text Skeleton -->
        <div v-else class="space-y-3">
            <div v-for="line in lines" :key="`line-${line}`" class="h-4 bg-gray-200 dark:bg-gray-700 rounded"
                :class="getLineWidth(line)"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
    type?: 'table' | 'card' | 'form' | 'list' | 'dashboard' | 'text'
    rows?: number
    fields?: number
    items?: number
    lines?: number
}

const props = withDefaults(defineProps<Props>(), {
    type: 'text',
    rows: 5,
    fields: 4,
    items: 3,
    lines: 3,
})

const getLineWidth = (line: number) => {
    const widths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/4', 'w-2/3']
    return widths[line % widths.length]
}
</script>
