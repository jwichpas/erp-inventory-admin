<template>
  <div class="space-y-4">
    <!-- Encabezado con filtros -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">
          Documentos de Compra
        </h3>
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
            @click="$emit('create')"
            class="inline-flex items-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium"
          >
            <Plus class="h-4 w-4 mr-2" />
            Nuevo Documento
          </button>
        </div>
      </div>

      <!-- Filtros -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Búsqueda -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Buscar
          </label>
          <div class="mt-1 relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Número, serie, proveedor..."
              @input="debouncedSearch"
              class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <Search class="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>

        <!-- Estado -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Estado
          </label>
          <select
            v-model="statusFilter"
            @change="applyFilters"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="PARTIALLY_RECEIVED">Parcialmente Recibido</option>
            <option value="RECEIVED">Recibido</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>

        <!-- Proveedor -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Proveedor
          </label>
          <select
            v-model="supplierFilter"
            @change="applyFilters"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Todos los proveedores</option>
            <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
              {{ supplier.name }}
            </option>
          </select>
        </div>

        <!-- Fecha -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Fecha
          </label>
          <input
            v-model="dateFilter"
            type="date"
            @change="applyFilters"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>

    <!-- Lista de documentos -->
    <div v-else-if="docs.length > 0" class="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Documento
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Proveedor
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Fecha
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Total
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Estado
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="doc in docs" :key="doc.id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <FileText class="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ doc.doc_type }}-{{ doc.series }}-{{ doc.number }}
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                      {{ doc.id.slice(0, 8) }}...
                    </div>
                  </div>
                </div>
              </td>

              <td class="px-6 py-4 whitespace-nowrap">
                <div v-if="doc.supplier">
                  <div class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ doc.supplier.fullname }}
                  </div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">
                    {{ doc.supplier.doc_type }}: {{ doc.supplier.doc_number }}
                  </div>
                </div>
                <div v-else class="text-sm text-gray-400">
                  Sin proveedor
                </div>
              </td>

              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {{ formatDate(doc.issue_date) }}
              </td>

              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ formatCurrency(doc.total_amount, doc.currency_code) }}
                </div>
                <div v-if="doc.currency_code !== 'PEN'" class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatCurrency(doc.total_amount * (doc.exchange_rate || 1), 'PEN') }}
                </div>
              </td>

              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                    getStatusClasses(doc.status)
                  ]"
                >
                  {{ getStatusLabel(doc.status) }}
                </span>
              </td>

              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-2">
                  <button
                    @click="$emit('view', doc.id)"
                    class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                    title="Ver documento"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  
                  <button
                    v-if="canEdit(doc)"
                    @click="$emit('edit', doc.id)"
                    class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    title="Editar documento"
                  >
                    <Edit class="h-4 w-4" />
                  </button>
                  
                  <button
                    v-if="canMarkReceived(doc)"
                    @click="$emit('markReceived', doc.id)"
                    class="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                    title="Marcar como recibido"
                  >
                    <Check class="h-4 w-4" />
                  </button>
                  
                  <button
                    v-if="canCreateReception(doc)"
                    @click="$emit('createReception', doc.id)"
                    class="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                    title="Crear recepción"
                  >
                    <Package class="h-4 w-4" />
                  </button>

                  <!-- Menú de acciones adicionales -->
                  <div class="relative" v-if="hasAdditionalActions(doc)">
                    <button
                      @click="toggleActionMenu(doc.id)"
                      class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <MoreHorizontal class="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Estado vacío -->
    <div v-else class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div class="text-center">
        <FileText class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          No hay documentos
        </h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Comience creando un nuevo documento de compra.
        </p>
        <div class="mt-6">
          <button
            @click="$emit('create')"
            class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus class="h-4 w-4 mr-2" />
            Nuevo Documento
          </button>
        </div>
      </div>
    </div>

    <!-- Paginación -->
    <div v-if="pagination.total > 0" class="bg-white dark:bg-gray-800 shadow rounded-lg px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            @click="$emit('page', pagination.page - 1)"
            :disabled="pagination.page <= 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <button
            @click="$emit('page', pagination.page + 1)"
            :disabled="pagination.page >= Math.ceil(pagination.total / pagination.limit)"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
        
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700 dark:text-gray-300">
              Mostrando
              <span class="font-medium">{{ (pagination.page - 1) * pagination.limit + 1 }}</span>
              a
              <span class="font-medium">{{ Math.min(pagination.page * pagination.limit, pagination.total) }}</span>
              de
              <span class="font-medium">{{ pagination.total }}</span>
              documentos
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                @click="$emit('page', pagination.page - 1)"
                :disabled="pagination.page <= 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft class="h-5 w-5" />
              </button>
              
              <button
                v-for="page in getVisiblePages()"
                :key="page"
                @click="$emit('page', page)"
                :class="[
                  'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                  page === pagination.page
                    ? 'z-10 bg-indigo-50 dark:bg-indigo-900 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                ]"
              >
                {{ page }}
              </button>
              
              <button
                @click="$emit('page', pagination.page + 1)"
                :disabled="pagination.page >= Math.ceil(pagination.total / pagination.limit)"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight class="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  FileText,
  RefreshCw,
  Plus,
  Search,
  Eye,
  Edit,
  Check,
  Package,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-vue-next'

import type { PurchaseDocListItem, DocumentFilters, PaginationInfo } from '../../types'

// Props
interface Props {
  docs: PurchaseDocListItem[]
  loading?: boolean
  filters: DocumentFilters
  pagination: PaginationInfo
  suppliers?: Array<{ id: string; name: string }>
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  suppliers: () => []
})

// Emits
defineEmits<{
  refresh: []
  create: []
  view: [id: string]
  edit: [id: string]
  markReceived: [id: string]
  createReception: [id: string]
  filter: [filters: Partial<DocumentFilters>]
  page: [page: number]
}>()

// State
const searchQuery = ref(props.filters.search || '')
const statusFilter = ref(props.filters.status || '')
const supplierFilter = ref(props.filters.supplier_id || '')
const dateFilter = ref(props.filters.date || '')

let debounceTimer: NodeJS.Timeout

// Methods
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
  const labels: Record<string, string> = {
    'PENDING': 'Pendiente',
    'PARTIALLY_RECEIVED': 'Parcialmente Recibido',
    'RECEIVED': 'Recibido',
    'CANCELLED': 'Cancelado'
  }
  return labels[status] || status
}

const getStatusClasses = (status: string) => {
  const classes: Record<string, string> = {
    'PENDING': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'PARTIALLY_RECEIVED': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'RECEIVED': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'CANCELLED': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const canEdit = (doc: PurchaseDocListItem) => {
  return doc.status !== 'RECEIVED' && doc.status !== 'CANCELLED'
}

const canMarkReceived = (doc: PurchaseDocListItem) => {
  return doc.status === 'PENDING' || doc.status === 'PARTIALLY_RECEIVED'
}

const canCreateReception = (doc: PurchaseDocListItem) => {
  return doc.status === 'PENDING' || doc.status === 'PARTIALLY_RECEIVED'
}

const hasAdditionalActions = (doc: PurchaseDocListItem) => {
  return false // Placeholder for additional actions
}

const toggleActionMenu = (id: string) => {
  // TODO: Implementar menú de acciones adicionales
}

const debouncedSearch = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  
  debounceTimer = setTimeout(() => {
    applyFilters()
  }, 300)
}

const applyFilters = () => {
  $emit('filter', {
    search: searchQuery.value,
    status: statusFilter.value,
    supplier_id: supplierFilter.value,
    date: dateFilter.value
  })
}

const getVisiblePages = () => {
  const totalPages = Math.ceil(props.pagination.total / props.pagination.limit)
  const currentPage = props.pagination.page
  const pages: number[] = []

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      pages.push(-1) // Ellipsis
      pages.push(totalPages)
    } else if (currentPage >= totalPages - 3) {
      pages.push(1)
      pages.push(-1) // Ellipsis
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      pages.push(-1) // Ellipsis
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pages.push(i)
      }
      pages.push(-1) // Ellipsis
      pages.push(totalPages)
    }
  }

  return pages
}

// Watch filters
watch(() => props.filters, (newFilters) => {
  searchQuery.value = newFilters.search || ''
  statusFilter.value = newFilters.status || ''
  supplierFilter.value = newFilters.supplier_id || ''
  dateFilter.value = newFilters.date || ''
}, { deep: true })
</script>