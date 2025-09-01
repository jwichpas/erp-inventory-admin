<template>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <div class="mb-8">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                        <p class="text-gray-600 dark:text-gray-400 mt-1">
                            Welcome back! Here's what's happening with your business.
                        </p>
                    </div>
                    <div class="flex items-center space-x-3">
                        <button @click="refreshAllData" :disabled="isRefreshing"
                            class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                            <RefreshCw :class="['h-4 w-4 mr-2', { 'animate-spin': isRefreshing }]" />
                            Refresh All
                        </button>
                        <button @click="refreshMaterializedViews" :disabled="isRefreshingViews"
                            class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                            <Database :class="['h-4 w-4 mr-2', { 'animate-spin': isRefreshingViews }]" />
                            Refresh Views
                        </button>
                    </div>
                </div>
            </div>

            <!-- Metrics Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <DashboardCard title="Total Sales" :value="formatCurrency(dashboardMetrics.totalSales)"
                    :change="dashboardMetrics.totalSalesGrowth" :icon="TrendingUp" />

                <DashboardCard title="Inventory Value" :value="formatCurrency(dashboardMetrics.inventoryValue)"
                    :change="dashboardMetrics.inventoryValueGrowth" :icon="Package" />

                <DashboardCard title="Low Stock Items" :value="dashboardMetrics.lowStockItems.toString()"
                    :icon="AlertTriangle">
                    <template #footer>
                        <button v-if="dashboardMetrics.lowStockItems > 0" @click="viewLowStockDetails"
                            class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">
                            View Details →
                        </button>
                    </template>
                </DashboardCard>

                <DashboardCard title="Exchange Rate Impact"
                    :value="formatCurrency(dashboardMetrics.exchangeRateDifference)"
                    :change="getExchangeRateChangePercentage()" change-unit="" change-label="unrealized gain/loss"
                    :icon="DollarSign" />
            </div>

            <!-- Charts and Widgets Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <!-- Sales Growth Chart -->
                <div class="lg:col-span-2">
                    <SalesGrowthChart :data="salesGrowthData" :is-loading="salesAnalysisLoading"
                        :error="salesAnalysisError" @refresh="refetchSalesAnalysis" />
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Inventory Value Widget -->
                <InventoryValueWidget :data="inventoryValueData" :is-loading="warehouseStockLoading"
                    :error="warehouseStockError" @refresh="refetchWarehouseStock" />

                <!-- Low Stock Alerts -->
                <LowStockAlerts :data="lowStockAlerts" :is-loading="warehouseStockLoading" :error="warehouseStockError"
                    @refresh="refetchWarehouseStock" @restock="handleRestock" @view-all="viewAllLowStockAlerts" />

                <!-- Exchange Rate Chart -->
                <ExchangeRateChart :data="exchangeRateData" 
                    :total-impact="typeof dashboardMetrics.exchangeRateDifference === 'number' ? dashboardMetrics.exchangeRateDifference : 0"
                    :is-loading="exchangeRatesLoading" :error="exchangeRatesError" @refresh="refetchExchangeRates" />
            </div>

            <!-- Error Toast -->
            <div v-if="hasErrors"
                class="fixed bottom-4 right-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-lg max-w-sm">
                <div class="flex items-start">
                    <AlertCircle class="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
                            Data Loading Error
                        </h3>
                        <p class="text-sm text-red-700 dark:text-red-300 mt-1">
                            Some dashboard data failed to load. Please try refreshing.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
    RefreshCw,
    Database,
    TrendingUp,
    Package,
    AlertTriangle,
    DollarSign,
    AlertCircle
} from 'lucide-vue-next'
import { useDashboard } from '@/composables/useDashboard'
import { useErrorHandler } from '@/composables/useErrorHandler'
import DashboardCard from '@/components/dashboard/DashboardCard.vue'
import SalesGrowthChart from '@/components/dashboard/SalesGrowthChart.vue'
import InventoryValueWidget from '@/components/dashboard/InventoryValueWidget.vue'
import LowStockAlerts from '@/components/dashboard/LowStockAlerts.vue'
import ExchangeRateChart from '@/components/dashboard/ExchangeRateChart.vue'
import type { LowStockAlert } from '@/types/dashboard'

const router = useRouter()
const { handleError } = useErrorHandler()

const {
    // Data
    dashboardMetrics,
    salesGrowthData,
    inventoryValueData,
    lowStockAlerts,
    exchangeRateData,

    // Loading states
    salesAnalysisLoading,
    warehouseStockLoading,
    inventoryRevaluationLoading,
    exchangeRatesLoading,
    exchangeRateDifferenceLoading,

    // Errors
    salesAnalysisError,
    warehouseStockError,
    inventoryRevaluationError,
    exchangeRatesError,
    exchangeRateDifferenceError,

    // Actions
    refreshMaterializedViews,
    refetchSalesAnalysis,
    refetchWarehouseStock,
    refetchInventoryRevaluation,
    refetchExchangeRates,
    refetchExchangeRateDifference
} = useDashboard()

const isRefreshing = ref(false)
const isRefreshingViews = ref(false)

const hasErrors = computed(() => {
    return !!(
        salesAnalysisError.value ||
        warehouseStockError.value ||
        inventoryRevaluationError.value ||
        exchangeRatesError.value ||
        exchangeRateDifferenceError.value
    )
})

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value)
}

const getExchangeRateChangePercentage = () => {
    // Calculate percentage change based on exchange rate data
    if (!exchangeRateData.value.length) return 0

    const totalChange = exchangeRateData.value.reduce(
        (sum, rate) => sum + rate.differencePercentage, 0
    )

    return totalChange / exchangeRateData.value.length
}

const refreshAllData = async () => {
    isRefreshing.value = true
    try {
        await Promise.all([
            refetchSalesAnalysis(),
            refetchWarehouseStock(),
            refetchInventoryRevaluation(),
            refetchExchangeRates(),
            refetchExchangeRateDifference()
        ])
    } catch (error) {
        handleError(error as Error)
    } finally {
        isRefreshing.value = false
    }
}

const refreshMaterializedViewsHandler = async () => {
    isRefreshingViews.value = true
    try {
        await refreshMaterializedViews()
    } catch (error) {
        handleError(error as Error)
    } finally {
        isRefreshingViews.value = false
    }
}

const handleRestock = (alert: LowStockAlert) => {
    // Navigate to inventory management with pre-filled product
    router.push({
        name: 'inventory',
        query: {
            product: alert.productId,
            action: 'restock'
        }
    })
}

const viewLowStockDetails = () => {
    router.push({ name: 'inventory', query: { filter: 'low-stock' } })
}

const viewAllLowStockAlerts = () => {
    router.push({ name: 'inventory', query: { filter: 'low-stock' } })
}
</script>
