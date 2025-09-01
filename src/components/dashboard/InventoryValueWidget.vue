<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Inventory Value by Warehouse</h3>
            <div class="flex items-center space-x-2">
                <div class="flex items-center">
                    <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span class="text-xs text-gray-500 dark:text-gray-400">Real-time</span>
                </div>
                <button @click="refreshData" :disabled="isLoading"
                    class="inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">
                    <RefreshCw :class="['h-3 w-3', { 'animate-spin': isLoading }]" />
                </button>
            </div>
        </div>

        <div v-if="isLoading" class="space-y-3">
            <div v-for="i in 3" :key="i" class="animate-pulse">
                <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        <div class="space-y-1">
                            <div class="w-24 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                            <div class="w-16 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        </div>
                    </div>
                    <div class="w-20 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
            </div>
        </div>

        <div v-else-if="error" class="flex items-center justify-center py-8">
            <div class="text-center">
                <AlertCircle class="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p class="text-sm text-gray-500 dark:text-gray-400">Failed to load inventory data</p>
            </div>
        </div>

        <div v-else-if="!inventoryData.length" class="flex items-center justify-center py-8">
            <div class="text-center">
                <Package class="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p class="text-sm text-gray-500 dark:text-gray-400">No inventory data available</p>
            </div>
        </div>

        <div v-else class="space-y-3">
            <div v-for="warehouse in inventoryData" :key="warehouse.warehouseId"
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <Warehouse class="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-900 dark:text-white">
                            {{ warehouse.warehouseName }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            {{ warehouse.totalItems }} items
                        </p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">
                        {{ formatCurrency(warehouse.totalValue) }}
                    </p>
                    <div class="flex items-center mt-1">
                        <div class="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                            <div class="h-full bg-blue-500 rounded-full transition-all duration-300"
                                :style="{ width: `${getValuePercentage(warehouse.totalValue)}%` }"></div>
                        </div>
                        <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            {{ getValuePercentage(warehouse.totalValue).toFixed(0) }}%
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="inventoryData.length > 0" class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Total Inventory Value</span>
                <span class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ formatCurrency(totalValue) }}
                </span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RefreshCw, AlertCircle, Package, Warehouse } from 'lucide-vue-next'
import type { InventoryValueData } from '@/types/dashboard'

interface Props {
    data: InventoryValueData[]
    isLoading?: boolean
    error?: Error | null
}

const props = withDefaults(defineProps<Props>(), {
    isLoading: false,
    error: null
})

const emit = defineEmits<{
    refresh: []
}>()

const inventoryData = computed(() => props.data || [])

const totalValue = computed(() => {
    return inventoryData.value.reduce((sum, warehouse) => sum + warehouse.totalValue, 0)
})

const getValuePercentage = (value: number) => {
    if (totalValue.value === 0) return 0
    return (value / totalValue.value) * 100
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value)
}

const refreshData = () => {
    emit('refresh')
}
</script>
