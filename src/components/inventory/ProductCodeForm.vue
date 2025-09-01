<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Product Information (Read-only) -->
        <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Producto</h4>
            <div class="text-sm text-gray-600 dark:text-gray-400">
                <div><strong>{{ product?.name }}</strong></div>
                <div>SKU: {{ product?.sku }}</div>
            </div>
        </div>

        <!-- Code Information -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField v-model="formData.code" label="Código Único" type="text" placeholder="Código único del item"
                required :validation="productCodeSchema.shape.code" :disabled="isSubmitting"
                help-text="Código único que identifica este item específico" />

            <FormField v-model="formData.status" label="Estado" type="select" placeholder="Seleccionar estado" required
                :options="statusOptions" :validation="productCodeSchema.shape.status" :disabled="isSubmitting" />
        </div>

        <!-- Location Information -->
        <div class="space-y-4">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white">Ubicación</h4>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField v-model="formData.warehouse_id" label="Almacén" type="select"
                    placeholder="Seleccionar almacén" required :options="warehouseOptions"
                    :validation="productCodeSchema.shape.warehouse_id" :disabled="isSubmitting || isLoadingWarehouses"
                    @update:model-value="onWarehouseChange" />

                <FormField v-model="formData.zone_id" label="Zona" type="select" placeholder="Sin zona específica"
                    :options="zoneOptions" :validation="productCodeSchema.shape.zone_id"
                    :disabled="isSubmitting || !formData.warehouse_id || isLoadingZones"
                    @update:model-value="onZoneChange" />

                <FormField v-model="formData.location_id" label="Ubicación" type="select"
                    placeholder="Sin ubicación específica" :options="locationOptions"
                    :validation="productCodeSchema.shape.location_id"
                    :disabled="isSubmitting || !formData.warehouse_id || isLoadingLocations" />
            </div>
        </div>

        <!-- Date Information -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField v-model="formData.purchase_date" label="Fecha de Compra" type="date"
                :validation="productCodeSchema.shape.purchase_date" :disabled="isSubmitting" />

            <FormField v-model="formData.sale_date" label="Fecha de Venta" type="date"
                :validation="productCodeSchema.shape.sale_date" :disabled="isSubmitting || formData.status !== 'SOLD'"
                help-text="Solo disponible para items vendidos" />
        </div>

        <!-- Notes -->
        <FormField v-model="formData.notes" label="Notas" type="textarea"
            placeholder="Notas adicionales sobre este item" :rows="3" :validation="productCodeSchema.shape.notes"
            :disabled="isSubmitting" />

        <!-- Form Actions -->
        <div class="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" @click="$emit('cancel')" :disabled="isSubmitting">
                Cancelar
            </Button>

            <Button type="submit" :loading="isSubmitting" :disabled="!isFormValid">
                {{ isEditing ? 'Actualizar' : 'Crear' }} Código
            </Button>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useStockMovements } from '@/composables/useStockMovements'
import { useProductCodes } from '@/composables/useProductCodes'
import { productCodeSchema, type ProductCodeFormData } from '@/schemas/productSchemas'
import FormField from '@/components/ui/FormField.vue'
import Button from '@/components/ui/Button.vue'
import type { Product, ProductCode } from '@/types/database'

interface ProductCodeFormProps {
    product: Product | null
    productCode?: ProductCode | null
    isSubmitting?: boolean
}

interface ProductCodeFormEmits {
    submit: [data: ProductCodeFormData]
    cancel: []
}

const props = withDefaults(defineProps<ProductCodeFormProps>(), {
    productCode: null,
    isSubmitting: false,
})

const emit = defineEmits<ProductCodeFormEmits>()

// Form data
const initializeFormData = (): ProductCodeFormData => ({
    product_id: props.product?.id || '',
    code: '',
    status: 'AVAILABLE',
    warehouse_id: '',
    zone_id: null,
    location_id: null,
    purchase_date: null,
    sale_date: null,
    notes: null,
})

const formData = ref<ProductCodeFormData>(initializeFormData())

// Load data from composables
const { warehouses, isLoadingWarehouses, getWarehouseZones, getStorageLocations } = useStockMovements()
const { statusOptions } = useProductCodes()

// Warehouse zones and locations
const selectedWarehouseZones = ref<any>(null)
const selectedStorageLocations = ref<any>(null)

// Computed properties
const isEditing = computed(() => !!props.productCode)

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
        productCodeSchema.parse(formData.value)
        return true
    } catch {
        return false
    }
})

// Watch for product code changes (editing mode)
watch(
    () => props.productCode,
    (newProductCode) => {
        if (newProductCode) {
            formData.value = {
                product_id: newProductCode.product_id,
                code: newProductCode.code,
                status: newProductCode.status,
                warehouse_id: newProductCode.warehouse_id,
                zone_id: newProductCode.zone_id,
                location_id: newProductCode.location_id,
                purchase_date: newProductCode.purchase_date,
                sale_date: newProductCode.sale_date,
                notes: newProductCode.notes,
            }

            // Load zones and locations for the selected warehouse
            if (newProductCode.warehouse_id) {
                onWarehouseChange(newProductCode.warehouse_id)
            }
        } else {
            formData.value = initializeFormData()
        }
    },
    { immediate: true }
)

// Watch product changes
watch(
    () => props.product,
    (newProduct) => {
        if (newProduct && !props.productCode) {
            formData.value.product_id = newProduct.id
        }
    },
    { immediate: true }
)

// Watch status changes to handle sale date
watch(
    () => formData.value.status,
    (newStatus, oldStatus) => {
        if (newStatus === 'SOLD' && oldStatus !== 'SOLD' && !formData.value.sale_date) {
            // Auto-set sale date when status changes to SOLD
            formData.value.sale_date = new Date().toISOString().split('T')[0]
        } else if (newStatus !== 'SOLD') {
            // Clear sale date when status is not SOLD
            formData.value.sale_date = null
        }
    }
)

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
        const validatedData = productCodeSchema.parse(formData.value)

        // Convert empty strings to null for optional fields
        if (validatedData.zone_id === '') {
            validatedData.zone_id = null
        }
        if (validatedData.location_id === '') {
            validatedData.location_id = null
        }
        if (validatedData.purchase_date === '') {
            validatedData.purchase_date = null
        }
        if (validatedData.sale_date === '') {
            validatedData.sale_date = null
        }
        if (validatedData.notes === '') {
            validatedData.notes = null
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
