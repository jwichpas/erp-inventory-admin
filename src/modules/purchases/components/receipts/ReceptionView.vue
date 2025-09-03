<template>
  <div class="space-y-6">
    <!-- Encabezado -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ reception ? reception.reception_number || `REC-${reception.id.slice(-8).toUpperCase()}` : 'Cargando...' }}
        </h1>
        <div v-if="reception" class="mt-1 flex items-center space-x-2">
          <span
            :class="[
              'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
              getStatusClasses(reception.status)
            ]"
          >
            {{ getStatusLabel(reception.status) }}
          </span>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ formatDate(reception.reception_date) }}
          </span>
        </div>
      </div>
      
      <div v-if="reception" class="flex items-center space-x-3 mt-4 sm:mt-0">
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
          v-if="canReject"
          @click="$emit('reject')"
          class="inline-flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm text-sm font-medium"
        >
          <X class="h-4 w-4 mr-2" />
          Rechazar
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>

    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
      <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    </div>

    <div v-else-if="reception" class="space-y-6">
      <!-- Información de la recepción -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Información de la Recepción
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Documento de compra -->
          <div v-if="reception.purchase_doc">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Documento de Compra
            </label>
            <div class="mt-1 flex items-center">
              <FileText class="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p class="text-sm text-gray-900 dark:text-white">
                  {{ reception.purchase_doc.doc_type }}-{{ reception.purchase_doc.series }}-{{ reception.purchase_doc.number }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatDate(reception.purchase_doc.issue_date) }}
                </p>
              </div>
            </div>
          </div>
          
          <!-- Proveedor -->
          <div v-if="reception.purchase_doc?.supplier">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Proveedor
            </label>
            <div class="mt-1 flex items-center">
              <Building class="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p class="text-sm text-gray-900 dark:text-white">
                  {{ reception.purchase_doc.supplier.fullname }}
                </p>
                <p v-if="reception.purchase_doc.supplier.doc_number" class="text-xs text-gray-500 dark:text-gray-400">
                  {{ reception.purchase_doc.supplier.doc_type }}: {{ reception.purchase_doc.supplier.doc_number }}
                </p>
              </div>
            </div>
          </div>
          
          <!-- Almacén -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Almacén de Destino
            </label>
            <div class="mt-1 flex items-center">
              <Warehouse class="h-5 w-5 text-gray-400 mr-2" />
              <p class="text-sm text-gray-900 dark:text-white">
                {{ reception.warehouse?.name || 'N/A' }}
              </p>
            </div>
          </div>
          
          <!-- Fecha de recepción -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Fecha de Recepción
            </label>
            <p class="mt-1 text-sm text-gray-900 dark:text-white">
              {{ formatDate(reception.reception_date) }}
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
                  getStatusClasses(reception.status)
                ]"
              >
                {{ getStatusLabel(reception.status) }}
              </span>
            </div>
          </div>
          
          <!-- Usuario responsable -->
          <div v-if="reception.received_by_user">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Recibido por
            </label>
            <div class="mt-1 flex items-center">
              <User class="h-5 w-5 text-gray-400 mr-2" />
              <p class="text-sm text-gray-900 dark:text-white">
                {{ reception.received_by_user.full_name || reception.received_by_user.email }}
              </p>
            </div>
          </div>
          
          <!-- Notas -->
          <div v-if="reception.notes" class="md:col-span-2 lg:col-span-3">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notas
            </label>
            <p class="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
              {{ reception.notes }}
            </p>
          </div>
        </div>
      </div>

      <!-- Items de la recepción -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            Items Recibidos
          </h3>
        </div>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Producto
                </th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cant. Esperada
                </th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cant. Recibida
                </th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Notas
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="item in reception.items" :key="item.id">
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
                    </div>
                  </div>
                </td>
                
                <td class="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                  {{ formatQuantity(item.expected_quantity) }} {{ item.unit_code }}
                </td>
                
                <td class="px-6 py-4 text-center">
                  <div class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ formatQuantity(item.received_quantity) }} {{ item.unit_code }}
                  </div>
                  <div v-if="item.received_quantity !== item.expected_quantity" class="text-xs text-gray-500 dark:text-gray-400">
                    {{ getQuantityDifferenceText(item.expected_quantity, item.received_quantity) }}
                  </div>
                </td>
                
                <td class="px-6 py-4 text-center">
                  <span
                    :class="[
                      'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                      getItemStatusClasses(item)
                    ]"
                  >
                    {{ getItemStatusLabel(item) }}
                  </span>
                </td>
                
                <td class="px-6 py-4">
                  <p v-if="item.notes" class="text-sm text-gray-900 dark:text-white">
                    {{ item.notes }}
                  </p>
                  <span v-else class="text-sm text-gray-400">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Resumen -->
        <div class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div class="flex justify-between items-center">
            <div class="text-sm text-gray-600 dark:text-gray-400">
              <span class="font-medium">{{ reception.items?.length || 0 }}</span> items totales
            </div>
            <div class="flex space-x-4 text-sm">
              <span class="text-green-600 dark:text-green-400">
                <span class="font-medium">{{ getCompleteItemsCount() }}</span> completos
              </span>
              <span class="text-yellow-600 dark:text-yellow-400">
                <span class="font-medium">{{ getPartialItemsCount() }}</span> parciales
              </span>
              <span class="text-gray-600 dark:text-gray-400">
                <span class="font-medium">{{ getPendingItemsCount() }}</span> pendientes
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Historial de cambios -->
      <div v-if="reception.audit_trail?.length" class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Historial de Cambios
        </h3>
        
        <div class="space-y-3">
          <div
            v-for="(entry, index) in reception.audit_trail"
            :key="index"
            class="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                <History class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ entry.action }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatDate(entry.timestamp) }}
                </p>
              </div>
              <p v-if="entry.notes" class="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {{ entry.notes }}
              </p>
              <p v-if="entry.user" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                por {{ entry.user.full_name || entry.user.email }}
              </p>
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
  X,
  User,
  Warehouse,
  History
} from 'lucide-vue-next'

import type { Reception, ReceptionItem } from '../../types'

// Props
interface Props {
  reception: Reception | null
  loading?: boolean
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null
})

// Emits
defineEmits<{
  edit: []
  approve: []
  reject: []
}>()

// Computed
const canEdit = computed(() => {
  return props.reception?.status !== 'COMPLETED' && props.reception?.status !== 'CANCELLED'
})

const canApprove = computed(() => {
  return props.reception?.status === 'PENDING' || props.reception?.status === 'PARTIAL'
})

const canReject = computed(() => {
  return props.reception?.status !== 'COMPLETED' && props.reception?.status !== 'CANCELLED'
})

// Methods
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatQuantity = (quantity: number) => {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  }).format(quantity)
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'PENDING': 'Pendiente',
    'PARTIAL': 'Parcial',
    'COMPLETED': 'Completado',
    'CANCELLED': 'Cancelado'
  }
  return labels[status] || status
}

const getStatusClasses = (status: string) => {
  const classes: Record<string, string> = {
    'PENDING': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'PARTIAL': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'COMPLETED': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'CANCELLED': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getItemStatusLabel = (item: ReceptionItem) => {
  if (item.received_quantity === 0) return 'Pendiente'
  if (item.received_quantity >= item.expected_quantity) return 'Completo'
  return 'Parcial'
}

const getItemStatusClasses = (item: ReceptionItem) => {
  if (item.received_quantity === 0) {
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
  if (item.received_quantity >= item.expected_quantity) {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  }
  return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
}

const getQuantityDifferenceText = (expected: number, received: number) => {
  const diff = received - expected
  if (diff > 0) {
    return `+${formatQuantity(diff)} exceso`
  } else {
    return `${formatQuantity(Math.abs(diff))} faltante`
  }
}

const getCompleteItemsCount = () => {
  if (!props.reception?.items) return 0
  return props.reception.items.filter(item => item.received_quantity >= item.expected_quantity).length
}

const getPartialItemsCount = () => {
  if (!props.reception?.items) return 0
  return props.reception.items.filter(item => 
    item.received_quantity > 0 && item.received_quantity < item.expected_quantity
  ).length
}

const getPendingItemsCount = () => {
  if (!props.reception?.items) return 0
  return props.reception.items.filter(item => item.received_quantity === 0).length
}
</script>