<template>
  <div class="space-y-6">
    <!-- Encabezado con controles -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            Análisis de Compras
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Métricas y reportes del proceso de compras
          </p>
        </div>
        
        <div class="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            @click="$emit('refresh')"
            :disabled="loading"
            class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw :class="['h-4 w-4 mr-2', loading && 'animate-spin']" />
            Actualizar
          </button>
          
          <button
            @click="showExportModal = true"
            class="inline-flex items-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium"
          >
            <Download class="h-4 w-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      <!-- Filtros de fecha -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Desde
          </label>
          <input
            v-model="dateRange.from"
            type="date"
            @change="applyDateFilter"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Hasta
          </label>
          <input
            v-model="dateRange.to"
            type="date"
            @change="applyDateFilter"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Período Rápido
          </label>
          <select
            v-model="quickPeriod"
            @change="applyQuickPeriod"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Personalizado</option>
            <option value="last7days">Últimos 7 días</option>
            <option value="last30days">Últimos 30 días</option>
            <option value="last3months">Últimos 3 meses</option>
            <option value="last6months">Últimos 6 meses</option>
            <option value="currentyear">Año actual</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>

    <!-- Analytics Content -->
    <div v-else-if="analytics" class="space-y-6">
      <!-- KPIs principales -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <ShoppingCart class="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Órdenes
              </p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-white">
                {{ analytics.totals.orders }}
              </p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <FileText class="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                Documentos
              </p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-white">
                {{ analytics.totals.documents }}
              </p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <Package class="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                Recepciones
              </p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-white">
                {{ analytics.totals.receptions }}
              </p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <DollarSign class="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Comprado
              </p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-white">
                {{ formatCurrency(analytics.totals.amount) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Gráficos -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Gráfico de compras por mes -->
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Compras por Mes
          </h4>
          <div class="h-64">
            <!-- Aquí iría un componente de gráfico, por ejemplo Chart.js o similar -->
            <div class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <div class="text-center">
                <BarChart class="h-12 w-12 mx-auto mb-2" />
                <p class="text-sm">Gráfico de barras</p>
                <p class="text-xs">Compras mensuales</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Gráfico de estado de órdenes -->
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Estado de Órdenes
          </h4>
          <div class="h-64">
            <div class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <div class="text-center">
                <PieChart class="h-12 w-12 mx-auto mb-2" />
                <p class="text-sm">Gráfico circular</p>
                <p class="text-xs">Distribución por estado</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top proveedores -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Top Proveedores
        </h4>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Proveedor
                </th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Órdenes
                </th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total
                </th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Promedio
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="supplier in analytics.topSuppliers" :key="supplier.id">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <Building class="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ supplier.name }}
                      </div>
                      <div class="text-sm text-gray-500 dark:text-gray-400">
                        {{ supplier.document }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white">
                  {{ supplier.ordersCount }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 dark:text-white">
                  {{ formatCurrency(supplier.totalAmount) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white">
                  {{ formatCurrency(supplier.averageAmount) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Métricas de rendimiento -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Tiempo Promedio
          </h4>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600 dark:text-gray-400">Orden → Documento</span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                {{ analytics.averageTimes.orderToDoc }} días
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600 dark:text-gray-400">Documento → Recepción</span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                {{ analytics.averageTimes.docToReception }} días
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600 dark:text-gray-400">Proceso completo</span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                {{ analytics.averageTimes.fullProcess }} días
              </span>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Tasas de Cumplimiento
          </h4>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600 dark:text-gray-400">Órdenes aprobadas</span>
              <span class="text-sm font-medium text-green-600 dark:text-green-400">
                {{ analytics.rates.orderApproval }}%
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600 dark:text-gray-400">Recepciones completas</span>
              <span class="text-sm font-medium text-green-600 dark:text-green-400">
                {{ analytics.rates.completeReception }}%
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600 dark:text-gray-400">Entregas puntuales</span>
              <span class="text-sm font-medium text-green-600 dark:text-green-400">
                {{ analytics.rates.onTimeDelivery }}%
              </span>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Alertas y Pendientes
          </h4>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600 dark:text-gray-400">Órdenes pendientes</span>
              <span class="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                {{ analytics.pending.orders }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600 dark:text-gray-400">Recepciones parciales</span>
              <span class="text-sm font-medium text-orange-600 dark:text-orange-400">
                {{ analytics.pending.partialReceptions }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600 dark:text-gray-400">Entregas atrasadas</span>
              <span class="text-sm font-medium text-red-600 dark:text-red-400">
                {{ analytics.pending.overdueDeliveries }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Estado vacío -->
    <div v-else class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div class="text-center">
        <TrendingUp class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          No hay datos disponibles
        </h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Los análisis aparecerán aquí cuando haya datos de compras disponibles.
        </p>
      </div>
    </div>

    <!-- Modal de exportación -->
    <div v-if="showExportModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="showExportModal = false"></div>
        
        <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
          <div>
            <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Exportar Reporte
            </h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tipo de reporte
                </label>
                <select
                  v-model="exportConfig.type"
                  class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="summary">Resumen ejecutivo</option>
                  <option value="detailed">Reporte detallado</option>
                  <option value="suppliers">Por proveedores</option>
                  <option value="performance">Métricas de rendimiento</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Formato
                </label>
                <select
                  v-model="exportConfig.format"
                  class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="mt-6 flex items-center justify-end space-x-3">
            <button
              @click="showExportModal = false"
              class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              @click="handleExport"
              class="inline-flex items-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium"
            >
              <Download class="h-4 w-4 mr-2" />
              Exportar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  RefreshCw,
  Download,
  ShoppingCart,
  FileText,
  Package,
  DollarSign,
  BarChart,
  PieChart,
  Building,
  TrendingUp
} from 'lucide-vue-next'

// Props
interface Props {
  analytics: any // TODO: Definir tipo específico para analytics
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
defineEmits<{
  refresh: []
  export: [type: string, format: string]
}>()

// State
const dateRange = ref({
  from: '',
  to: ''
})
const quickPeriod = ref('')
const showExportModal = ref(false)
const exportConfig = ref({
  type: 'summary',
  format: 'pdf'
})

// Methods
const formatCurrency = (amount: number, currency = 'PEN') => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount)
}

const applyDateFilter = () => {
  // TODO: Implementar filtro por fecha
  quickPeriod.value = ''
}

const applyQuickPeriod = () => {
  if (!quickPeriod.value) return
  
  const now = new Date()
  let fromDate = new Date()
  
  switch (quickPeriod.value) {
    case 'last7days':
      fromDate.setDate(now.getDate() - 7)
      break
    case 'last30days':
      fromDate.setDate(now.getDate() - 30)
      break
    case 'last3months':
      fromDate.setMonth(now.getMonth() - 3)
      break
    case 'last6months':
      fromDate.setMonth(now.getMonth() - 6)
      break
    case 'currentyear':
      fromDate = new Date(now.getFullYear(), 0, 1)
      break
  }
  
  dateRange.value.from = fromDate.toISOString().split('T')[0]
  dateRange.value.to = now.toISOString().split('T')[0]
}

const handleExport = () => {
  $emit('export', exportConfig.value.type, exportConfig.value.format)
  showExportModal.value = false
}

// Lifecycle
onMounted(() => {
  // Establecer período por defecto (últimos 3 meses)
  quickPeriod.value = 'last3months'
  applyQuickPeriod()
})
</script>