<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Encabezado -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ isEdit ? 'Editar Recepción' : 'Nueva Recepción de Mercancía' }}
      </h2>
      <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {{ isEdit ? 'Modifique los detalles de la recepción' : 'Complete la información para crear una nueva recepción' }}
      </p>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Información básica -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Información Básica
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Número de recepción -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Número de Recepción
            </label>
            <input
              v-model="formData.reception_number"
              type="text"
              placeholder="Se generará automáticamente si se deja vacío"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              :class="{ 'border-red-500': errors.reception_number }"
            />
            <p v-if="errors.reception_number" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ errors.reception_number }}
            </p>
          </div>

          <!-- Fecha de recepción -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Fecha de Recepción *
            </label>
            <input
              v-model="formData.reception_date"
              type="date"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              :class="{ 'border-red-500': errors.reception_date }"
            />
            <p v-if="errors.reception_date" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ errors.reception_date }}
            </p>
          </div>

          <!-- Documento de compra -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Documento de Compra
            </label>
            <div class="mt-1 relative">
              <input
                v-model="docSearchQuery"
                type="text"
                :placeholder="selectedDoc ? `${selectedDoc.doc_type}-${selectedDoc.series}-${selectedDoc.number}` : 'Buscar documento...'"
                @focus="showDocDropdown = true"
                @input="searchDocs"
                class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                :class="{ 'border-red-500': errors.purchase_doc_id }"
              />
              <button
                v-if="selectedDoc"
                type="button"
                @click="clearDocSelection"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
            
            <!-- Dropdown de documentos -->
            <div
              v-if="showDocDropdown && (availableDocs.length > 0 || docsLoading || docSearchQuery.length > 0)"
              class="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-auto"
            >
              <div v-if="docsLoading" class="p-3 text-center">
                <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
              
              <div v-else-if="availableDocs.length === 0 && docSearchQuery.length > 0" class="p-3 text-center">
                <p class="text-sm text-gray-600 dark:text-gray-400">No se encontraron documentos</p>
              </div>
              
              <div v-else>
                <button
                  v-for="doc in availableDocs"
                  :key="doc.id"
                  type="button"
                  @click="selectDoc(doc)"
                  class="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <div class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ doc.doc_type }}-{{ doc.series }}-{{ doc.number }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {{ doc.supplier?.fullname }} - {{ formatDate(doc.issue_date) }}
                  </div>
                </button>
              </div>
            </div>
            
            <p v-if="errors.purchase_doc_id" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ errors.purchase_doc_id }}
            </p>
          </div>

          <!-- Almacén -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Almacén de Destino *
            </label>
            <select
              v-model="formData.warehouse_id"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              :class="{ 'border-red-500': errors.warehouse_id }"
            >
              <option value="">Seleccionar almacén</option>
              <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
                {{ warehouse.name }}
              </option>
            </select>
            <p v-if="errors.warehouse_id" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ errors.warehouse_id }}
            </p>
          </div>
        </div>

        <!-- Notas -->
        <div class="mt-6">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Notas
          </label>
          <textarea
            v-model="formData.notes"
            rows="3"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="Observaciones o comentarios adicionales..."
          ></textarea>
        </div>
      </div>

      <!-- Items de recepción -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              Items a Recibir
            </h3>
            <button
              type="button"
              @click="addItem"
              class="inline-flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium"
            >
              <Plus class="h-4 w-4 mr-1" />
              Agregar Item
            </button>
          </div>
        </div>

        <div v-if="formData.items.length === 0" class="p-6 text-center">
          <Package class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No hay items
          </h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Agregue items para completar la recepción.
          </p>
        </div>

        <div v-else class="overflow-x-auto">
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
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Notas
                </th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="(item, index) in formData.items" :key="index">
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <Package class="h-5 w-5 text-gray-400 mr-3" />
                    <div class="min-w-0">
                      <div class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ item.product_name }}
                      </div>
                      <div class="text-sm text-gray-500 dark:text-gray-400">
                        SKU: {{ item.product_sku }}
                      </div>
                    </div>
                  </div>
                </td>

                <td class="px-6 py-4 text-center">
                  <span class="text-sm text-gray-900 dark:text-white">
                    {{ formatQuantity(item.expected_quantity) }} {{ item.unit_code }}
                  </span>
                </td>

                <td class="px-6 py-4">
                  <input
                    v-model.number="item.received_quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    :max="item.expected_quantity"
                    class="w-20 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </td>

                <td class="px-6 py-4">
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
                  <input
                    v-model="item.notes"
                    type="text"
                    placeholder="Observaciones..."
                    class="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </td>

                <td class="px-6 py-4 text-center">
                  <button
                    type="button"
                    @click="removeItem(index)"
                    class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash class="h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Resumen -->
        <div v-if="formData.items.length > 0" class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-600 dark:text-gray-400">
              Total items: {{ formData.items.length }}
            </span>
            <div class="space-x-4">
              <span class="text-green-600 dark:text-green-400">
                Completos: {{ getCompleteItemsCount() }}
              </span>
              <span class="text-yellow-600 dark:text-yellow-400">
                Parciales: {{ getPartialItemsCount() }}
              </span>
              <span class="text-gray-600 dark:text-gray-400">
                Pendientes: {{ getPendingItemsCount() }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Botones de acción -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div class="flex items-center justify-end space-x-3">
          <button
            type="button"
            @click="$emit('cancel')"
            class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            v-if="!isEdit"
            @click="handleSaveDraft"
            :disabled="loading"
            class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <Save class="h-4 w-4 mr-2" />
            Guardar Borrador
          </button>
          
          <button
            type="submit"
            :disabled="loading || !isFormValid"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div v-if="loading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            <Check v-else class="h-4 w-4 mr-2" />
            {{ isEdit ? 'Actualizar Recepción' : 'Crear Recepción' }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  Package,
  Plus,
  X,
  Trash,
  Check,
  Save
} from 'lucide-vue-next'

import type { 
  ReceptionFormData, 
  ReceptionItem,
  PurchaseDocListItem,
  Warehouse 
} from '../../types'

// Props
interface Props {
  initialData?: Partial<ReceptionFormData>
  warehouses: Warehouse[]
  loading?: boolean
  isEdit?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  isEdit: false
})

// Emits
defineEmits<{
  submit: [data: ReceptionFormData]
  saveDraft: [data: ReceptionFormData]
  cancel: []
}>()

// State
const formData = ref<ReceptionFormData>({
  reception_number: '',
  reception_date: new Date().toISOString().split('T')[0],
  purchase_doc_id: '',
  warehouse_id: '',
  notes: '',
  items: []
})

const errors = ref<Record<string, string>>({})
const docSearchQuery = ref('')
const showDocDropdown = ref(false)
const availableDocs = ref<PurchaseDocListItem[]>([])
const docsLoading = ref(false)
const selectedDoc = ref<PurchaseDocListItem | null>(null)

let docSearchTimer: NodeJS.Timeout

// Computed
const isFormValid = computed(() => {
  return formData.value.reception_date && 
         formData.value.warehouse_id &&
         formData.value.items.length > 0
})

// Methods
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatQuantity = (quantity: number) => {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  }).format(quantity)
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

const getCompleteItemsCount = () => {
  return formData.value.items.filter(item => item.received_quantity >= item.expected_quantity).length
}

const getPartialItemsCount = () => {
  return formData.value.items.filter(item => 
    item.received_quantity > 0 && item.received_quantity < item.expected_quantity
  ).length
}

const getPendingItemsCount = () => {
  return formData.value.items.filter(item => item.received_quantity === 0).length
}

const searchDocs = async () => {
  if (docSearchTimer) {
    clearTimeout(docSearchTimer)
  }

  docSearchTimer = setTimeout(async () => {
    if (docSearchQuery.value.length < 2) {
      availableDocs.value = []
      return
    }

    docsLoading.value = true
    try {
      // TODO: Implementar búsqueda de documentos
      // availableDocs.value = await searchPurchaseDocs(docSearchQuery.value)
      availableDocs.value = []
    } catch (error) {
      console.error('Error searching docs:', error)
      availableDocs.value = []
    } finally {
      docsLoading.value = false
    }
  }, 300)
}

const selectDoc = (doc: PurchaseDocListItem) => {
  selectedDoc.value = doc
  formData.value.purchase_doc_id = doc.id
  docSearchQuery.value = `${doc.doc_type}-${doc.series}-${doc.number}`
  showDocDropdown.value = false
  
  // Cargar items del documento
  loadDocItems(doc.id)
}

const clearDocSelection = () => {
  selectedDoc.value = null
  formData.value.purchase_doc_id = ''
  docSearchQuery.value = ''
  formData.value.items = []
}

const loadDocItems = async (docId: string) => {
  try {
    // TODO: Implementar carga de items del documento
    // const items = await loadPurchaseDocItems(docId)
    // formData.value.items = items.map(item => ({
    //   purchase_doc_item_id: item.id,
    //   product_id: item.product_id,
    //   product_name: item.product?.name || '',
    //   product_sku: item.product?.sku || '',
    //   expected_quantity: item.quantity,
    //   received_quantity: 0,
    //   unit_code: item.unit_code,
    //   notes: ''
    // }))
  } catch (error) {
    console.error('Error loading doc items:', error)
  }
}

const addItem = () => {
  formData.value.items.push({
    purchase_doc_item_id: '',
    product_id: '',
    product_name: '',
    product_sku: '',
    expected_quantity: 1,
    received_quantity: 0,
    unit_code: 'UND',
    notes: ''
  })
}

const removeItem = (index: number) => {
  formData.value.items.splice(index, 1)
}

const validateForm = () => {
  errors.value = {}
  
  if (!formData.value.reception_date) {
    errors.value.reception_date = 'La fecha de recepción es requerida'
  }
  
  if (!formData.value.warehouse_id) {
    errors.value.warehouse_id = 'El almacén es requerido'
  }
  
  if (formData.value.items.length === 0) {
    errors.value.items = 'Debe agregar al menos un item'
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = () => {
  if (validateForm()) {
    $emit('submit', formData.value)
  }
}

const handleSaveDraft = () => {
  $emit('saveDraft', formData.value)
}

const handleClickOutside = (event: MouseEvent) => {
  if (!event.target || !(event.target as Element).closest('.relative')) {
    showDocDropdown.value = false
  }
}

// Lifecycle
onMounted(() => {
  // Initialize form with props data
  if (props.initialData) {
    formData.value = { ...formData.value, ...props.initialData }
  }
  
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (docSearchTimer) {
    clearTimeout(docSearchTimer)
  }
})

// Watch props
watch(() => props.initialData, (newData) => {
  if (newData) {
    formData.value = { ...formData.value, ...newData }
  }
}, { deep: true })
</script>