<template>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <div class="mb-8">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Demo</h1>
                        <p class="text-gray-600 dark:text-gray-400 mt-1">
                            Demo dashboard with mock data to test components.
                        </p>
                    </div>
                    <div class="flex items-center space-x-3">
                        <button @click="refreshData"
                            class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            <RefreshCw class="h-4 w-4 mr-2" />
                            Refresh Demo Data
                        </button>
                    </div>
                </div>
            </div>

            <!-- Metrics Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <DashboardCard title="Total Sales" value="S/ 125,000" :change="15.5" :icon="TrendingUp" />

                <DashboardCard title="Inventory Value" value="S/ 18,300" :change="2.3" :icon="Package" />

                <DashboardCard title="Low Stock Items" value="2" :icon="AlertTriangle">
                    <template #footer>
                        <button
                            class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">
                            View Details →
                        </button>
                    </template>
                </DashboardCard>

                <DashboardCard title="Exchange Rate Impact" value="S/ 1,125" :change="0.8" change-unit=""
                    change-label="unrealized gain/loss" :icon="DollarSign" />
            </div>

            <!-- Charts and Widgets Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <!-- Sales Growth Chart -->
                <div class="lg:col-span-2">
                    <SalesGrowthChart :data="salesGrowthData" :is-loading="false" :error="null"
                        @refresh="refreshData" />
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Inventory Value Widget -->
                <InventoryValueWidget :data="inventoryValueData" :is-loading="false" :error="null"
                    @refresh="refreshData" />

                <!-- Low Stock Alerts -->
                <LowStockAlerts :data="lowStockAlerts" :is-loading="false" :error="null" @refresh="refreshData"
                    @restock="handleRestock" @view-all="viewAllLowStockAlerts" />

                <!-- Exchange Rate Chart -->
                <ExchangeRateChart :data="exchangeRateData" :total-impact="1125" :is-loading="false" :error="null"
                    @refresh="refreshData" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
    RefreshCw,
    TrendingUp,
    Package,
    AlertTriangle,
    DollarSign
} from 'lucide-vue-next'
import DashboardCard from '@/components/dashboard/DashboardCard.vue'
import SalesGrowthChart from '@/components/dashboard/SalesGrowthChart.vue'
import InventoryValueWidget from '@/components/dashboard/InventoryValueWidget.vue'
import LowStockAlerts from '@/components/dashboard/LowStockAlerts.vue'
import ExchangeRateChart from '@/components/dashboard/ExchangeRateChart.vue'
import type { SalesGrowthData, InventoryValueData, LowStockAlert, ExchangeRateData } from '@/types/dashboard'
import {
    mockSalesAnalysis,
    mockWarehouseStock,
    mockExchangeRates
} from '@/data/mockDashboardData'

// Transform mock data for components
const salesGrowthData = computed((): SalesGrowthData[] => {
    return mockSalesAnalysis.map(item => ({
        period: item.period,
        sales: item.total_sales,
        growth: item.growth_rate
    }))
})

const inventoryValueData = computed((): InventoryValueData[] => {
    const warehouseMap = new Map<string, InventoryValueData>()

    mockWarehouseStock.forEach(item => {
        const existing = warehouseMap.get(item.warehouse_id)
        if (existing) {
            existing.totalValue += item.total_value
            existing.totalItems += 1
        } else {
            warehouseMap.set(item.warehouse_id, {
                warehouseId: item.warehouse_id,
                warehouseName: item.warehouse_name,
                totalValue: item.total_value,
                totalItems: 1
            })
        }
    })

    return Array.from(warehouseMap.values())
})

const lowStockAlerts = computed((): LowStockAlert[] => {
    return mockWarehouseStock
        .filter(item => item.current_qty <= item.min_stock)
        .map(item => {
            const stockRatio = item.current_qty / item.min_stock
            let urgencyLevel: LowStockAlert['urgencyLevel'] = 'LOW'

            if (stockRatio <= 0) urgencyLevel = 'CRITICAL'
            else if (stockRatio <= 0.25) urgencyLevel = 'HIGH'
            else if (stockRatio <= 0.5) urgencyLevel = 'MEDIUM'

            return {
                productId: item.product_id,
                productName: item.product_name,
                sku: item.sku,
                currentStock: item.current_qty,
                minStock: item.min_stock,
                warehouseName: item.warehouse_name,
                urgencyLevel
            }
        })
        .sort((a, b) => {
            const urgencyOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
            return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel]
        })
})

const exchangeRateData = computed((): ExchangeRateData[] => {
    const rateMap = new Map<string, typeof mockExchangeRates>()

    mockExchangeRates.forEach(rate => {
        const existing = rateMap.get(rate.currency_code) || []
        existing.push(rate)
        rateMap.set(rate.currency_code, existing)
    })

    return Array.from(rateMap.entries()).map(([currencyCode, rates]) => {
        const sortedRates = rates.sort((a, b) =>
            new Date(b.rate_date).getTime() - new Date(a.rate_date).getTime()
        )

        const current = sortedRates[0]
        const previous = sortedRates[1]

        const difference = previous ? current.rate - previous.rate : 0
        const differencePercentage = previous ? (difference / previous.rate) * 100 : 0

        return {
            currencyCode,
            currentRate: current.rate,
            previousRate: previous?.rate || 0,
            difference,
            differencePercentage,
            impactAmount: 0
        }
    })
})

const refreshData = () => {
    console.log('Refreshing demo data...')
    // In a real implementation, this would refetch data
}

const handleRestock = (alert: LowStockAlert) => {
    console.log('Restock requested for:', alert.productName)
    // In a real implementation, this would navigate to inventory management
}

const viewAllLowStockAlerts = () => {
    console.log('View all low stock alerts')
    // In a real implementation, this would navigate to inventory with filter
}
</script>
