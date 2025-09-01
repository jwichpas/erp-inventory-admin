<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Movement Type -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Tipo de Movimiento
            </h3>

            <div class="grid grid-cols-3 gap-4">
                <label v-for="type in movementTypes" :key="type.value" :class="[
                    'relative flex cursor-pointer rounded-lg border p-4 focus:outline-none',
                    formData.movement_type === type.value
                        ? 'border-blue-600 ring-2 ring-blue-600 dark:border-blue-400 dark:ring-blue-400'
                        : 'border-gray-300 dark:border-gray-600'
                ]">
                    <input v-model="formData.movement_type" type="radio" :value="type.value" class="sr-only"
                        :disabled="isSubmitting" />
                    <div class="flex flex-1 items-center">
                        <div class="flex flex-col">
                            <div class="flex items-center">
                                <component :is="type.icon" class="w-5 h-5 mr-2" :class="type.color" />
                                <span class="block text-sm font-medium text-gray-900 dark:text-white">
                                    {{ type.label }}
                                </span>
                            </div>
                            <span class="block text-sm text-gray-500 dark:text-gray-400">
                                {{ type.description }}
                            </span>
                        </div>
                    </div>
                </label>
            </div>
        </div>

        <!-- Product Selection -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Producto
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField v-model="formData.product_id" label="Producto" type="select"
                    placeholder="Seleccionar producto" required :options="productOptions"
                    :validation="stockMovementSchema.shape.product_id" :disabled="isSubmitting || isLoadingProducts" />

                <FormField v-model="formData.quantity" label="Cantidad" type="number" placeholder="0" required
                    :validation="stockMovementSchema.shape.quantity" :disabled="isSubmitting" />
            </div>

            <div v-if="formData.movement_type === 'IN'" class="mt-4">
                <FormField v-model="formData.unit_cost" label="Costo Unitario" type="number" placeholder="0.00"
                    help-text="Costo unitario para movimientos de entrada"
                    :validation="stockMovementSchema.shape.unit_cost" :disabled="isSubmitting" />
            </div>
        </div>

        <!-- Location Selection -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Ubicación
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField v-model="formData.warehouse_id" label="Almacén" type="select"
                    placeholder="Seleccionar almacén" required :options="warehouseOptions"
                    :validation="stockMovementSchema.shape.warehouse_id" :disabled="isSubmitting || isLoadingWarehouses"
                    @update:model-value="onWarehouseChange" />

                <FormField v-model="formData.zone_id" label="Zona" type="select"
                    placeholder="Seleccionar zona (opcional)" :options="zoneOptions"
                    :validation="stockMovementSchema.shape.zone_id"
                    :disabled="isSubmitting || !formData.warehouse_id || isLoadingZones"
                    @update:model-value="onZoneChange" />

                <FormField v-model="formData.location_id" label="Ubicación" type="select"
                    placeholder="Seleccionar ubicación (opcional)" :options="locationOptions"
                    :validation="stockMovementSchema.shape.location_id"
                    :disabled="isSubmitting || !formData.warehouse_id || isLoadingLocations" />
            </div>
        </div>

        <!-- Additional Information -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Información Adicional
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField v-model="formData.reference" label="Referencia" type="text"
                    placeholder="Referencia del movimiento" :validation="stockMovementSchema.shape.reference"
                    :disabled="isSubmitting" />

                <FormField v-model="formData.document_type" label="Tipo de Documento" type="text"
                    placeholder="Ej: Factura, Guía, etc." :validation="stockMovementSchema.shape.document_type"
                    :disabled="isSubmitting" />
            </div>
        </div>

        <!-- Form Actions -->
        <div class="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" @click="$emit('cancel')" :disabled="isSubmitting">
                Cancelar
            </Button>

            <Button type="submit" :loading="isSubmitting" :disabled="!isFormValid">
                Registrar Movimiento
            </Button>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProducts } from '@/composables/useProducts'
import { useStockMovements } from '@/composables/useStockMovements'
import { stockMovementSchema, type StockMovementFormData } from '@/schemas/productSchemas'
import FormField from '@/components/ui/FormField.vue'
import Button from '@/components/ui/Button.vue'
import {
    ArrowDown as ArrowDownIcon,
    ArrowUp as ArrowUpIcon,
    ArrowLeftRight as ArrowLeftRightIcon,
} from 'lucide-vue-next'

interface StockMovementFormProps {
    isSubmitting?: boolean
}

interface StockMovementFormEmits {
    submit: [data: StockMovementFormData]
    cancel: []
}

const props = withDefaults(defineProps<StockMovementFormProps>(), {
    isSubmitting: false,
})

const emit = defineEmits<StockMovementFormEmits>()

// Form data
const initializeFormData = (): StockMovementFormData => ({
    product_id: '',
    warehouse_id: '',
    zone_id: null,
    location_id: null,
    movement_type: 'IN',
    quantity: 0,
    unit_cost: null,
    reference: null,
    document_type: null,
    document_id: null,
})

const formData = ref<StockMovementFormData>(initializeFormData())

// Load data from composables
const { products, isLoading: isLoadingProducts } = useProducts()
const {
    warehouses,
    isLoadingWarehouses,
    getWarehouseZones,
    getStorageLocations,
} = useStockMovements()

// Warehouse zones and locations
const selectedWarehouseZones = ref<any>(null)
const selectedStorageLocations = ref<any>(null)

// Movement types configuration
const movementTypes = [
    {
        value: 'IN',
        label: 'Entrada',
        description: 'Ingreso de mercadería',
        icon: ArrowDownIcon,
        color: 'text-green-600 dark:text-green-400',
    },
    {
        value: 'OUT',
        label: 'Salida',
        description: 'Salida de mercadería',
        icon: ArrowUpIcon,
        color: 'text-red-600 dark:text-red-400',
    },
    {
        value: 'TRANSFER',
        label: 'Transferencia',
        description: 'Movimiento entre ubicaciones',
        icon: ArrowLeftRightIcon,
        color: 'text-blue-600 dark:text-blue-400',
    },
]

// Computed options
const productOptions = computed(() => [
    { value: '', label: 'Seleccionar producto' },
    ...(products.value?.map(product => ({
        value: product.id,
        label: `${product.sku} - ${product.name}`,
    })) || []),
])

const warehouseOptions = computed(() => [
    { value: '', label: 'Seleccionar almacén' },
    ...(warehouses.value?.map(warehouse => ({
        value: warehouse.id,
        label: `${warehouse.code} - ${warehouse.name}`,
    })) || []),
])

const zoneOptions = computed(() => {
    const options = [{ value: '', label: 'Sin zona específica' }]

    if (selectedWarehouseZones.value?.data) {
        options.push(...selectedWarehouseZones.value.data.map((zone: any) => ({
            value: zone.id,
            label: `${zone.code} - ${zone.name}`,
        })))
    }

    return options
})

const locationOptions = computed(() => {
    const options = [{ value: '', label: 'Sin ubicación específica' }]

    if (selectedStorageLocations.value?.data) {
        options.push(...selectedStorageLocations.value.data.map((location: any) => ({
            value: location.id,
            label: `${location.code} - ${location.name}`,
        })))
    }

    return options
})

const isLoadingZones = computed(() =>
    selectedWarehouseZones.value?.isLoading || false
)

const isLoadingLocations = computed(() =>
    selectedStorageLocations.value?.isLoading || false
)

const isFormValid = computed(() => {
    try {
        stockMovementSchema.parse(formData.value)
        return true
    } catch {
        return false
    }
})

// Watch warehouse selection to load zones
const onWarehouseChange = (warehouseId: string) => {
    // Reset dependent fields
    formData.value.zone_id = null
    formData.value.location_id = null

    if (warehouseId) {
        selectedWarehouseZones.value = getWarehouseZones(warehouseId)
        selectedStorageLocations.value = getStorageLocations(warehouseId)
    } else {
        selectedWarehouseZones.value = null
        selectedStorageLocations.value = null
    }
}

// Watch zone selection to load locations
const onZoneChange = (zoneId: string) => {
    // Reset location
    formData.value.location_id = null

    if (formData.value.warehouse_id) {
        selectedStorageLocations.value = getStorageLocations(
            formData.value.warehouse_id,
            zoneId || undefined
        )
    }
}

// Form submission
const handleSubmit = () => {
    try {
        const validatedData = stockMovementSchema.parse(formData.value)

        // Convert empty strings to null for optional fields
        if (validatedData.zone_id === '') {
            validatedData.zone_id = null
        }
        if (validatedData.location_id === '') {
            validatedData.location_id = null
        }
        if (validatedData.reference === '') {
            validatedData.reference = null
        }
        if (validatedData.document_type === '') {
            validatedData.document_type = null
        }
        if (validatedData.unit_cost === 0) {
            validatedData.unit_cost = null
        }

        emit('submit', validatedData)
    } catch (error) {
        console.error('Form validation error:', error)
    }
}

// Reset form
const resetForm = () => {
    formData.value = initializeFormData()
    selectedWarehouseZones.value = null
    selectedStorageLocations.value = null
}

// Expose methods for parent component
defineExpose({
    resetForm,
})
</script>
