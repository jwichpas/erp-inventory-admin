<template>
  <div class="relative">
    <!-- Campo de búsqueda -->
    <div class="relative">
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="text"
        :placeholder="selectedSupplier ? selectedSupplier.name : 'Buscar proveedor...'"
        @focus="showDropdown = true"
        @input="onSearch"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        :class="{ 'border-red-500': error }"
      />
      <button
        v-if="selectedSupplier"
        type="button"
        @click="clearSelection"
        class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- Dropdown de resultados -->
    <div
      v-if="showDropdown && (suppliers.length > 0 || loading || searchQuery.length > 0)"
      class="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto"
    >
      <!-- Loading -->
      <div v-if="loading" class="p-3 text-center">
        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">Buscando...</p>
      </div>

      <!-- No results -->
      <div v-else-if="suppliers.length === 0 && searchQuery.length > 0" class="p-3 text-center">
        <p class="text-sm text-gray-600 dark:text-gray-400">No se encontraron proveedores</p>
      </div>

      <!-- Results -->
      <div v-else>
        <button
          v-for="supplier in suppliers"
          :key="supplier.id"
          type="button"
          @click="selectSupplier(supplier)"
          class="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
        >
          <div class="flex items-center">
            <Building class="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                {{ supplier.fullname }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ supplier.doc_type }}: {{ supplier.doc_number }}
              </p>
              <p v-if="supplier.email" class="text-xs text-gray-400">
                {{ supplier.email }}
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>

  <!-- Información del proveedor seleccionado -->
  <div v-if="selectedSupplier" class="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
    <div class="flex items-center">
      <Building class="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
      <div class="flex-1">
        <p class="text-sm font-medium text-indigo-900 dark:text-indigo-100">
          {{ selectedSupplier.fullname }}
        </p>
        <p class="text-xs text-indigo-700 dark:text-indigo-300">
          {{ selectedSupplier.doc_type }}: {{ selectedSupplier.doc_number }}
        </p>
        <div v-if="selectedSupplier.email || selectedSupplier.phone" class="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
          <span v-if="selectedSupplier.email">{{ selectedSupplier.email }}</span>
          <span v-if="selectedSupplier.email && selectedSupplier.phone"> • </span>
          <span v-if="selectedSupplier.phone">{{ selectedSupplier.phone }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Building, X } from 'lucide-vue-next'
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
}>()

// Composable
const { searchSuppliers } = usePurchases()

// State
const searchQuery = ref('')
const showDropdown = ref(false)
const loading = ref(false)
const suppliers = ref<any[]>([])
const selectedSupplier = ref<any>(null)
const searchInput = ref<HTMLInputElement>()

// Debounce timer
let debounceTimer: NodeJS.Timeout

// Computed
const hasSelection = computed(() => !!selectedSupplier.value)

// Methods
const onSearch = async () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(async () => {
    if (searchQuery.value.length < 2) {
      suppliers.value = []
      return
    }

    loading.value = true
    try {
      suppliers.value = await searchSuppliers(searchQuery.value)
    } catch (error) {
      console.error('Error searching suppliers:', error)
      suppliers.value = []
    } finally {
      loading.value = false
    }
  }, 300)
}

const selectSupplier = (supplier: any) => {
  selectedSupplier.value = supplier
  searchQuery.value = supplier.fullname
  showDropdown.value = false
  emit('update:value', supplier.id)
}

const clearSelection = () => {
  selectedSupplier.value = null
  searchQuery.value = ''
  emit('update:value', '')
  searchInput.value?.focus()
}

const handleClickOutside = (event: MouseEvent) => {
  if (!searchInput.value?.contains(event.target as Node)) {
    showDropdown.value = false
  }
}

// Watch for prop changes
watch(() => props.value, async (newValue) => {
  if (newValue && !selectedSupplier.value) {
    // Load supplier details if we have an ID but no selected supplier
    try {
      const results = await searchSuppliers('') // This should load recent or all suppliers
      const supplier = results.find(s => s.id === newValue)
      if (supplier) {
        selectedSupplier.value = supplier
        searchQuery.value = supplier.fullname
      }
    } catch (error) {
      console.error('Error loading supplier:', error)
    }
  } else if (!newValue) {
    selectedSupplier.value = null
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