<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Seguimiento de Items Serializados</h2>
        <p class="mt-1 text-gray-600 dark:text-gray-400">
          Gestiona códigos únicos para productos serializados
        </p>
      </div>
      <Button @click="showCreateModal = true" :disabled="!selectedProduct">
        <PlusIcon class="w-4 h-4 mr-2" />
        Agregar Código
      </Button>
    </div>

    <!-- Product Selection and Filters -->
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FormField v-model="selectedProductId" label="Producto Serializado" type="select"
          placeholder="Seleccionar producto" :options="serializedProductOptions" :disabled="isLoadingProducts" />

        <FormField v-model="filters.warehouseId" label="Almacén" type="select" placeholder="Todos los almacenes"
          :options="warehouseOptions" :disabled="isLoadingWarehouses" />

        <FormField v-model="filters.status" label="Estado" type="select" placeholder="Todos los estados"
          :options="statusOptions" />

        <FormField v-model="searchTerm" label="Buscar Código" type="text" placeholder="Buscar por código..." />
      </div>

      <div class="flex items-center justify-between mt-4">
        <div class="text-sm text-gray-600 dark:text-gray-400">
          {{ filteredProductCodes.length }} código{{ filteredProductCodes.length !== 1 ? 's' : '' }}
          encontrado{{ filteredProductCodes.length !== 1 ? 's' : '' }}
        </div>
        <Button variant="outline" @click="clearFilters" :disabled="!hasActiveFilters">
          <FilterXIcon class="w-4 h-4 mr-2" />
          Limpiar Filtros
        </Button>
      </div>
    </div>

    <!-- Product Codes Table -->
    <div v-if="selectedProduct"
      class="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              {{ selectedProduct.name }}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              SKU: {{ selectedProduct.sku }}
            </p>
          </div>
          <div class="flex items-center space-x-4">
            <Button variant="outline" @click="showBulkCreateModal = true">
              <PlusIcon class="w-4 h-4 mr-2" />
              Crear Múltiples
            </Button>
            <Button @click="showCreateModal = true">
              <PlusIcon class="w-4 h-4 mr-2" />
              Agregar Código
            </Button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="p-6">
        <LoadingSkeleton type="table" :rows="5" />
      </div>

      <!-- Product Codes List -->
      <div v-else-if="filteredProductCodes.length > 0" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Código
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Estado
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Ubicación
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Fechas
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="code in filteredProductCodes" :key="code.id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900 dark:text-white font-mono">
                  {{ code.code }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  getStatusClasses(code.status)
                ]">
                  {{ getStatusLabel(code.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900 dark:text-white">
                  {{ code.warehouses?.name || '-' }}
                </div>
                <div v-if="code.warehouse_zones || code.storage_locations"
                  class="text-xs text-gray-500 dark:text-gray-400">
                  {{ [code.warehouse_zones?.name, code.storage_locations?.name].filter(Boolean).join('-') }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div v-if="code.purchase_date" class="text-sm text-gray-900 dark:text-white">
                  Compra: {{ formatDate(code.purchase_date) }}
                </div>
                <div v-if="code.sale_date" class="text-sm text-gray-900 dark:text-white">
                  Venta: {{ formatDate(code.sale_date) }}
                </div>
                <div v-if="!code.purchase_date && !code.sale_date" class="text-sm text-gray-500 dark:text-gray-400">
                  -
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-2">
                  <button @click="editProductCode(code)""
                    class=" text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                    :disabled="isMutating">
                    <EditIcon class="w-4 h-4" />
                  </button>
                  <button @click="confirmDelete(code)"
                    class="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                    :disabled="isMutating">
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-else class="p-12 text-center">
        <QrCodeIcon class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {{ hasActiveFilters ? 'No se encontraron códigos' : 'No hay códigos registrados' }}
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">
          {{ hasActiveFilters
            ? 'Intenta ajustar los filtros de búsqueda.'
            : 'Comienza agregando códigos únicos para este producto.'
          }}
        </p>
        <Button v-if="!hasActiveFilters" @click="showCreateModal = true">
          <PlusIcon class="w-4 h-4 mr-2" />
          Agregar Código
        </Button>
      </div>
    </div>

    <!-- No Product Selected -->
    <div v-else class="text-center py-12">
      <QrCodeIcon class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Selecciona un producto serializado
      </h3>
      <p class="text-gray-500 dark:text-gray-400">
        Elige un producto de la lista para ver y gestionar sus códigos únicos.
      </p>
    </div>

    <!-- Create/Edit Modal -->
    <Modal :show="showCreateModal || showEditModal" :title="editingCode ? 'Editar Código' : 'Nuevo Código'" size="lg"
      @close="closeModal">
      <ProductCodeForm :product-code="editingCode" :product="selectedProduct" :is-submitting="isSubmitting"
        @submit="handleSubmit" @cancel="closeModal" />
    </Modal>

    <!-- Bulk Create Modal -->
    <Modal :show="showBulkCreateModal" title="Crear Múltiples Códigos" size="lg" @close="closeBulkModal">
      <BulkProductCodeForm :product="selectedProduct" :is-submitting="isSubmitting" @submit="handleBulkSubmit"
        @cancel="closeBulkModal" />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProducts } from '@/composables/useProducts'
import { useProductCodes } from '@/composables/useProductCodes'
import { useStockMovements } from '@/composables/useStockMovements'
import FormField from '@/components/ui/FormField.vue'
import Button from '@/components/ui/Button.vue'
import Modal from '@/components/ui/Modal.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import ProductCodeForm from './ProductCodeForm.vue'
import BulkProductCodeForm from './BulkProductCodeForm.vue'
import {
  Plus as PlusIcon,
  Edit as EditIcon,
  Trash2 as TrashIcon,
  QrCode as QrCodeIcon,
  FilterX as FilterXIcon,
} from 'lucide-vue-next'
import type { Product, ProductCode } from '@/types/database'
import type { ProductCodeFormData } from '@/schemas/productSchemas'

// State
const selectedProductId = ref('')
const searchTerm = ref('')
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showBulkCreateModal = ref(false)
const editingCode = ref<ProductCode | null>(null)
const isSubmitting = ref(false)

const filters = ref({
  warehouseId: '',
  status: '',
})

// Load data
const { products, isLoading: isLoadingProducts } = useProducts()
const { warehouses, isLoadingWarehouses } = useStockMovements()
const {
  productCodes,
  isLoading,
  createProductCode,
  updateProductCode,
  deleteProductCode,
  createBulkProductCodes,
  updateFilters,
  statusOptions,
  getStatusLabel,
  getStatusColor,
  isMutating,
} = useProductCodes()

// Computed properties
const serializedProducts = computed(() =>
  products.value?.filter(product => product.is_serialized) || []
)

const serializedProductOptions = computed(() => [
  { value: '', label: 'Seleccionar producto' },
  ...serializedProducts.value.map(product => ({
    value: product.id,
    label: `${product.sku} - ${product.name}`,
  })),
])

const warehouseOptions = computed(() => [
  { value: '', label: 'Todos los almacenes' },
  ...(warehouses.value?.map(warehouse => ({
    value: warehouse.id,
    label: `${warehouse.code} - ${warehouse.name}`,
  })) || []),
])

const selectedProduct = computed(() =>
  serializedProducts.value.find(product => product.id === selectedProductId.value) || null
)

const filteredProductCodes = computed(() => {
  if (!productCodes.value) return []

  let filtered = [...productCodes.value]

  // Search filter
  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(code =>
      code.code.toLowerCase().includes(search)
    )
  }

  // Warehouse filter
  if (filters.value.warehouseId) {
    filtered = filtered.filter(code => code.warehouse_id === filters.value.warehouseId)
  }

  // Status filter
  if (filters.value.status) {
    filtered = filtered.filter(code => code.status === filters.value.status)
  }

  return filtered.sort((a, b) => a.code.localeCompare(b.code))
})

const hasActiveFilters = computed(() =>
  !!(searchTerm.value || filters.value.warehouseId || filters.value.status)
)

// Watch selected product and update filters
watch(selectedProductId, (productId) => {
  updateFilters({ productId })
})

watch([searchTerm, filters], ([newSearchTerm, newFilters]) => {
  updateFilters({
    productId: selectedProductId.value,
    search: newSearchTerm,
    warehouseId: newFilters.warehouseId || undefined,
    status: newFilters.status as any || undefined,
  })
}, { deep: true, debounce: 300 })

// Utility functions
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-PE')
}

const getStatusClasses = (status: ProductCode['status']) => {
  const color = getStatusColor(status)
  const classes = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  }
  return classes[color as keyof typeof classes] || classes.gray
}

const clearFilters = () => {
  searchTerm.value = ''
  filters.value = {
    warehouseId: '',
    status: '',
  }
}

// Modal management
const closeModal = () => {
  showCreateModal.value = false
  showEditModal.value = false
  editingCode.value = null
}

const closeBulkModal = () => {
  showBulkCreateModal.value = false
}

const editProductCode = (code: ProductCode) => {
  editingCode.value = code
  showEditModal.value = true
}

// Form submission
const handleSubmit = async (data: ProductCodeFormData) => {
  try {
    isSubmitting.value = true

    if (editingCode.value) {
      await updateProductCode(editingCode.value.id, data)
    } else {
      await createProductCode(data)
    }

    closeModal()
  } catch (error) {
    console.error('Error saving product code:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleBulkSubmit = async (codes: ProductCodeFormData[]) => {
  try {
    isSubmitting.value = true
    await createBulkProductCodes(codes)
    closeBulkModal()
  } catch (error) {
    console.error('Error creating bulk product codes:', error)
  } finally {
    isSubmitting.value = false
  }
}

// Delete confirmation
const confirmDelete = async (code: ProductCode) => {
  if (confirm(`¿Estás seguro de que quieres eliminar el código "${code.code}"?`)) {
    try {
      await deleteProductCode(code.id)
    } catch (error) {
      console.error('Error deleting product code:', error)
    }
  }
}
</script>
