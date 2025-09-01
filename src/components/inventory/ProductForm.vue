<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Basic Information -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Información Básica
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField v-model="formData.sku" label="SKU" type="text" placeholder="Código único del producto"
                    required :validation="productSchema.shape.sku" :disabled="isSubmitting" />

                <FormField v-model="formData.barcode" label="Código de Barras" type="text"
                    placeholder="Código de barras opcional" :validation="productSchema.shape.barcode"
                    :disabled="isSubmitting" />

                <FormField v-model="formData.name" label="Nombre del Producto" type="text"
                    placeholder="Nombre descriptivo del producto" required :validation="productSchema.shape.name"
                    :disabled="isSubmitting" />

                <FormField v-model="formData.description" label="Descripción" type="textarea"
                    placeholder="Descripción opcional del producto" :rows="2"
                    :validation="productSchema.shape.description" :disabled="isSubmitting" />

                <FormField v-model="formData.brand_id" label="Marca" type="select" placeholder="Seleccionar marca"
                    required :options="brandOptions" :validation="productSchema.shape.brand_id"
                    :disabled="isSubmitting || isLoadingBrands" />

                <FormField v-model="formData.category_id" label="Categoría" type="select"
                    placeholder="Seleccionar categoría" required :options="categoryOptions"
                    :validation="productSchema.shape.category_id" :disabled="isSubmitting || isLoadingCategories" />
            </div>
        </div>

        <!-- SUNAT Information -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Información SUNAT
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField v-model="formData.unit_code" label="Unidad de Medida" type="select"
                    placeholder="Seleccionar unidad" required :options="unitMeasureOptions"
                    :validation="productSchema.shape.unit_code" :disabled="isSubmitting || isLoadingSUNAT" />

                <FormField v-model="formData.tipo_afectacion" label="Tipo de Afectación IGV" type="select"
                    placeholder="Seleccionar afectación" required :options="taxAffectationOptions"
                    :validation="productSchema.shape.tipo_afectacion" :disabled="isSubmitting || isLoadingSUNAT" />
            </div>
        </div>

        <!-- Inventory Configuration -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Configuración de Inventario
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField v-model="formData.min_stock" label="Stock Mínimo" type="number" placeholder="0" required
                    :validation="productSchema.shape.min_stock" :disabled="isSubmitting" />

                <FormField v-model="formData.max_stock" label="Stock Máximo" type="number" placeholder="Opcional"
                    :validation="productSchema.shape.max_stock" :disabled="isSubmitting" />

                <FormField v-model="formData.reorder_point" label="Punto de Reorden" type="number"
                    placeholder="Opcional" :validation="productSchema.shape.reorder_point" :disabled="isSubmitting" />

                <FormField v-model="formData.weight_kg" label="Peso (kg)" type="number" placeholder="Peso en kilogramos"
                    :validation="productSchema.shape.weight_kg" :disabled="isSubmitting" />

                <div class="flex items-center space-x-4">
                    <FormField v-model="formData.is_serialized" label="" type="checkbox"
                        checkbox-label="Producto Serializado" :validation="productSchema.shape.is_serialized"
                        :disabled="isSubmitting" />
                </div>

                <div class="flex items-center space-x-4">
                    <FormField v-model="formData.is_batch_controlled" label="" type="checkbox"
                        checkbox-label="Control por Lotes" :validation="productSchema.shape.is_batch_controlled"
                        :disabled="isSubmitting" />
                </div>

                <div class="flex items-center space-x-4">
                    <FormField v-model="formData.active" label="" type="checkbox" checkbox-label="Producto Activo"
                        :validation="productSchema.shape.active" :disabled="isSubmitting" />
                </div>
            </div>
        </div>

        <!-- Dimensions (Optional) -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                    Dimensiones (Opcional)
                </h3>
                <button type="button" @click="showDimensions = !showDimensions"
                    class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                    {{ showDimensions ? 'Ocultar' : 'Mostrar' }} Dimensiones
                </button>
            </div>

            <div v-if="showDimensions" class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormField v-model="dimensionsData.width" label="Ancho (cm)" type="number" placeholder="0"
                    :disabled="isSubmitting" />

                <FormField v-model="dimensionsData.height" label="Alto (cm)" type="number" placeholder="0"
                    :disabled="isSubmitting" />

                <FormField v-model="dimensionsData.length" label="Largo (cm)" type="number" placeholder="0"
                    :disabled="isSubmitting" />
            </div>
        </div>

        <!-- Form Actions -->
        <div class="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" @click="$emit('cancel')" :disabled="isSubmitting">
                Cancelar
            </Button>

            <Button type="submit" :loading="isSubmitting" :disabled="!isFormValid">
                {{ isEditing ? 'Actualizar' : 'Crear' }} Producto
            </Button>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useBrands } from '@/composables/useBrands'
import { useCategories } from '@/composables/useCategories'
import { useSUNATCatalogs } from '@/composables/useSUNATCatalogs'
import { productSchema, type ProductFormData } from '@/schemas/productSchemas'
import FormField from '@/components/ui/FormField.vue'
import Button from '@/components/ui/Button.vue'
import type { Product } from '@/types/database'

interface ProductFormProps {
    product?: Product | null
    isSubmitting?: boolean
}

interface ProductFormEmits {
    submit: [data: ProductFormData]
    cancel: []
}

const props = withDefaults(defineProps<ProductFormProps>(), {
    product: null,
    isSubmitting: false,
})

const emit = defineEmits<ProductFormEmits>()

// Form state
const showDimensions = ref(false)
const dimensionsData = ref({
    width: null as number | null,
    height: null as number | null,
    length: null as number | null,
})

// Initialize form data
const initializeFormData = (): ProductFormData => ({
    sku: '',
    barcode: null,
    name: '',
    description: null,
    brand_id: '',
    category_id: '',
    unit_code: '',
    tipo_afectacion: '',
    dimensions: null,
    weight_kg: null,
    is_serialized: false,
    is_batch_controlled: false,
    min_stock: 0,
    max_stock: null,
    reorder_point: null,
    active: true,
    tags: null,
    metadata: null,
})

const formData = ref<ProductFormData>(initializeFormData())

// Load data from composables
const { activeBrands, isLoading: isLoadingBrands } = useBrands()
const { flatCategories, isLoading: isLoadingCategories } = useCategories()
const {
    unitMeasureOptions,
    taxAffectationOptions,
    isLoading: isLoadingSUNAT,
} = useSUNATCatalogs()

// Computed properties
const isEditing = computed(() => !!props.product)

const brandOptions = computed(() => [
    { value: '', label: 'Sin marca' },
    ...activeBrands.value.map(brand => ({
        value: brand.id,
        label: brand.name,
    })),
])

const categoryOptions = computed(() => [
    { value: '', label: 'Sin categoría' },
    ...flatCategories.value.map(category => ({
        value: category.id,
        label: '  '.repeat(category.level || 0) + category.name,
    })),
])

const isFormValid = computed(() => {
    try {
        productSchema.parse(formData.value)
        return true
    } catch {
        return false
    }
})

// Watch for product changes (editing mode)
watch(
    () => props.product,
    (newProduct) => {
        if (newProduct) {
            formData.value = {
                sku: newProduct.sku,
                barcode: newProduct.barcode,
                name: newProduct.name,
                description: newProduct.description,
                brand_id: newProduct.brand_id,
                category_id: newProduct.category_id,
                unit_code: newProduct.unit_code,
                tipo_afectacion: newProduct.tipo_afectacion,
                dimensions: newProduct.dimensions,
                weight_kg: newProduct.weight_kg,
                is_serialized: newProduct.is_serialized,
                is_batch_controlled: newProduct.is_batch_controlled,
                min_stock: newProduct.min_stock,
                max_stock: newProduct.max_stock,
                reorder_point: newProduct.reorder_point,
                active: newProduct.active,
                tags: newProduct.tags,
                metadata: newProduct.metadata,
            }

            // Show dimensions if they exist
            if (newProduct.dimensions) {
                showDimensions.value = true
                dimensionsData.value = {
                    width: newProduct.dimensions.width || null,
                    height: newProduct.dimensions.height || null,
                    length: newProduct.dimensions.length || null,
                }
            }
        } else {
            formData.value = initializeFormData()
            showDimensions.value = false
            dimensionsData.value = {
                width: null,
                height: null,
                length: null,
            }
        }
    },
    { immediate: true }
)

// Watch dimensions data and sync with form data
watch(
    dimensionsData,
    (newDimensions) => {
        if (newDimensions.width || newDimensions.height || newDimensions.length) {
            formData.value.dimensions = { ...newDimensions }
        } else {
            formData.value.dimensions = null
        }
    },
    { deep: true }
)

// Form submission
const handleSubmit = () => {
    try {
        const validatedData = productSchema.parse(formData.value)

        // Clean up dimensions if all values are empty
        if (validatedData.dimensions) {
            const { width, height, length, weight } = validatedData.dimensions
            if (!width && !height && !length && !weight) {
                validatedData.dimensions = null
            }
        }

        // Convert empty strings to null for optional fields
        if (validatedData.brand_id === '') {
            validatedData.brand_id = null
        }
        if (validatedData.category_id === '') {
            validatedData.category_id = null
        }

        emit('submit', validatedData)
    } catch (error) {
        console.error('Form validation error:', error)
    }
}

// Reset form
const resetForm = () => {
    formData.value = initializeFormData()
    showDimensions.value = false
    dimensionsData.value = {
        width: null,
        height: null,
        length: null,
    }
}

// Expose methods for parent component
defineExpose({
    resetForm,
})
</script>
