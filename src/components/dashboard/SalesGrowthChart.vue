<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Sales Growth</h3>
            <button @click="refreshData" :disabled="isLoading"
                class="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                <RefreshCw :class="['h-4 w-4 mr-1', { 'animate-spin': isLoading }]" />
                Refresh
            </button>
        </div>

        <div v-if="isLoading" class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        <div v-else-if="error" class="flex items-center justify-center h-64">
            <div class="text-center">
                <AlertCircle class="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p class="text-sm text-gray-500 dark:text-gray-400">Failed to load chart data</p>
            </div>
        </div>

        <div v-else-if="!chartData.length" class="flex items-center justify-center h-64">
            <div class="text-center">
                <BarChart3 class="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p class="text-sm text-gray-500 dark:text-gray-400">No sales data available</p>
            </div>
        </div>

        <div v-else>
            <apexchart type="line" height="300" :options="chartOptions" :series="chartSeries" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { RefreshCw, AlertCircle, BarChart3 } from 'lucide-vue-next'
import VueApexCharts from 'vue3-apexcharts'
import dayjs from 'dayjs'
import type { SalesGrowthData } from '@/types/dashboard'

interface Props {
    data: SalesGrowthData[]
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

const chartData = computed(() => props.data || [])

const chartSeries = computed(() => [
    {
        name: 'Sales',
        data: chartData.value.map(item => ({
            x: dayjs(item.period).format('MMM YYYY'),
            y: item.sales
        }))
    },
    {
        name: 'Growth Rate',
        data: chartData.value.map(item => ({
            x: dayjs(item.period).format('MMM YYYY'),
            y: item.growth
        }))
    }
])

const chartOptions = computed(() => ({
    chart: {
        type: 'line',
        toolbar: {
            show: true,
            tools: {
                download: true,
                selection: false,
                zoom: false,
                zoomin: false,
                zoomout: false,
                pan: false,
                reset: false
            }
        },
        background: 'transparent'
    },
    theme: {
        mode: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    },
    colors: ['#3B82F6', '#10B981'],
    stroke: {
        curve: 'smooth',
        width: 3
    },
    grid: {
        borderColor: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB',
        strokeDashArray: 3
    },
    xaxis: {
        type: 'category',
        labels: {
            style: {
                colors: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280'
            }
        },
        axisBorder: {
            color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB'
        },
        axisTicks: {
            color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB'
        }
    },
    yaxis: [
        {
            title: {
                text: 'Sales Amount',
                style: {
                    color: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280'
                }
            },
            labels: {
                style: {
                    colors: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280'
                },
                formatter: (value: number) => {
                    return new Intl.NumberFormat('es-PE', {
                        style: 'currency',
                        currency: 'PEN',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(value)
                }
            }
        },
        {
            opposite: true,
            title: {
                text: 'Growth Rate (%)',
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
        }
    ],
    tooltip: {
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
        y: [
            {
                formatter: (value: number) => {
                    return new Intl.NumberFormat('es-PE', {
                        style: 'currency',
                        currency: 'PEN'
                    }).format(value)
                }
            },
            {
                formatter: (value: number) => `${value.toFixed(2)}%`
            }
        ]
    },
    legend: {
        labels: {
            colors: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280'
        }
    },
    dataLabels: {
        enabled: false
    }
}))

const refreshData = () => {
    emit('refresh')
}

// Watch for dark mode changes and update chart
watch(
    () => document.documentElement.classList.contains('dark'),
    () => {
        // Force chart re-render on theme change
        // This is handled by the computed chartOptions
    }
)
</script>
