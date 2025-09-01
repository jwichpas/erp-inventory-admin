<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Exchange Rate Impact</h3>
            <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-500 dark:text-gray-400">
                    Total Impact:
                    <span :class="[
                        'font-semibold',
                        totalImpact >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    ]">
                        {{ formatCurrency(totalImpact) }}
                    </span>
                </span>
                <button @click="refreshData" :disabled="isLoading"
                    class="inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">
                    <RefreshCw :class="['h-3 w-3', { 'animate-spin': isLoading }]" />
                </button>
            </div>
        </div>

        <div v-if="isLoading" class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        <div v-else-if="error" class="flex items-center justify-center h-64">
            <div class="text-center">
                <AlertCircle class="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p class="text-sm text-gray-500 dark:text-gray-400">Failed to load exchange rate data</p>
            </div>
        </div>

        <div v-else-if="!exchangeRateData.length" class="flex items-center justify-center h-64">
            <div class="text-center">
                <TrendingUp class="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p class="text-sm text-gray-500 dark:text-gray-400">No exchange rate data available</p>
            </div>
        </div>

        <div v-else>
            <!-- Chart -->
            <div class="mb-6">
                <apexchart type="bar" height="200" :options="chartOptions" :series="chartSeries" />
            </div>

            <!-- Exchange Rate Details -->
            <div class="space-y-3">
                <div v-for="rate in exchangeRateData" :key="rate.currencyCode"
                    class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div class="flex items-center space-x-3">
                        <div
                            class="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                            <span class="text-xs font-bold text-blue-600 dark:text-blue-400">
                                {{ rate.currencyCode }}
                            </span>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-900 dark:text-white">
                                {{ getCurrencyName(rate.currencyCode) }}
                            </p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                Current: {{ rate.currentRate.toFixed(4) }}
                            </p>
                        </div>
                    </div>

                    <div class="text-right">
                        <div class="flex items-center space-x-2">
                            <component :is="rate.difference >= 0 ? TrendingUp : TrendingDown" :class="[
                                'h-4 w-4',
                                rate.difference >= 0 ? 'text-green-500' : 'text-red-500'
                            ]" />
                            <span :class="[
                                'text-sm font-medium',
                                rate.difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            ]">
                                {{ rate.differencePercentage >= 0 ? '+' : '' }}{{ rate.differencePercentage.toFixed(2)
                                }}%
                            </span>
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {{ rate.difference >= 0 ? '+' : '' }}{{ rate.difference.toFixed(4) }}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RefreshCw, AlertCircle, TrendingUp, TrendingDown } from 'lucide-vue-next'
import VueApexCharts from 'vue3-apexcharts'
import type { ExchangeRateData } from '@/types/dashboard'

interface Props {
    data: ExchangeRateData[]
    totalImpact: number
    isLoading?: boolean
    error?: Error | null
}

const props = withDefaults(defineProps<Props>(), {
    isLoading: false,
    error: null,
    totalImpact: 0
})

const emit = defineEmits<{
    refresh: []
}>()

const exchangeRateData = computed(() => props.data || [])

const chartSeries = computed(() => [
    {
        name: 'Rate Change %',
        data: exchangeRateData.value.map(rate => ({
            x: rate.currencyCode,
            y: rate.differencePercentage
        }))
    }
])

const chartOptions = computed(() => ({
    chart: {
        type: 'bar',
        toolbar: {
            show: false
        },
        background: 'transparent'
    },
    theme: {
        mode: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    },
    colors: exchangeRateData.value.map(rate =>
        rate.differencePercentage >= 0 ? '#10B981' : '#EF4444'
    ),
    plotOptions: {
        bar: {
            horizontal: false,
            columnWidth: '60%',
            borderRadius: 4
        }
    },
    grid: {
        borderColor: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB',
        strokeDashArray: 3,
        yaxis: {
            lines: {
                show: true
            }
        },
        xaxis: {
            lines: {
                show: false
            }
        }
    },
    xaxis: {
        type: 'category',
        labels: {
            style: {
                colors: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280'
            }
        },
        axisBorder: {
            show: false
        },
        axisTicks: {
            show: false
        }
    },
    yaxis: {
        title: {
            text: 'Change (%)',
            style: {
                color: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280'
            }
        },
        labels: {
            style: {
                colors: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280'
            },
            formatter: (value: number) => `${value.toFixed(1)}%`
        }
    },
    tooltip: {
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
        y: {
            formatter: (value: number) => `${value.toFixed(2)}%`
        }
    },
    dataLabels: {
        enabled: false
    }
}))

const getCurrencyName = (code: string) => {
    const currencyNames: Record<string, string> = {
        'USD': 'US Dollar',
        'EUR': 'Euro',
        'PEN': 'Peruvian Sol',
        'CLP': 'Chilean Peso',
        'COP': 'Colombian Peso',
        'BRL': 'Brazilian Real'
    }
    return currencyNames[code] || code
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
