<template>
    <div class="space-y-3">
        <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Cliente
            </label>
            <Button @click="showQuickCustomerModal = true" variant="secondary" size="sm" class="text-xs">
                <Plus class="h-3 w-3 mr-1" />
                Nuevo
            </Button>
        </div>

        <!-- Selected Customer Display -->
        <div v-if="modelValue"
            class="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div class="flex items-center justify-between">
                <div>
                    <p class="font-medium text-blue-900 dark:text-blue-100">{{ modelValue.name }}</p>
                    <p class="text-sm text-blue-700 dark:text-blue-300">
                        {{ modelValue.documentType }}: {{ modelValue.documentNumber }}
                    </p>
                </div>
                <Button @click="clearCustomer" variant="ghost" size="sm"
                    class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200">
                    <X class="h-4 w-4" />
                </Button>
            </div>
        </div>

        <!-- Customer Search -->
        <div v-else class="relative">
            <input v-model="searchQuery" type="text" placeholder="Buscar cliente por nombre o documento..."
                class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                @focus="showDropdown = true" @blur="handleBlur">
            <Search class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />

            <!-- Search Results Dropdown -->
            <div v-if="showDropdown && (customers?.length || frequentCustomers?.length)"
                class="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <!-- Frequent Customers -->
                <div v-if="!searchQuery && frequentCustomers?.length" class="p-2">
                    <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Clientes Frecuentes</p>
                    <div v-for="customer in frequentCustomers" :key="customer.id"
                        class="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                        @mousedown="selectCustomer(customer)">
                        <p class="font-medium text-gray-900 dark:text-white">{{ customer.name }}</p>
                        <p class="text-sm text-gray-600 dark:text-gray-300">
                            {{ customer.documentType }}: {{ customer.documentNumber }}
                        </p>
                    </div>
                </div>

                <!-- Search Results -->
                <div v-if="searchQuery && customers?.length" class="p-2">
                    <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Resultados de Búsqueda</p>
                    <div v-for="customer in customers" :key="customer.id"
                        class="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                        @mousedown="selectCustomer(customer)">
                        <p class="font-medium text-gray-900 dark:text-white">{{ customer.name }}</p>
                        <p class="text-sm text-gray-600 dark:text-gray-300">
                            {{ customer.documentType }}: {{ customer.documentNumber }}
                        </p>
                        <p v-if="customer.email" class="text-xs text-gray-500 dark:text-gray-400">{{ customer.email }}
                        </p>
                    </div>
                </div>

                <!-- No Results -->
                <div v-if="searchQuery && !isSearchingCustomers && !customers?.length" class="p-4 text-center">
                    <p class="text-gray-600 dark:text-gray-400">No se encontraron clientes</p>
                    <Button @click="showQuickCustomerModal = true" variant="secondary" size="sm" class="mt-2">
                        <Plus class="h-3 w-3 mr-1" />
                        Crear Cliente
                    </Button>
                </div>

                <!-- Loading -->
                <div v-if="isSearchingCustomers" class="p-4 text-center">
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Buscando...</p>
                </div>
            </div>
        </div>

        <!-- Quick Customer Creation Modal -->
        <Modal :show="showQuickCustomerModal" @update:show="showQuickCustomerModal = $event"
            title="Crear Cliente Rápido" size="md">
            <form @submit.prevent="handleCreateCustomer" class="space-y-4">
                <FormField v-model="newCustomer.documentType" label="Tipo de Documento" type="select"
                    :options="documentTypeOptions" required />

                <FormField v-model="newCustomer.documentNumber" label="Número de Documento" type="text" required
                    placeholder="Ej: 12345678" />

                <FormField v-model="newCustomer.name" label="Nombre Completo" type="text" required
                    placeholder="Ej: Juan Pérez" />

                <FormField v-model="newCustomer.email" label="Email (Opcional)" type="email"
                    placeholder="cliente@email.com" />

                <FormField v-model="newCustomer.phone" label="Teléfono (Opcional)" type="text"
                    placeholder="999 999 999" />

                <FormField v-model="newCustomer.address" label="Dirección (Opcional)" type="textarea"
                    placeholder="Dirección completa" />

                <div class="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" @click="showQuickCustomerModal = false">
                        Cancelar
                    </Button>
                    <Button type="submit" :loading="isCreatingCustomer"
                        :disabled="!newCustomer.documentNumber || !newCustomer.name">
                        <Plus class="h-4 w-4 mr-2" />
                        Crear Cliente
                    </Button>
                </div>
            </form>
        </Modal>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Search, Plus, X } from 'lucide-vue-next'
import { usePOSCustomers } from '@/composables/usePOSCustomers'
import { useToast } from '@/composables/useToast'
import Button from '@/components/ui/Button.vue'
import Modal from '@/components/ui/Modal.vue'
import FormField from '@/components/ui/FormField.vue'
import type { POSCustomer } from '@/types/pos'

interface Props {
    modelValue?: POSCustomer | null
}

interface Emits {
    (e: 'update:modelValue', value: POSCustomer | null): void
    (e: 'customer-created', customer: POSCustomer): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Composables
const {
    searchQuery,
    customers,
    frequentCustomers,
    isSearchingCustomers,
    isCreatingCustomer,
    createQuickCustomer,
} = usePOSCustomers()

const { showToast } = useToast()

// Local state
const showDropdown = ref(false)
const showQuickCustomerModal = ref(false)
const newCustomer = ref({
    documentType: 'DNI',
    documentNumber: '',
    name: '',
    email: '',
    phone: '',
    address: '',
})

// Document type options
const documentTypeOptions = [
    { value: 'DNI', label: 'DNI' },
    { value: 'RUC', label: 'RUC' },
    { value: 'CE', label: 'Carnet de Extranjería' },
    { value: 'PASSPORT', label: 'Pasaporte' },
]

// Methods
const selectCustomer = (customer: POSCustomer) => {
    emit('update:modelValue', customer)
    showDropdown.value = false
    searchQuery.value = ''
}

const clearCustomer = () => {
    emit('update:modelValue', null)
}

const handleBlur = () => {
    // Delay hiding dropdown to allow click events
    setTimeout(() => {
        showDropdown.value = false
    }, 200)
}

const handleCreateCustomer = async () => {
    try {
        const customer = await createQuickCustomer({
            documentType: newCustomer.value.documentType,
            documentNumber: newCustomer.value.documentNumber,
            name: newCustomer.value.name,
            email: newCustomer.value.email || undefined,
            phone: newCustomer.value.phone || undefined,
            address: newCustomer.value.address || undefined,
        })

        // Reset form
        newCustomer.value = {
            documentType: 'DNI',
            documentNumber: '',
            name: '',
            email: '',
            phone: '',
            address: '',
        }

        showQuickCustomerModal.value = false

        // Select the new customer
        emit('update:modelValue', customer)
        emit('customer-created', customer)

    } catch (error: any) {
        showToast(error.message || 'Error al crear cliente', 'error')
    }
}

// Watch for modal close to reset form
watch(showQuickCustomerModal, (show) => {
    if (!show) {
        newCustomer.value = {
            documentType: 'DNI',
            documentNumber: '',
            name: '',
            email: '',
            phone: '',
            address: '',
        }
    }
})
</script>
