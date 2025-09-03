<template>
  <div class="relative">
    <!-- Campo de búsqueda -->
    <div class="relative">
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="text"
        :placeholder="selectedProduct ? selectedProduct.name : 'Buscar producto...'"
        @focus="showDropdown = true"
        @input="onSearch"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        :class="{ 'border-red-500': error }"
      />
      <button
        v-if="selectedProduct"
        type="button"
        @click="clearSelection"
        class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- Dropdown de resultados -->
    <div
      v-if="showDropdown && (products.length > 0 || loading || searchQuery.length > 0)"
      class="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto"
    >
      <!-- Loading -->
      <div v-if="loading" class="p-3 text-center">
        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">Buscando...</p>
      </div>

      <!-- No results -->
      <div v-else-if="products.length === 0 && searchQuery.length > 0" class="p-3 text-center">
        <p class="text-sm text-gray-600 dark:text-gray-400">No se encontraron productos</p>
      </div>

      <!-- Results -->
      <div v-else>
        <button
          v-for="product in products"
          :key="product.id"
          type="button"
          @click="selectProduct(product)"
          class="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
        >
          <div class="flex items-center">
            <Package class="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {{ product.name }}
                </p>
                <span class="text-xs text-gray-400 ml-2">
                  {{ product.unit_code }}
                </span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                SKU: {{ product.sku }}
              </p>
              <p v-if="product.description" class="text-xs text-gray-400 truncate">
                {{ product.description }}
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>

  <!-- Información del producto seleccionado -->
  <div v-if="selectedProduct" class="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
    <div class="flex items-center">
      <Package class="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
      <div class="flex-1">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-green-900 dark:text-green-100">
            {{ selectedProduct.name }}
          </p>
          <span class="text-xs text-green-700 dark:text-green-300 px-2 py-1 bg-green-100 dark:bg-green-800 rounded">
            {{ selectedProduct.unit_code }}
          </span>
        </div>
        <p class="text-xs text-green-700 dark:text-green-300">
          SKU: {{ selectedProduct.sku }}
        </p>
        <p v-if="selectedProduct.description" class="text-xs text-green-600 dark:text-green-400 mt-1">
          {{ selectedProduct.description }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Package, X } from 'lucide-vue-next'
import { usePurchases } from '../../composables'

// Props
interface Props {
  value: string
  error?: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:value': [value: string]
  'product-selected': [product: any]
}>()

// Composable
const { searchProducts } = usePurchases()

// State
const searchQuery = ref('')
const showDropdown = ref(false)
const loading = ref(false)
const products = ref<any[]>([])
const selectedProduct = ref<any>(null)
const searchInput = ref<HTMLInputElement>()

// Debounce timer
let debounceTimer: NodeJS.Timeout

// Computed
const hasSelection = computed(() => !!selectedProduct.value)

// Methods
const onSearch = async () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(async () => {
    if (searchQuery.value.length < 2) {
      products.value = []
      return
    }

    loading.value = true
    try {
      products.value = await searchProducts(searchQuery.value)
    } catch (error) {
      console.error('Error searching products:', error)
      products.value = []
    } finally {
      loading.value = false
    }
  }, 300)
}

const selectProduct = (product: any) => {
  selectedProduct.value = product
  searchQuery.value = product.name
  showDropdown.value = false
  emit('update:value', product.id)
  emit('product-selected', product)
}

const clearSelection = () => {
  selectedProduct.value = null
  searchQuery.value = ''
  emit('update:value', '')
  emit('product-selected', null)
  searchInput.value?.focus()
}

const handleClickOutside = (event: MouseEvent) => {
  if (!searchInput.value?.contains(event.target as Node)) {
    showDropdown.value = false
  }
}

// Watch for prop changes
watch(() => props.value, async (newValue) => {
  if (newValue && !selectedProduct.value) {
    // Load product details if we have an ID but no selected product
    try {
      const results = await searchProducts('') // This should load recent or all products
      const product = results.find(p => p.id === newValue)
      if (product) {
        selectedProduct.value = product
        searchQuery.value = product.name
      }
    } catch (error) {
      console.error('Error loading product:', error)
    }
  } else if (!newValue) {
    selectedProduct.value = null
    searchQuery.value = ''
  }
})

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})
</script>