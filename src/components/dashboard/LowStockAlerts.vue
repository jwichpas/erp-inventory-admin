<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center justify-between mb-6">
            <div class="flex items-center space-x-2">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Low Stock Alerts</h3>
                <span v-if="alerts.length > 0" :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    getAlertBadgeClass(alerts[0]?.urgencyLevel)
                ]">
                    {{ alerts.length }}
                </span>
            </div>
            <button @click="refreshData" :disabled="isLoading"
                class="inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">
                <RefreshCw :class="['h-3 w-3', { 'animate-spin': isLoading }]" />
            </button>
        </div>

        <div v-if="isLoading" class="space-y-3">
            <div v-for="i in 3" :key="i" class="animate-pulse">
                <div class="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div class="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    <div class="flex-1 space-y-1">
                        <div class="w-32 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        <div class="w-24 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    </div>
                    <div class="w-16 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
            </div>
        </div>

        <div v-else-if="error" class="flex items-center justify-center py-8">
            <div class="text-center">
                <AlertCircle class="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p class="text-sm text-gray-500 dark:text-gray-400">Failed to load stock alerts</p>
            </div>
        </div>

        <div v-else-if="!alerts.length" class="flex items-center justify-center py-8">
            <div class="text-center">
                <CheckCircle class="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p class="text-sm text-gray-500 dark:text-gray-400">All products are well stocked</p>
            </div>
        </div>

        <div v-else class="space-y-3 max-h-96 overflow-y-auto">
            <div v-for="alert in alerts" :key="alert.productId"
                class="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div
                    :class="['w-8 h-8 rounded-lg flex items-center justify-center', getIconBackgroundClass(alert.urgencyLevel)]">
                    <component :is="getUrgencyIcon(alert.urgencyLevel)"
                        :class="['h-4 w-4', getIconClass(alert.urgencyLevel)]" />
                </div>

                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {{ alert.productName }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                        SKU: {{ alert.sku }} • {{ alert.warehouseName }}
                    </p>
                    <div class="flex items-center mt-1 space-x-2">
                        <div class="flex items-center text-xs">
                            <span class="text-gray-500 dark:text-gray-400">Current:</span>
                            <span class="ml-1 font-medium text-gray-900 dark:text-white">{{ alert.currentStock }}</span>
                        </div>
                        <div class="flex items-center text-xs">
                            <span class="text-gray-500 dark:text-gray-400">Min:</span>
                            <span class="ml-1 font-medium text-gray-900 dark:text-white">{{ alert.minStock }}</span>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col items-end space-y-1">
                    <span
                        :class="['inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', getAlertBadgeClass(alert.urgencyLevel)]">
                        {{ alert.urgencyLevel }}
                    </span>
                    <button @click="handleRestock(alert)"
                        class="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                        <Plus class="h-3 w-3 mr-1" />
                        Restock
                    </button>
                </div>
            </div>
        </div>

        <div v-if="alerts.length > 5" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button @click="viewAllAlerts"
                class="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                View All {{ alerts.length }} Alerts
                <ArrowRight class="ml-2 h-4 w-4" />
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
    RefreshCw,
    AlertCircle,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Plus,
    ArrowRight,
    Package
} from 'lucide-vue-next'
import type { LowStockAlert } from '@/types/dashboard'

interface Props {
    data: LowStockAlert[]
    isLoading?: boolean
    error?: Error | null
}

const props = withDefaults(defineProps<Props>(), {
    isLoading: false,
    error: null
})

const emit = defineEmits<{
    refresh: []
    restock: [alert: LowStockAlert]
    viewAll: []
}>()

const alerts = computed(() => props.data || [])

const getUrgencyIcon = (urgency: LowStockAlert['urgencyLevel']) => {
    switch (urgency) {
        case 'CRITICAL':
            return XCircle
        case 'HIGH':
            return AlertTriangle
        case 'MEDIUM':
            return AlertCircle
        case 'LOW':
            return Package
        default:
            return Package
    }
}

const getIconClass = (urgency: LowStockAlert['urgencyLevel']) => {
    switch (urgency) {
        case 'CRITICAL':
            return 'text-red-600 dark:text-red-400'
        case 'HIGH':
            return 'text-orange-600 dark:text-orange-400'
        case 'MEDIUM':
            return 'text-yellow-600 dark:text-yellow-400'
        case 'LOW':
            return 'text-blue-600 dark:text-blue-400'
        default:
            return 'text-gray-600 dark:text-gray-400'
    }
}

const getIconBackgroundClass = (urgency: LowStockAlert['urgencyLevel']) => {
    switch (urgency) {
        case 'CRITICAL':
            return 'bg-red-100 dark:bg-red-900/20'
        case 'HIGH':
            return 'bg-orange-100 dark:bg-orange-900/20'
        case 'MEDIUM':
            return 'bg-yellow-100 dark:bg-yellow-900/20'
        case 'LOW':
            return 'bg-blue-100 dark:bg-blue-900/20'
        default:
            return 'bg-gray-100 dark:bg-gray-900/20'
    }
}

const getAlertBadgeClass = (urgency: LowStockAlert['urgencyLevel']) => {
    switch (urgency) {
        case 'CRITICAL':
            return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
        case 'HIGH':
            return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
        case 'MEDIUM':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
        case 'LOW':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
}

const refreshData = () => {
    emit('refresh')
}

const handleRestock = (alert: LowStockAlert) => {
    emit('restock', alert)
}

const viewAllAlerts = () => {
    emit('viewAll')
}
</script>
