<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Encabezado -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ isEdit ? 'Editar Orden de Compra' : 'Nueva Orden de Compra' }}
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{
            isEdit
              ? 'Modificar los datos de la orden'
              : 'Complete los datos para crear una nueva orden'
          }}
        </p>
      </div>

      <div class="flex space-x-3">
        <button
          type="button"
          @click="$emit('cancel')"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancelar
        </button>
        <button
          type="submit"
          :disabled="loading || !isValid"
          class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-md shadow-sm text-sm font-medium"
        >
          <span v-if="loading">Guardando...</span>
          <span v-else>{{ isEdit ? 'Actualizar' : 'Crear' }} Orden</span>
        </button>
      </div>
    </div>

    <!-- Información general -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Información General</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Proveedor -->
        <div class="lg:col-span-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Proveedor *
          </label>
          <SupplierSelector
            :value="formData.supplier_id"
            @update:value="formData.supplier_id = $event"
            :error="errors.supplier_id"
          />
          <p v-if="errors.supplier_id" class="mt-1 text-sm text-red-600">
            {{ errors.supplier_id }}
          </p>
        </div>

        <!-- Sucursal -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sucursal
          </label>
          <select
            v-model="formData.branch_id"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Sucursal principal</option>
            <option v-for="branch in branches" :key="branch.id" :value="branch.id">
              {{ branch.name }}
            </option>
          </select>
        </div>

        <!-- Fecha de orden -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Fecha de Orden *
          </label>
          <input
            v-model="formData.order_date"
            type="date"
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <p v-if="errors.order_date" class="mt-1 text-sm text-red-600">{{ errors.order_date }}</p>
        </div>

        <!-- Fecha esperada de entrega -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Fecha Esperada de Entrega
          </label>
          <input
            v-model="formData.expected_delivery_date"
            type="date"
            :min="formData.order_date"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        <!-- Moneda -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Moneda *
          </label>
          <select
            v-model="formData.currency_code"
            required
            @change="onCurrencyChange"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Seleccionar moneda</option>
            <option v-for="currency in currencies" :key="currency.code" :value="currency.code">
              {{ currency.name }} ({{ currency.code }})
            </option>
          </select>
          <p v-if="errors.currency_code" class="mt-1 text-sm text-red-600">
            {{ errors.currency_code }}
          </p>
        </div>

        <!-- Tipo de cambio -->
        <div v-if="formData.currency_code !== 'PEN'">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tipo de Cambio *
          </label>
          <input
            v-model.number="formData.exchange_rate"
            type="number"
            step="0.00001"
            min="0"
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <p v-if="errors.exchange_rate" class="mt-1 text-sm text-red-600">
            {{ errors.exchange_rate }}
          </p>
        </div>
      </div>

      <!-- Notas -->
      <div class="mt-6">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Notas
        </label>
        <textarea
          v-model="formData.notes"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          placeholder="Notas adicionales sobre la orden..."
        ></textarea>
      </div>
    </div>

    <!-- Items de la orden -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">Items de la Orden</h3>
        <button
          type="button"
          @click="addItem"
          class="inline-flex items-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm"
        >
          <Plus class="h-4 w-4 mr-2" />
          Agregar Item
        </button>
      </div>

      <div v-if="formData.items.length === 0" class="text-center py-8">
        <Package class="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p class="text-gray-600 dark:text-gray-400">No hay items agregados</p>
        <button
          type="button"
          @click="addItem"
          class="mt-2 inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          <Plus class="h-4 w-4 mr-2" />
          Agregar primer item
        </button>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="(item, index) in formData.items"
          :key="index"
          class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
        >
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white">Item #{{ index + 1 }}</h4>
            <button
              type="button"
              @click="removeItem(index)"
              class="text-red-600 hover:text-red-800 dark:text-red-400"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <!-- Producto -->
            <div class="lg:col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Producto *
              </label>
              <ProductSelector
                :value="item.product_id"
                @update:value="item.product_id = $event"
                @product-selected="onProductSelected(index, $event)"
              />
            </div>

            <!-- Descripción -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripción
              </label>
              <input
                v-model="item.description"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Descripción adicional"
              />
            </div>

            <!-- Cantidad -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cantidad *
              </label>
              <input
                v-model.number="item.quantity"
                type="number"
                min="0.01"
                step="0.01"
                required
                @input="updateTotal()"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <!-- Precio unitario -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Precio Unitario *
              </label>
              <input
                v-model.number="item.unit_price"
                type="number"
                min="0"
                step="0.01"
                required
                @input="updateTotal()"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <!-- Subtotal del item -->
          <div class="mt-2 text-right">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              Subtotal:
              {{ formatCurrency(item.quantity * item.unit_price, formData.currency_code) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Totales -->
    <div v-if="formData.items.length > 0" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Resumen</h3>

      <div class="space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-gray-600 dark:text-gray-400">Items:</span>
          <span class="text-gray-900 dark:text-white">{{ formData.items.length }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-600 dark:text-gray-400">Cantidad total:</span>
          <span class="text-gray-900 dark:text-white">{{ totalQuantity.toFixed(2) }}</span>
        </div>
        <div
          class="flex justify-between text-lg font-semibold border-t border-gray-200 dark:border-gray-700 pt-2"
        >
          <span class="text-gray-900 dark:text-white">Total:</span>
          <span class="text-gray-900 dark:text-white">{{
            formatCurrency(totalAmount, formData.currency_code)
          }}</span>
        </div>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted } from 'vue'
import { Plus, Package, Trash2 } from 'lucide-vue-next'

import type { PurchaseOrderFormData } from '../../types'
import { usePurchases } from '../../composables'
import SupplierSelector from '../common/SupplierSelector.vue'
import ProductSelector from '../common/ProductSelector.vue'

// Props
interface Props {
  initialData?: Partial<PurchaseOrderFormData>
  loading?: boolean
  isEdit?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  isEdit: false,
})

// Emits
const emit = defineEmits<{
  submit: [data: PurchaseOrderFormData]
  cancel: []
}>()

// Composables
const purchases = usePurchases()

// Data
const branches = ref<Array<{ id: string; code: string; name: string }>>([])
const currencies = ref<Array<{ code: string; name: string; symbol: string }>>([])
const companyId = localStorage.getItem('currentCompanyId')

const formData = reactive<PurchaseOrderFormData>({
  company_id: localStorage.getItem('currentCompanyId') || '', // Obtener directamente
  supplier_id: '',
  branch_id: '',
  order_date: new Date().toISOString().split('T')[0],
  expected_delivery_date: '',
  currency_code: 'PEN',
  exchange_rate: undefined,
  notes: '',
  items: [],
})

const errors = ref<Record<string, string>>({})

// Computed
const isValid = computed(() => {
  return (
    formData.supplier_id &&
    formData.branch_id &&
    formData.order_date &&
    formData.currency_code &&
    formData.items.length > 0 &&
    formData.items.every((item) => item.product_id && item.quantity > 0 && item.unit_price >= 0)
  )
})

const totalAmount = computed(() => {
  return formData.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
})

const totalQuantity = computed(() => {
  return formData.items.reduce((sum, item) => sum + item.quantity, 0)
})

// Methods
const handleSubmit = () => {
  if (validateForm()) {
    // Emit submit event
    const submitData = {
      ...formData,
      company_id: formData.company_id,
    }
    // Omitir exchange_rate si es PEN
    if (submitData.currency_code === 'PEN') {
      submitData.exchange_rate = undefined
    }
    console.log('Submitting payload:', submitData) // Add this to debug the payload
    emit('submit', submitData)
  }
}

const validateForm = (): boolean => {
  errors.value = {}

  if (!formData.company_id) {
    errors.value.company_id = 'Company ID is required'
  }

  if (!formData.supplier_id) {
    errors.value.supplier_id = 'Debe seleccionar un proveedor'
  }
  if (!formData.branch_id) {
    errors.value.branch_id = 'Debe seleccionar una sucursal'
  }

  if (!formData.order_date) {
    errors.value.order_date = 'Debe ingresar la fecha de orden'
  }

  if (!formData.currency_code) {
    errors.value.currency_code = 'Debe seleccionar una moneda'
  }

  if (formData.currency_code !== 'PEN' && !formData.exchange_rate) {
    errors.value.exchange_rate = 'Debe ingresar el tipo de cambio'
  }

  if (formData.items.length === 0) {
    errors.value.items = 'Debe agregar al menos un item'
  }

  return Object.keys(errors.value).length === 0
}

const addItem = () => {
  formData.items.push({
    product_id: '',
    description: '',
    unit_code: '',
    quantity: 1,
    unit_price: 0,
  })
}

const removeItem = (index: number) => {
  formData.items.splice(index, 1)
  updateTotal()
}

const onProductSelected = (index: number, product: any) => {
  const item = formData.items[index]
  if (product) {
    item.unit_code = product.unit_code
    item.description = product.description || product.name
  }
}

const onCurrencyChange = async () => {
  if (formData.currency_code === 'PEN') {
    formData.exchange_rate = undefined
  } else {
    // Obtener tipo de cambio automáticamente
    try {
      const rate = await purchases.getExchangeRate(formData.currency_code, 'PEN')
      if (rate) {
        formData.exchange_rate = rate
      }
    } catch (error) {
      console.error('Error getting exchange rate:', error)
    }
  }
}

const updateTotal = () => {
  // Trigger reactivity update
  formData.items = [...formData.items]
}

const formatCurrency = (amount: number, currency = 'PEN') => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

// Watch for initial data
watch(
  () => props.initialData,
  (newData) => {
    if (newData) {
      const currentCompanyId = formData.company_id
      Object.assign(formData, newData)

      if (!newData.company_id) {
        formData.company_id = currentCompanyId
      }
    }
  },
  { immediate: true },
)

// Load data on mount
onMounted(async () => {
  try {
    // Cargar sucursales y monedas desde la base de datos
    const [branchesData, currenciesData] = await Promise.all([
      purchases.getBranches(),
      purchases.getCurrencies(),
    ])
    formData.company_id = companyId || '' // Asignar el company_id
    branches.value = branchesData
    currencies.value = currenciesData
  } catch (error) {
    console.error('Error loading form data:', error)
  }
})
</script>
