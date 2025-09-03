<template>
  <div class="space-y-6">
    <!-- Encabezado -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ order ? order.order_number || `ORD-${order.id.slice(-8).toUpperCase()}` : 'Cargando...' }}
        </h1>
        <div v-if="order" class="mt-1 flex items-center space-x-2">
          <span
            :class="[
              'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
              getStatusClasses(order.status)
            ]"
          >
            {{ getStatusLabel(order.status) }}
          </span>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ formatDate(order.order_date) }}
          </span>
        </div>
      </div>
      
      <div v-if="order" class="flex items-center space-x-3 mt-4 sm:mt-0">
        <button
          v-if="canEdit"
          @click="$emit('edit')"
          class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Edit class="h-4 w-4 mr-2" />
          Editar
        </button>
        
        <button
          v-if="canApprove"
          @click="$emit('approve')"
          class="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-sm text-sm font-medium"
        >
          <Check class="h-4 w-4 mr-2" />
          Aprobar
        </button>
        
        <button
          v-if="canCreateDoc"
          @click="$emit('createDoc')"
          class="inline-flex items-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium"
        >
          <FileText class="h-4 w-4 mr-2" />
          Crear Documento
        </button>
        
        <button
          @click="$emit('duplicate')"
          class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Copy class="h-4 w-4 mr-2" />
          Duplicar
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>

    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
      <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    </div>

    <div v-else-if="order" class="space-y-6">
      <!-- Información de la orden -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Información de la Orden
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Proveedor -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Proveedor
            </label>
            <div class="mt-1 flex items-center">
              <Building class="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p class="text-sm text-gray-900 dark:text-white">
                  {{ order.supplier?.fullname || 'Sin proveedor' }}
                </p>
                <p v-if="order.supplier?.doc_number" class="text-xs text-gray-500 dark:text-gray-400">
                  {{ order.supplier.doc_type }}: {{ order.supplier.doc_number }}
                </p>
              </div>
            </div>
          </div>
          
          <!-- Sucursal -->
          <div v-if="order.branch">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Sucursal
            </label>
            <p class="mt-1 text-sm text-gray-900 dark:text-white">
              {{ order.branch.name }}
            </p>
          </div>
          
          <!-- Fecha de orden -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Fecha de Orden
            </label>
            <p class="mt-1 text-sm text-gray-900 dark:text-white">
              {{ formatDate(order.order_date) }}
            </p>
          </div>
          
          <!-- Fecha esperada -->
          <div v-if="order.expected_delivery_date">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Fecha Esperada de Entrega
            </label>
            <p class="mt-1 text-sm text-gray-900 dark:text-white">
              {{ formatDate(order.expected_delivery_date) }}
            </p>
          </div>
          
          <!-- Moneda -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Moneda
            </label>
            <p class="mt-1 text-sm text-gray-900 dark:text-white">
              {{ order.currency_code }}
              <span v-if="order.exchange_rate && order.currency_code !== 'PEN'" class="text-xs text-gray-500">
                (TC: {{ order.exchange_rate }})
              </span>
            </p>
          </div>
          
          <!-- Estado -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Estado
            </label>
            <div class="mt-1">
              <span
                :class="[
                  'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                  getStatusClasses(order.status)
                ]"
              >
                {{ getStatusLabel(order.status) }}
              </span>
            </div>
          </div>
          
          <!-- Notas -->
          <div v-if="order.notes" class="md:col-span-2 lg:col-span-3">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notas
            </label>
            <p class="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
              {{ order.notes }}
            </p>
          </div>
        </div>
      </div>

      <!-- Items de la orden -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            Items de la Orden
          </h3>
        </div>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Producto
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cantidad
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Precio Unit.
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="item in order.items" :key="item.id">
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <Package class="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ item.product?.name }}
                      </div>
                      <div class="text-sm text-gray-500 dark:text-gray-400">
                        SKU: {{ item.product?.sku }}
                      </div>
                      <div v-if="item.description" class="text-xs text-gray-400">
                        {{ item.description }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                  {{ formatQuantity(item.quantity) }} {{ item.unit_code }}
                </td>
                <td class="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                  {{ formatCurrency(item.unit_price, order.currency_code) }}
                </td>
                <td class="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-white">
                  {{ formatCurrency(item.total_price, order.currency_code) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Totales -->
        <div class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div class="flex justify-between items-center">
            <div class="text-sm text-gray-600 dark:text-gray-400">
              <span class="font-medium">{{ order.items?.length || 0 }}</span> items • 
              <span class="font-medium">{{ getTotalQuantity() }}</span> unidades
            </div>
            <div class="text-lg font-semibold text-gray-900 dark:text-white">
              Total: {{ formatCurrency(order.total_amount, order.currency_code) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Documentos relacionados -->
      <div v-if="relatedDocs.length > 0" class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Documentos Relacionados
        </h3>
        
        <div class="space-y-3">
          <div
            v-for="doc in relatedDocs"
            :key="doc.id"
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div class="flex items-center">
              <FileText class="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ doc.doc_type }}-{{ doc.series }}-{{ doc.number }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatDate(doc.issue_date) }}
                </p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <span
                :class="[
                  'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                  getDocStatusClasses(doc.status)
                ]"
              >
                {{ getDocStatusLabel(doc.status) }}
              </span>
              <button
                @click="$emit('viewDoc', doc.id)"
                class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
              >
                <Eye class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Building,
  Package,
  FileText,
  Edit,
  Check,
  Copy,
  Eye
} from 'lucide-vue-next'

import type { PurchaseOrder, PurchaseDoc } from '../../types'
import { StatusLabels, StatusColors } from '../../types'

// Props
interface Props {
  order: PurchaseOrder | null
  loading?: boolean
  error?: string | null
  relatedDocs?: PurchaseDoc[]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  relatedDocs: () => []
})

// Emits
defineEmits<{
  edit: []
  approve: []
  createDoc: []
  duplicate: []
  viewDoc: [id: string]
}>()

// Computed
const canEdit = computed(() => {
  return props.order?.status !== 'RECEIVED' && props.order?.status !== 'CANCELLED'
})

const canApprove = computed(() => {
  return props.order?.status === 'PENDING'
})

const canCreateDoc = computed(() => {
  return props.order?.status === 'APPROVED'
})

// Methods
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
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

const formatQuantity = (quantity: number) => {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  }).format(quantity)
}

const getTotalQuantity = () => {
  if (!props.order?.items) return '0'
  
  const total = props.order.items.reduce((sum, item) => sum + item.quantity, 0)
  return formatQuantity(total)
}

const getStatusLabel = (status: string) => {
  return StatusLabels[status as keyof typeof StatusLabels] || status
}

const getStatusClasses = (status: string) => {
  return StatusColors[status as keyof typeof StatusColors] || 'bg-gray-100 text-gray-800'
}

const getDocStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'PENDING': 'Pendiente',
    'PARTIALLY_RECEIVED': 'Parcialmente Recibido',
    'RECEIVED': 'Recibido',
    'CANCELLED': 'Cancelado'
  }
  return labels[status] || status
}

const getDocStatusClasses = (status: string) => {
  const classes: Record<string, string> = {
    'PENDING': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'PARTIALLY_RECEIVED': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'RECEIVED': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'CANCELLED': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}
</script>