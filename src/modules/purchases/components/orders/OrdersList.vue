<template>
  <div class="space-y-4">
    <!-- Encabezado -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          Órdenes de Compra
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Gestione las órdenes de compra de su empresa
        </p>
      </div>
      
      <div class="flex items-center space-x-3">
        <button
          @click="$emit('refresh')"
          :disabled="loading"
          class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          <RefreshCw :class="['h-4 w-4 mr-2', loading && 'animate-spin']" />
          Actualizar
        </button>
        
        <button
          @click="$emit('create')"
          class="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium"
        >
          <Plus class="h-4 w-4 mr-2" />
          Nueva Orden
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Búsqueda -->
        <div>
          <label class="sr-only">Buscar</label>
          <div class="relative">
            <Search class="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              :value="filters.search"
              @input="$emit('filter', { search: ($event.target as HTMLInputElement).value })"
              type="text"
              placeholder="Buscar órdenes..."
              class="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <!-- Proveedor -->
        <div>
          <select
            :value="filters.supplier_id"
            @change="$emit('filter', { supplier_id: ($event.target as HTMLSelectElement).value })"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Todos los proveedores</option>
            <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
              {{ supplier.name }}
            </option>
          </select>
        </div>

        <!-- Estado -->
        <div>
          <select
            :value="filters.status"
            @change="$emit('filter', { status: ($event.target as HTMLSelectElement).value })"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="APPROVED">Aprobada</option>
            <option value="REJECTED">Rechazada</option>
            <option value="RECEIVED">Recibida</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </div>

        <!-- Moneda -->
        <div>
          <select
            :value="filters.currency_code"
            @change="$emit('filter', { currency_code: ($event.target as HTMLSelectElement).value })"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Todas las monedas</option>
            <option value="PEN">Soles (PEN)</option>
            <option value="USD">Dólares (USD)</option>
            <option value="EUR">Euros (EUR)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Lista de órdenes -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div v-if="loading" class="p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="mt-2 text-gray-600 dark:text-gray-400">Cargando órdenes...</p>
      </div>

      <div v-else-if="orders.length === 0" class="p-8 text-center">
        <ShoppingCart class="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No hay órdenes de compra
        </h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          Comience creando una nueva orden de compra
        </p>
        <button
          @click="$emit('create')"
          class="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          <Plus class="h-4 w-4 mr-2" />
          Nueva Orden
        </button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Orden
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Proveedor
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Fecha
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Total
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Estado
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Items
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="order in orders"
              :key="order.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <ShoppingCart class="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <div class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ order.order_number }}
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                      {{ formatDate(order.order_date) }}
                    </div>
                  </div>
                </div>
              </td>

              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900 dark:text-white">
                  {{ order.supplier_name }}
                </div>
              </td>

              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900 dark:text-white">
                  {{ formatDate(order.order_date) }}
                </div>
                <div v-if="order.expected_date" class="text-xs text-gray-500 dark:text-gray-400">
                  Esperada: {{ formatDate(order.expected_date) }}
                </div>
              </td>

              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ formatCurrency(order.total, order.currency_code) }}
                </div>
              </td>

              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                    getStatusClasses(order.status)
                  ]"
                >
                  {{ getStatusLabel(order.status) }}
                </span>
              </td>

              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900 dark:text-white">
                  {{ order.items_count }} items
                </div>
              </td>

              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-2">
                  <button
                    @click="$emit('view', order.id)"
                    class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                    title="Ver detalles"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  
                  <button
                    v-if="order.can_edit"
                    @click="$emit('edit', order.id)"
                    class="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                    title="Editar"
                  >
                    <Edit class="h-4 w-4" />
                  </button>
                  
                  <button
                    v-if="order.can_approve"
                    @click="$emit('approve', order.id)"
                    class="text-green-600 hover:text-green-900 dark:text-green-400"
                    title="Aprobar"
                  >
                    <Check class="h-4 w-4" />
                  </button>
                  
                  <button
                    @click="$emit('duplicate', order.id)"
                    class="text-gray-600 hover:text-gray-900 dark:text-gray-400"
                    title="Duplicar"
                  >
                    <Copy class="h-4 w-4" />
                  </button>
                  
                  <button
                    v-if="order.can_receive"
                    @click="$emit('createDoc', order.id)"
                    class="text-purple-600 hover:text-purple-900 dark:text-purple-400"
                    title="Crear documento"
                  >
                    <FileText class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Paginación -->
    <div v-if="pagination.total > 0" class="flex items-center justify-between">
      <div class="text-sm text-gray-700 dark:text-gray-300">
        Mostrando {{ startIndex + 1 }} a {{ Math.min(startIndex + filters.limit, pagination.total) }} 
        de {{ pagination.total }} órdenes
      </div>
      <div class="flex space-x-2">
        <button
          @click="$emit('page', filters.page - 1)"
          :disabled="!pagination.hasPrevious"
          class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          Anterior
        </button>
        <button
          @click="$emit('page', filters.page + 1)"
          :disabled="!pagination.hasNext"
          class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          Siguiente
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Search,
  Plus,
  ShoppingCart,
  Eye,
  Edit,
  Check,
  Copy,
  FileText,
  RefreshCw
} from 'lucide-vue-next'

import type { PurchaseOrderListItem, PurchaseOrderFilters } from '../../types'
import { StatusLabels, StatusColors } from '../../types'

// Props
interface Props {
  orders: PurchaseOrderListItem[]
  loading?: boolean
  filters: PurchaseOrderFilters
  pagination: {
    total: number
    hasNext: boolean
    hasPrevious: boolean
  }
  suppliers: Array<{ id: string; name: string }>
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
defineEmits<{
  refresh: []
  create: []
  view: [id: string]
  edit: [id: string]
  approve: [id: string]
  duplicate: [id: string]
  createDoc: [id: string]
  filter: [filters: Partial<PurchaseOrderFilters>]
  page: [page: number]
}>()

// Computed
const startIndex = computed(() => ((props.filters.page || 1) - 1) * (props.filters.limit || 20))

// Métodos
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatCurrency = (amount: number, currency = 'PEN') => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount)
}

const getStatusLabel = (status: string) => {
  return StatusLabels[status as keyof typeof StatusLabels] || status
}

const getStatusClasses = (status: string) => {
  return StatusColors[status as keyof typeof StatusColors] || 'bg-gray-100 text-gray-800'
}
</script>