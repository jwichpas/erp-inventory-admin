<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Marcas</h2>
                <p class="mt-1 text-gray-600 dark:text-gray-400">
                    Gestiona las marcas de productos
                </p>
            </div>
            <Button @click="showCreateModal = true">
                <PlusIcon class="w-4 h-4 mr-2" />
                Nueva Marca
            </Button>
        </div>

        <!-- Search and Filters -->
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div class="flex items-center space-x-4">
                <div class="flex-1 max-w-sm">
                    <FormField v-model="searchTerm" type="text" placeholder="Buscar marcas..." />
                </div>
                <label class="flex items-center">
                    <input v-model="showInactive" type="checkbox"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700" />
                    <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Mostrar inactivas
                    </span>
                </label>
            </div>
        </div>

        <!-- Brands Grid -->
        <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="i in 6" :key="i" class="animate-pulse">
                <div
                    class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
            </div>
        </div>

        <div v-else-if="filteredBrands.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="brand in filteredBrands" :key="brand.id"
                class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                            {{ brand.name }}
                        </h3>
                        <p v-if="brand.code" class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Código: {{ brand.code }}
                        </p>
                        <div class="mt-2 flex items-center">
                            <span :class="[
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                brand.active
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            ]">
                                {{ brand.active ? 'Activa' : 'Inactiva' }}
                            </span>
                        </div>
                    </div>

                    <div class="flex items-center space-x-2 ml-4">
                        <button @click="editBrand(brand)"
                            class="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                            :disabled="isMutating">
                            <EditIcon class="w-4 h-4" />
                        </button>
                        <button @click="confirmDelete(brand)"
                            class="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                            :disabled="isMutating">
                            <TrashIcon class="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
            <TagIcon class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {{ searchTerm ? 'No se encontraron marcas' : 'No hay marcas' }}
            </h3>
            <p class="text-gray-500 dark:text-gray-400 mb-4">
                {{ searchTerm
                    ? 'Intenta ajustar tu búsqueda.'
                    : 'Comienza creando tu primera marca.'
                }}
            </p>
            <Button v-if="!searchTerm" @click="showCreateModal = true">
                <PlusIcon class="w-4 h-4 mr-2" />
                Crear Marca
            </Button>
        </div>

        <!-- Create/Edit Modal -->
        <Modal :show="showCreateModal || showEditModal" :title="editingBrand ? 'Editar Marca' : 'Nueva Marca'" size="md"
            @close="closeModal">
            <form @submit.prevent="handleSubmit" class="space-y-4">
                <FormField v-model="formData.name" label="Nombre" type="text" placeholder="Nombre de la marca" required
                    :validation="brandSchema.shape.name" :disabled="isSubmitting" />

                <FormField v-model="formData.code" label="Código" type="text" placeholder="Código opcional de la marca"
                    :validation="brandSchema.shape.code" :disabled="isSubmitting" />

                <FormField v-model="formData.active" label="" type="checkbox" checkbox-label="Marca activa"
                    :validation="brandSchema.shape.active" :disabled="isSubmitting" />
            </form>

            <template #footer>
                <Button variant="outline" @click="closeModal" :disabled="isSubmitting">
                    Cancelar
                </Button>
                <Button @click="handleSubmit" :loading="isSubmitting">
                    {{ editingBrand ? 'Actualizar' : 'Crear' }}
                </Button>
            </template>
        </Modal>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useBrands } from '@/composables/useBrands'
import { brandSchema, type BrandFormData } from '@/schemas/productSchemas'
import FormField from '@/components/ui/FormField.vue'
import Button from '@/components/ui/Button.vue'
import Modal from '@/components/ui/Modal.vue'
import {
    Plus as PlusIcon,
    Edit as EditIcon,
    Trash2 as TrashIcon,
    Tag as TagIcon,
} from 'lucide-vue-next'
import type { Brand } from '@/types/database'

// State
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingBrand = ref<Brand | null>(null)
const searchTerm = ref('')
const showInactive = ref(false)
const isSubmitting = ref(false)

// Form data
const initializeFormData = (): BrandFormData => ({
    name: '',
    code: null,
    active: true,
})

const formData = ref<BrandFormData>(initializeFormData())

// Use brands composable
const {
    brands,
    isLoading,
    createBrand,
    updateBrand,
    deleteBrand,
    isMutating,
    updateFilters,
} = useBrands()

// Computed properties
const filteredBrands = computed(() => {
    if (!brands.value) return []

    let filtered = [...brands.value]

    // Search filter
    if (searchTerm.value) {
        const search = searchTerm.value.toLowerCase()
        filtered = filtered.filter(brand =>
            brand.name.toLowerCase().includes(search) ||
            (brand.code && brand.code.toLowerCase().includes(search))
        )
    }

    // Active/inactive filter
    if (!showInactive.value) {
        filtered = filtered.filter(brand => brand.active)
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name))
})

// Watch search term and update filters
watch(searchTerm, (newTerm) => {
    updateFilters({ search: newTerm })
}, { debounce: 300 })

// Modal management
const closeModal = () => {
    showCreateModal.value = false
    showEditModal.value = false
    editingBrand.value = null
    formData.value = initializeFormData()
}

const editBrand = (brand: Brand) => {
    editingBrand.value = brand
    formData.value = {
        name: brand.name,
        code: brand.code,
        active: brand.active,
    }
    showEditModal.value = true
}

// Form submission
const handleSubmit = async () => {
    try {
        isSubmitting.value = true

        const validatedData = brandSchema.parse(formData.value)

        if (editingBrand.value) {
            await updateBrand(editingBrand.value.id, validatedData)
        } else {
            await createBrand(validatedData)
        }

        closeModal()
    } catch (error) {
        console.error('Error saving brand:', error)
    } finally {
        isSubmitting.value = false
    }
}

// Delete confirmation
const confirmDelete = async (brand: Brand) => {
    if (confirm(`¿Estás seguro de que quieres eliminar la marca "${brand.name}"?`)) {
        try {
            await deleteBrand(brand.id)
        } catch (error) {
            console.error('Error deleting brand:', error)
        }
    }
}
</script>
