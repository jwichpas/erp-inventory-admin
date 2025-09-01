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

        <!-- Generation Method -->
        <div class="space-y-4">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white">Método de Generación</h4>

            <div class="grid grid-cols-2 gap-4">
                <label v-for="method in generationMethods" :key="method.value" :class="[
                    'relative flex cursor-pointer rounded-lg border p-4 focus:outline-none',
                    generationMethod === method.value
                        ? 'border-blue-600 ring-2 ring-blue-600 dark:border-blue-400 dark:ring-blue-400'
                        : 'border-gray-300 dark:border-gray-600'
                ]">
                    <input v-model="generationMethod" type="radio" :value="method.value" class="sr-only" />
                    <div class="flex flex-1 items-center">
                        <div class="flex flex-col">
                            <span class="block text-sm font-medium text-gray-900 dark:text-white">
                                {{ method.label }}
                            </span>
                            <span class="block text-sm text-gray-500 dark:text-gray-400">
                                {{ method.description }}
                            </span>
                        </div>
                    </div>
                </label>
            </div>
        </div>

        <!-- Manual Input -->
        <div v-if="generationMethod === 'manual'" class="space-y-4">
            <FormField v-model="manualCodes" label="Códigos" type="textarea"
                placeholder="Ingresa un código por línea&#10;Ejemplo:&#10;ABC001&#10;ABC002&#10;ABC003" :rows="8"
                required help-text="Ingresa un código por línea. Se crearán tantos items como códigos ingreses." />
        </div>

        <!-- Automatic Generation -->
        <div v-else-if="generationMethod === 'auto'" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField v-model="autoGeneration.prefix" label="Prefijo" type="text" placeholder="ABC"
                    help-text="Prefijo para los códigos generados" />

                <FormField v-model="autoGeneration.startNumber" label="Número Inicial" type="number" placeholder="1"
                    required :min="1" />

                <FormField v-model="autoGeneration.count" label="Cantidad" type="number" placeholder="10" required
                    :min="1" :max="1000" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField v-model="autoGeneration.digits" label="Dígitos" type="number" placeholder="3" required
                    :min="1" :max="10" help-text="Número de dígitos para el número secuencial" />

                <FormField v-model="autoGeneration.suffix" label="Sufijo" type="text" placeholder=""
                    help-text="Sufijo opcional para los códigos" />
            </div>

            <!-- Preview -->
            <div v-if="previewCodes.length > 0" class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h5 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Vista Previa (primeros 5 códigos)
                </h5>
                <div class="text-sm text-gray-600 dark:text-gray-400 font-mono">
                    <div v-for="code in previewCodes.slice(0, 5)" :key="code">
                        {{ code }}
                    </div>
                    <div v-if="previewCodes.length > 5" class="text-gray-500 dark:text-gray-400">
                        ... y {{ previewCodes.length - 5 }} más
                    </div>
                </div>
            </div>
        </div>

        <!-- Common Settings -->
        <div class="space-y-4">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white">Configuración Común</h4>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField v-model="commonSettings.warehouse_id" label="Almacén" type="select"
                    placeholder="Seleccionar almacén" required :options="warehouseOptions"
                    :disabled="isLoadingWarehouses" @update:model-value="onWarehouseChange" />

                <FormField v-model="commonSettings.zone_id" label="Zona" type="select" placeholder="Sin zona específica"
                    :options="zoneOptions" :disabled="!commonSettings.warehouse_id || isLoadingZones"
                    @update:model-value="onZoneChange" />

                <FormField v-model="commonSettings.location_id" label="Ubicación" type="select"
                    placeholder="Sin ubicación específica" :options="locationOptions"
                    :disabled="!commonSettings.warehouse_id || isLoadingLocations" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField v-model="commonSettings.status" label="Estado Inicial" type="select" required
                    :options="statusOptions" />

                <FormField v-model="commonSettings.purchase_date" label="Fecha de Compra" type="date" />
            </div>

            <FormField v-model="commonSettings.notes" label="Notas" type="textarea"
                placeholder="Notas que se aplicarán a todos los códigos" :rows="2" />
        </div>

        <!-- Summary -->
        <div v-if="totalCodes > 0" class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div class="flex items-center">
                <InfoIcon class="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                <span class="text-sm text-blue-800 dark:text-blue-200">
                    Se crearán <strong>{{ totalCodes }}</strong> código{{ totalCodes !== 1 ? 's' : '' }} único{{
                        totalCodes !== 1 ? 's' : '' }}
                </span>
            </div>
        </div>

        <!-- Form Actions -->
        <div class="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" @click="$emit('cancel')" :disabled="isSubmitting">
                Cancelar
            </Button>

            <Button type="submit" :loading="isSubmitting" :disabled="!isFormValid || totalCodes === 0">
                Crear {{ totalCodes }} Código{{ totalCodes !== 1 ? 's' : '' }}
            </Button>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStockMovements } from '@/composables/useStockMovements'
import { useProductCodes } from '@/composables/useProductCodes'
import FormField from '@/components/ui/FormField.vue'
import Button from '@/components/ui/Button.vue'
import { Info as InfoIcon } from 'lucide-vue-next'
import type { Product } from '@/types/database'
import type { ProductCodeFormData } from '@/schemas/productSchemas'

interface BulkProductCodeFormProps {
    product: Product | null
    isSubmitting?: boolean
}

interface BulkProductCodeFormEmits {
    submit: [codes: ProductCodeFormData[]]
    cancel: []
}

const props = withDefaults(defineProps<BulkProductCodeFormProps>(), {
    isSubmitting: false,
})

const emit = defineEmits<BulkProductCodeFormEmits>()

// Form state
const generationMethod = ref<'manual' | 'auto'>('auto')
const manualCodes = ref('')

const autoGeneration = ref({
    prefix: '',
    startNumber: 1,
    count: 10,
    digits: 3,
    suffix: '',
})

const commonSettings = ref({
    warehouse_id: '',
    zone_id: null as string | null,
    location_id: null as string | null,
    status: 'AVAILABLE' as const,
    purchase_date: null as string | null,
    notes: null as string | null,
})

// Load data from composables
const { warehouses, isLoadingWarehouses, getWarehouseZones, getStorageLocations } = useStockMovements()
const { statusOptions } = useProductCodes()

// Warehouse zones and locations
const selectedWarehouseZones = ref<any>(null)
const selectedStorageLocations = ref<any>(null)

// Generation methods
const generationMethods = [
    {
        value: 'manual',
        label: 'Manual',
        description: 'Ingresa códigos manualmente',
    },
    {
        value: 'auto',
        label: 'Automático',
        description: 'Genera códigos secuenciales',
    },
]

// Computed properties
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

// Generate preview codes for automatic generation
const previewCodes = computed(() => {
    if (generationMethod.value !== 'auto') return []

    const { prefix, startNumber, count, digits, suffix } = autoGeneration.value
    const codes: string[] = []

    for (let i = 0; i < Math.min(count, 100); i++) {
        const number = (startNumber + i).toString().padStart(digits, '0')
        const code = `${prefix}${number}${suffix}`
        codes.push(code)
    }

    return codes
})

// Get manual codes array
const manualCodesArray = computed(() => {
    if (generationMethod.value !== 'manual') return []

    return manualCodes.value
        .split('\n')
        .map(code => code.trim())
        .filter(code => code.length > 0)
})

// Total codes to be created
const totalCodes = computed(() => {
    if (generationMethod.value === 'manual') {
        return manualCodesArray.value.length
    } else {
        return autoGeneration.value.count
    }
})

// Form validation
const isFormValid = computed(() => {
    if (!props.product || !commonSettings.value.warehouse_id) return false

    if (generationMethod.value === 'manual') {
        return manualCodesArray.value.length > 0
    } else {
        return autoGeneration.value.count > 0 && autoGeneration.value.startNumber > 0
    }
})

// Watch warehouse selection to load zones
const onWarehouseChange = (warehouseId: string) => {
    // Reset dependent fields
    commonSettings.value.zone_id = null
    commonSettings.value.location_id = null

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
    commonSettings.value.location_id = null

    if (commonSettings.value.warehouse_id) {
        selectedStorageLocations.value = getStorageLocations(
            commonSettings.value.warehouse_id,
            zoneId || undefined
        )
    }
}

// Form submission
const handleSubmit = () => {
    if (!props.product || !isFormValid.value) return

    let codes: string[] = []

    if (generationMethod.value === 'manual') {
        codes = manualCodesArray.value
    } else {
        codes = previewCodes.value
    }

    // Create ProductCodeFormData array
    const productCodes: ProductCodeFormData[] = codes.map(code => ({
        product_id: props.product!.id,
        code,
        status: commonSettings.value.status,
        warehouse_id: commonSettings.value.warehouse_id,
        zone_id: commonSettings.value.zone_id,
        location_id: commonSettings.value.location_id,
        purchase_date: commonSettings.value.purchase_date,
        sale_date: null,
        notes: commonSettings.value.notes,
    }))

    emit('submit', productCodes)
}

// Initialize with product SKU as prefix
watch(
    () => props.product,
    (newProduct) => {
        if (newProduct && !autoGeneration.value.prefix) {
            autoGeneration.value.prefix = newProduct.sku
        }
    },
    { immediate: true }
)
</script>
