<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Categorías</h2>
                <p class="mt-1 text-gray-600 dark:text-gray-400">
                    Gestiona las categorías de productos con estructura jerárquica
                </p>
            </div>
            <Button @click="showCreateModal = true">
                <PlusIcon class="w-4 h-4 mr-2" />
                Nueva Categoría
            </Button>
        </div>

        <!-- Search and Filters -->
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div class="flex items-center space-x-4">
                <div class="flex-1 max-w-sm">
                    <FormField v-model="searchTerm" type="text" placeholder="Buscar categorías..." />
                </div>
                <label class="flex items-center">
                    <input v-model="showInactive" type="checkbox"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700" />
                    <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Mostrar inactivas
                    </span>
                </label>
                <Button variant="outline" @click="toggleView">
                    {{ viewMode === 'tree' ? 'Vista Lista' : 'Vista Árbol' }}
                </Button>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="space-y-4">
            <div v-for="i in 5" :key="i" class="animate-pulse">
                <div
                    class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
            </div>
        </div>

        <!-- Tree View -->
        <div v-else-if="viewMode === 'tree' && filteredCategoryTree.length > 0" class="space-y-2">
            <CategoryTreeNode v-for="category in filteredCategoryTree" :key="category.id" :category="category"
                :level="0" @edit="editCategory" @delete="confirmDelete" @add-child="addChildCategory"
                :is-mutating="isMutating" />
        </div>

        <!-- List View -->
        <div v-else-if="viewMode === 'list' && filteredCategories.length > 0"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="category in filteredCategories" :key="category.id"
                class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center">
                            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                                {{ category.name }}
                            </h3>
                            <span v-if="category.level && category.level > 0"
                                class="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                Nivel {{ category.level + 1 }}
                            </span>
                        </div>
                        <p v-if="category.code" class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Código: {{ category.code }}
                        </p>
                        <div class="mt-2 flex items-center space-x-2">
                            <span :class="[
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                category.active
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            ]">
                                {{ category.active ? 'Activa' : 'Inactiva' }}
                            </span>
                            <span v-if="category.children && category.children.length > 0"
                                class="text-xs text-gray-500 dark:text-gray-400">
                                {{ category.children.length }} subcategoría{{ category.children.length !== 1 ? 's' : ''
                                }}
                            </span>
                        </div>
                    </div>

                    <div class="flex items-center space-x-2 ml-4">
                        <button @click="addChildCategory(category)"
                            class="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                            :disabled="isMutating" title="Agregar subcategoría">
                            <PlusIcon class="w-4 h-4" />
                        </button>
                        <button @click="editCategory(category)"
                            class="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                            :disabled="isMutating">
                            <EditIcon class="w-4 h-4" />
                        </button>
                        <button @click="confirmDelete(category)"
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
            <FolderIcon class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {{ searchTerm ? 'No se encontraron categorías' : 'No hay categorías' }}
            </h3>
            <p class="text-gray-500 dark:text-gray-400 mb-4">
                {{ searchTerm
                    ? 'Intenta ajustar tu búsqueda.'
                    : 'Comienza creando tu primera categoría.'
                }}
            </p>
            <Button v-if="!searchTerm" @click="showCreateModal = true">
                <PlusIcon class="w-4 h-4 mr-2" />
                Crear Categoría
            </Button>
        </div>

        <!-- Create/Edit Modal -->
        <Modal :show="showCreateModal || showEditModal" :title="getModalTitle" size="md" @close="closeModal">
            <form @submit.prevent="handleSubmit" class="space-y-4">
                <FormField v-model="formData.name" label="Nombre" type="text" placeholder="Nombre de la categoría"
                    required :validation="categorySchema.shape.name" :disabled="isSubmitting" />

                <FormField v-model="formData.code" label="Código" type="text"
                    placeholder="Código opcional de la categoría" :validation="categorySchema.shape.code"
                    :disabled="isSubmitting" />

                <FormField v-model="formData.parent_id" label="Categoría Padre" type="select"
                    placeholder="Sin categoría padre (raíz)" :options="parentCategoryOptions"
                    :validation="categorySchema.shape.parent_id" :disabled="isSubmitting" />

                <FormField v-model="formData.active" label="" type="checkbox" checkbox-label="Categoría activa"
                    :validation="categorySchema.shape.active" :disabled="isSubmitting" />
            </form>

            <template #footer>
                <Button variant="outline" @click="closeModal" :disabled="isSubmitting">
                    Cancelar
                </Button>
                <Button @click="handleSubmit" :loading="isSubmitting">
                    {{ editingCategory ? 'Actualizar' : 'Crear' }}
                </Button>
            </template>
        </Modal>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCategories } from '@/composables/useCategories'
import { categorySchema, type CategoryFormData } from '@/schemas/productSchemas'
import FormField from '@/components/ui/FormField.vue'
import Button from '@/components/ui/Button.vue'
import Modal from '@/components/ui/Modal.vue'
import CategoryTreeNode from './CategoryTreeNode.vue'
import {
    Plus as PlusIcon,
    Edit as EditIcon,
    Trash2 as TrashIcon,
    Folder as FolderIcon,
} from 'lucide-vue-next'
import type { Category, CategoryTreeNode as CategoryTreeNodeType } from '@/types/database'

// State
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingCategory = ref<Category | null>(null)
const parentCategory = ref<Category | null>(null)
const searchTerm = ref('')
const showInactive = ref(false)
const viewMode = ref<'tree' | 'list'>('tree')
const isSubmitting = ref(false)

// Form data
const initializeFormData = (): CategoryFormData => ({
    name: '',
    code: null,
    parent_id: null,
    active: true,
})

const formData = ref<CategoryFormData>(initializeFormData())

// Use categories composable
const {
    categories,
    categoryTree,
    flatCategories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    isMutating,
    updateFilters,
} = useCategories()

// Computed properties
const filteredCategories = computed(() => {
    if (!flatCategories.value) return []

    let filtered = [...flatCategories.value]

    // Search filter
    if (searchTerm.value) {
        const search = searchTerm.value.toLowerCase()
        filtered = filtered.filter(category =>
            category.name.toLowerCase().includes(search) ||
            (category.code && category.code.toLowerCase().includes(search))
        )
    }

    // Active/inactive filter
    if (!showInactive.value) {
        filtered = filtered.filter(category => category.active)
    }

    return filtered
})

const filteredCategoryTree = computed(() => {
    if (!categoryTree.value) return []

    const filterTree = (nodes: CategoryTreeNodeType[]): CategoryTreeNodeType[] => {
        return nodes.filter(node => {
            // Check if node matches search
            let matches = true

            if (searchTerm.value) {
                const search = searchTerm.value.toLowerCase()
                matches = node.name.toLowerCase().includes(search) ||
                    (node.description && node.description.toLowerCase().includes(search))
            }

            if (!showInactive.value && !node.is_active) {
                matches = false
            }

            // Filter children recursively
            if (node.children) {
                node.children = filterTree(node.children)
                // Include parent if any child matches
                if (node.children.length > 0) {
                    matches = true
                }
            }

            return matches
        })
    }

    return filterTree(categoryTree.value)
})

const parentCategoryOptions = computed(() => {
    const options = [{ value: '', label: 'Sin categoría padre (raíz)' }]

    if (flatCategories.value) {
        const availableParents = flatCategories.value.filter(category => {
            // Exclude the category being edited to prevent circular references
            if (editingCategory.value && category.id === editingCategory.value.id) {
                return false
            }
            // Only show active categories as potential parents
            return category.active
        })

        options.push(...availableParents.map(category => ({
            value: category.id,
            label: '  '.repeat(category.level || 0) + category.name,
        })))
    }

    return options
})

const getModalTitle = computed(() => {
    if (editingCategory.value) {
        return 'Editar Categoría'
    } else if (parentCategory.value) {
        return `Nueva Subcategoría de "${parentCategory.value.name}"`
    } else {
        return 'Nueva Categoría'
    }
})

// Watch search term and update filters
watch(searchTerm, (newTerm) => {
    updateFilters({ search: newTerm })
}, { debounce: 300 })

// View mode toggle
const toggleView = () => {
    viewMode.value = viewMode.value === 'tree' ? 'list' : 'tree'
}

// Modal management
const closeModal = () => {
    showCreateModal.value = false
    showEditModal.value = false
    editingCategory.value = null
    parentCategory.value = null
    formData.value = initializeFormData()
}

const editCategory = (category: Category) => {
    editingCategory.value = category
    formData.value = {
        name: category.name,
        code: category.code,
        parent_id: category.parent_id,
        active: category.active,
    }
    showEditModal.value = true
}

const addChildCategory = (parent: Category) => {
    parentCategory.value = parent
    formData.value = {
        ...initializeFormData(),
        parent_id: parent.id,
    }
    showCreateModal.value = true
}

// Form submission
const handleSubmit = async () => {
    try {
        isSubmitting.value = true

        const validatedData = categorySchema.parse(formData.value)

        // Convert empty string to null for parent_id
        if (validatedData.parent_id === '') {
            validatedData.parent_id = null
        }

        if (editingCategory.value) {
            await updateCategory(editingCategory.value.id, validatedData)
        } else {
            await createCategory(validatedData)
        }

        closeModal()
    } catch (error) {
        console.error('Error saving category:', error)
    } finally {
        isSubmitting.value = false
    }
}

// Delete confirmation
const confirmDelete = async (category: Category) => {
    const hasChildren = category.children && category.children.length > 0

    let message = `¿Estás seguro de que quieres eliminar la categoría "${category.name}"?`
    if (hasChildren) {
        message += '\n\nEsta categoría tiene subcategorías que también serán eliminadas.'
    }

    if (confirm(message)) {
        try {
            await deleteCategory(category.id)
        } catch (error) {
            console.error('Error deleting category:', error)
        }
    }
}
</script>
