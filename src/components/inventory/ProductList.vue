<template>
    <div class="space-y-6">
        <!-- Search and Filters -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="md:col-span-2">
                    <FormField v-model="searchTerm" type="text" placeholder="Buscar productos por nombre o SKU..."
                        class="w-full">
                        <template #prepend>
                            <SearchIcon class="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        </template>
                    </FormField>
                </div>

                <FormField v-model="filters.brandId" type="select" placeholder="Todas las marcas"
                    :options="brandOptions" :disabled="isLoadingBrands" />

                <FormField v-model="filters.categoryId" type="select" placeholder="Todas las categorías"
                    :options="categoryOptions" :disabled="isLoadingCategories" />
            </div>

            <div class="flex items-center justify-between mt-4">
                <div class="flex items-center space-x-4">
                    <label class="flex items-center">
                        <input v-model="filters.showInactive" type="checkbox"
                            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700" />
                        <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Mostrar productos inactivos
                        </span>
                    </label>

                    <label class="flex items-center">
                        <input v-model="filters.lowStock" type="checkbox"
                            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700" />
                        <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Solo stock bajo
                        </span>
                    </label>
                </div>

                <Button variant="outline" @click="clearAllFilters" :disabled="!hasActiveFilters">
                    <FilterXIcon class="w-4 h-4 mr-2" />
                    Limpiar Filtros
                </Button>
            </div>
        </div>

        <!-- Products Table -->
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <DataTable :data="filteredProducts" :columns="columns" :loading="isLoading" :show-pagination="true"
                :page-size="20" @row-click="handleRowClick">
                <template #actions>
                    <Button @click="$emit('create')">
                        <PlusIcon class="w-4 h-4 mr-2" />
                        Nuevo Producto
                    </Button>
                </template>

                <template #empty>
                    <div class="text-center py-12">
                        <PackageIcon class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            {{ hasActiveFilters ? 'No se encontraron productos' : 'No hay productos' }}
                        </h3>
                        <p class="text-gray-500 dark:text-gray-400 mb-4">
                            {{ hasActiveFilters
                                ? 'Intenta ajustar los filtros de búsqueda.'
                                : 'Comienza agregando tu primer producto al catálogo.'
                            }}
                        </p>
                        <Button v-if="!hasActiveFilters" @click="$emit('create')">
                            <PlusIcon class="w-4 h-4 mr-2" />
                            Crear Producto
                        </Button>
                    </div>
                </template>
            </DataTable>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'
import { useProducts } from '@/composables/useProducts'
import { useBrands } from '@/composables/useBrands'
import { useCategories } from '@/composables/useCategories'
import { useProductImages } from '@/composables/useProductImages'
import DataTable from '@/components/ui/DataTable.vue'
import FormField from '@/components/ui/FormField.vue'
import Button from '@/components/ui/Button.vue'
import {
    Search as SearchIcon,
    Plus as PlusIcon,
    Package as PackageIcon,
    FilterX as FilterXIcon,
    Edit as EditIcon,
    Trash2 as TrashIcon,
    Eye as EyeIcon,
    AlertTriangle as AlertTriangleIcon,
} from 'lucide-vue-next'
import type { Product } from '@/types/database'

interface ProductListEmits {
    create: []
    edit: [product: Product]
    view: [product: Product]
    delete: [product: Product]
}

const emit = defineEmits<ProductListEmits>()

// Search and filters
const searchTerm = ref('')
const filters = ref({
    brandId: '',
    categoryId: '',
    showInactive: false,
    lowStock: false,
})

// Load data
const { products, isLoading, updateFilters } = useProducts()
const { activeBrands, isLoading: isLoadingBrands } = useBrands()
const { flatCategories, isLoading: isLoadingCategories } = useCategories()
const { getPrimaryImage } = useProductImages()

// Computed options for dropdowns
const brandOptions = computed(() => [
    { value: '', label: 'Todas las marcas' },
    ...activeBrands.value.map(brand => ({
        value: brand.id,
        label: brand.name,
    })),
])

const categoryOptions = computed(() => [
    { value: '', label: 'Todas las categorías' },
    ...flatCategories.value.map(category => ({
        value: category.id,
        label: '  '.repeat(category.level || 0) + category.name,
    })),
])

// Check if filters are active
const hasActiveFilters = computed(() => {
    return !!(
        searchTerm.value ||
        filters.value.brandId ||
        filters.value.categoryId ||
        filters.value.showInactive ||
        filters.value.lowStock
    )
})

// Filter products based on search and filters
const filteredProducts = computed(() => {
    if (!products.value) return []

    let filtered = [...products.value]

    // Text search
    if (searchTerm.value) {
        const search = searchTerm.value.toLowerCase()
        filtered = filtered.filter(product =>
            product.name.toLowerCase().includes(search) ||
            product.sku.toLowerCase().includes(search)
        )
    }

    // Brand filter
    if (filters.value.brandId) {
        filtered = filtered.filter(product => product.brand_id === filters.value.brandId)
    }

    // Category filter
    if (filters.value.categoryId) {
        filtered = filtered.filter(product => product.category_id === filters.value.categoryId)
    }

    // Active/inactive filter
    if (!filters.value.showInactive) {
        filtered = filtered.filter(product => product.active !== false)
    }

    // Low stock filter (products below minimum stock)
    if (filters.value.lowStock) {
        // TODO: Implement when we have stock data from warehouse_stock table
        // filtered = filtered.filter(product => product.current_stock < product.min_stock)
    }

    return filtered
})

// Watch filters and update query
watch([searchTerm, filters], ([newSearchTerm, newFilters]) => {
    updateFilters({
        search: newSearchTerm,
        brandId: newFilters.brandId || undefined,
        categoryId: newFilters.categoryId || undefined,
        isActive: newFilters.showInactive ? undefined : true,
    })
}, { deep: true, debounce: 300 })

// Clear all filters
const clearAllFilters = () => {
    searchTerm.value = ''
    filters.value = {
        brandId: '',
        categoryId: '',
        showInactive: false,
        lowStock: false,
    }
}

// Table columns
const columnHelper = createColumnHelper<Product>()

const columns: ColumnDef<Product>[] = [
    columnHelper.display({
        id: 'image',
        header: '',
        size: 60,
        cell: ({ row }) => {
            const product = row.original
            const primaryImage = getPrimaryImage(product.id)

            return h('div', { class: 'flex items-center justify-center' }, [
                primaryImage.value
                    ? h('img', {
                        src: primaryImage.value.image_url,
                        alt: primaryImage.value.alt_text || product.name,
                        class: 'w-10 h-10 rounded-md object-cover border border-gray-200 dark:border-gray-600',
                    })
                    : h('div', {
                        class: 'w-10 h-10 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center',
                    }, [
                        h(PackageIcon, { class: 'w-5 h-5 text-gray-400 dark:text-gray-500' })
                    ])
            ])
        },
    }),

    columnHelper.accessor('sku', {
        header: 'SKU',
        size: 120,
        cell: ({ getValue }) => h('span', { class: 'font-mono text-sm' }, getValue()),
    }),

    columnHelper.accessor('name', {
        header: 'Producto',
        size: 300,
        cell: ({ getValue, row }) => {
            const product = row.original
            return h('div', [
                h('div', { class: 'font-medium text-gray-900 dark:text-white' }, getValue()),
                product.brands && h('div', {
                    class: 'text-sm text-gray-500 dark:text-gray-400'
                }, product.brands.name),
            ])
        },
    }),

    columnHelper.accessor('categories', {
        header: 'Categoría',
        size: 150,
        cell: ({ getValue }) => {
            const category = getValue()
            return h('span', {
                class: 'text-sm text-gray-600 dark:text-gray-300'
            }, category?.name || '-')
        },
    }),

    columnHelper.accessor('unit_code', {
        header: 'Unidad',
        size: 80,
        cell: ({ getValue }) => h('span', { class: 'text-sm' }, getValue()),
    }),

    columnHelper.accessor('min_stock', {
        header: 'Stock Mín.',
        size: 100,
        cell: ({ getValue, row }) => {
            const minStock = getValue()
            const product = row.original

            // TODO: Get current stock and compare with min_stock
            const isLowStock = false // This would be calculated based on current stock

            return h('div', { class: 'flex items-center' }, [
                h('span', { class: 'text-sm' }, minStock.toString()),
                isLowStock && h(AlertTriangleIcon, {
                    class: 'w-4 h-4 ml-1 text-yellow-500'
                }),
            ])
        },
    }),

    columnHelper.display({
        id: 'serialized',
        header: 'Serializado',
        size: 100,
        cell: ({ row }) => {
            const product = row.original
            return h('span', {
                class: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.is_serialized
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`
            }, product.is_serialized ? 'Sí' : 'No')
        },
    }),

    columnHelper.display({
        id: 'status',
        header: 'Estado',
        size: 100,
        cell: ({ row }) => {
            const product = row.original
            const isActive = product.active !== false
            return h('span', {
                class: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`
            }, isActive ? 'Activo' : 'Inactivo')
        },
    }),

    columnHelper.display({
        id: 'actions',
        header: 'Acciones',
        size: 120,
        cell: ({ row }) => {
            const product = row.original

            return h('div', { class: 'flex items-center space-x-2' }, [
                h('button', {
                    onClick: (e: Event) => {
                        e.stopPropagation()
                        emit('view', product)
                    },
                    class: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
                    title: 'Ver detalles',
                }, [h(EyeIcon, { class: 'w-4 h-4' })]),

                h('button', {
                    onClick: (e: Event) => {
                        e.stopPropagation()
                        emit('edit', product)
                    },
                    class: 'text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300',
                    title: 'Editar',
                }, [h(EditIcon, { class: 'w-4 h-4' })]),

                h('button', {
                    onClick: (e: Event) => {
                        e.stopPropagation()
                        emit('delete', product)
                    },
                    class: 'text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300',
                    title: 'Eliminar',
                }, [h(TrashIcon, { class: 'w-4 h-4' })]),
            ])
        },
    }),
]

// Handle row click
const handleRowClick = (row: any) => {
    emit('view', row.original)
}
</script>
