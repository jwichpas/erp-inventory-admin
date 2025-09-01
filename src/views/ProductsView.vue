<template>
    <div class="space-y-6">
        <!-- Header with Tabs -->
        <div class="border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Inventario</h1>
                    <p class="mt-2 text-gray-600 dark:text-gray-400">
                        Gestiona productos, marcas, categorías y movimientos de stock
                    </p>
                </div>
            </div>

            <!-- Tabs -->
            <nav class="-mb-px flex space-x-8">
                <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id" :class="[
                    'py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                    activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                ]">
                    <component :is="tab.icon" class="w-5 h-5 mr-2 inline" />
                    {{ tab.name }}
                </button>
            </nav>
        </div>

        <!-- Tab Content -->
        <div class="mt-6">
            <!-- Products Tab -->
            <div v-if="activeTab === 'products'">
                <ProductList @create="showCreateProductModal = true" @edit="editProduct" @view="viewProduct"
                    @delete="confirmDeleteProduct" />
            </div>

            <!-- Brands Tab -->
            <div v-else-if="activeTab === 'brands'">
                <BrandManager />
            </div>

            <!-- Categories Tab -->
            <div v-else-if="activeTab === 'categories'">
                <CategoryManager />
            </div>

            <!-- Stock Movements Tab -->
            <div v-else-if="activeTab === 'movements'">
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Movimientos de Stock</h2>
                            <p class="mt-1 text-gray-600 dark:text-gray-400">
                                Registra entradas, salidas y transferencias de inventario
                            </p>
                        </div>
                        <Button @click="showStockMovementModal = true">
                            <PlusIcon class="w-4 h-4 mr-2" />
                            Nuevo Movimiento
                        </Button>
                    </div>

                    <!-- Stock movements list would go here -->
                    <div
                        class="bg-white dark:bg-gray-800 p-12 rounded-lg shadow border border-gray-200 dark:border-gray-700 text-center">
                        <TrendingUpIcon class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            Movimientos de Stock
                        </h3>
                        <p class="text-gray-500 dark:text-gray-400">
                            La lista de movimientos de stock se implementará próximamente.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Serialized Items Tab -->
            <div v-else-if="activeTab === 'serialized'">
                <SerializedItemTracker />
            </div>
        </div>

        <!-- Create Product Modal -->
        <Modal :show="showCreateProductModal" title="Nuevo Producto" size="2xl" @close="closeCreateProductModal">
            <ProductForm :is-submitting="isSubmittingProduct" @submit="handleCreateProduct"
                @cancel="closeCreateProductModal" />
        </Modal>

        <!-- Edit Product Modal -->
        <Modal :show="showEditProductModal" title="Editar Producto" size="2xl" @close="closeEditProductModal">
            <ProductForm :product="editingProduct" :is-submitting="isSubmittingProduct" @submit="handleEditProduct"
                @cancel="closeEditProductModal" />
        </Modal>

        <!-- View Product Modal -->
        <Modal :show="showViewProductModal" :title="viewingProduct?.name || 'Producto'" size="2xl"
            @close="closeViewProductModal">
            <div v-if="viewingProduct" class="space-y-6">
                <!-- Product Details -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-4">
                        <div>
                            <h4 class="text-sm font-medium text-gray-900 dark:text-white">Información Básica</h4>
                            <dl class="mt-2 space-y-2">
                                <div class="flex justify-between">
                                    <dt class="text-sm text-gray-500 dark:text-gray-400">SKU:</dt>
                                    <dd class="text-sm text-gray-900 dark:text-white font-mono">{{ viewingProduct.sku }}
                                    </dd>
                                </div>
                                <div class="flex justify-between">
                                    <dt class="text-sm text-gray-500 dark:text-gray-400">Marca:</dt>
                                    <dd class="text-sm text-gray-900 dark:text-white">{{ (viewingProduct as any).brands?.name ||
                                        '-' }}</dd>
                                </div>
                                <div class="flex justify-between">
                                    <dt class="text-sm text-gray-500 dark:text-gray-400">Categoría:</dt>
                                    <dd class="text-sm text-gray-900 dark:text-white">{{ (viewingProduct as any).categories?.name
                                        || '-' }}</dd>
                                </div>
                                <div class="flex justify-between">
                                    <dt class="text-sm text-gray-500 dark:text-gray-400">Unidad:</dt>
                                    <dd class="text-sm text-gray-900 dark:text-white">{{ viewingProduct.unit_code }}
                                    </dd>
                                </div>
                                <div class="flex justify-between">
                                    <dt class="text-sm text-gray-500 dark:text-gray-400">Stock Mínimo:</dt>
                                    <dd class="text-sm text-gray-900 dark:text-white">{{ viewingProduct.min_stock }}
                                    </dd>
                                </div>
                                <div class="flex justify-between">
                                    <dt class="text-sm text-gray-500 dark:text-gray-400">Serializado:</dt>
                                    <dd class="text-sm text-gray-900 dark:text-white">{{ viewingProduct.is_serialized ?
                                        'Sí' : 'No' }}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    <div>
                        <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Imágenes</h4>
                        <ProductImageUpload :product="viewingProduct" />
                    </div>
                </div>
            </div>
        </Modal>

        <!-- Stock Movement Modal -->
        <Modal :show="showStockMovementModal" title="Nuevo Movimiento de Stock" size="2xl"
            @close="closeStockMovementModal">
            <StockMovementForm :is-submitting="isSubmittingMovement" @submit="handleCreateStockMovement"
                @cancel="closeStockMovementModal" />
        </Modal>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useProducts } from '@/composables/useProducts'
import { useStockMovements } from '@/composables/useStockMovements'
import { useRealtime } from '@/composables/useRealtime'
import ProductList from '@/components/inventory/ProductList.vue'
import ProductForm from '@/components/inventory/ProductForm.vue'
import BrandManager from '@/components/inventory/BrandManager.vue'
import CategoryManager from '@/components/inventory/CategoryManager.vue'
import SerializedItemTracker from '@/components/inventory/SerializedItemTracker.vue'
import StockMovementForm from '@/components/inventory/StockMovementForm.vue'
import ProductImageUpload from '@/components/inventory/ProductImageUpload.vue'
import Modal from '@/components/ui/Modal.vue'
import Button from '@/components/ui/Button.vue'
import {
    Package as PackageIcon,
    Tag as TagIcon,
    Folder as FolderIcon,
    TrendingUp as TrendingUpIcon,
    QrCode as QrCodeIcon,
    Plus as PlusIcon,
} from 'lucide-vue-next'
import type { Product } from '@/types/database'
import type { ProductFormData, StockMovementFormData } from '@/schemas/productSchemas'

// Tab configuration
const tabs = [
    { id: 'products', name: 'Productos', icon: PackageIcon },
    { id: 'brands', name: 'Marcas', icon: TagIcon },
    { id: 'categories', name: 'Categorías', icon: FolderIcon },
    { id: 'movements', name: 'Movimientos', icon: TrendingUpIcon },
    { id: 'serialized', name: 'Items Serializados', icon: QrCodeIcon },
]

// State
const activeTab = ref('products')
const showCreateProductModal = ref(false)
const showEditProductModal = ref(false)
const showViewProductModal = ref(false)
const showStockMovementModal = ref(false)
const editingProduct = ref<Product | null>(null)
const viewingProduct = ref<Product | null>(null)
const isSubmittingProduct = ref(false)
const isSubmittingMovement = ref(false)

// Use composables
const { createProduct, updateProduct, deleteProduct } = useProducts()
const { createStockMovement } = useStockMovements()
const { subscribeToTable } = useRealtime()

// Subscribe to real-time changes
onMounted(() => {
    subscribeToTable('products')
    subscribeToTable('brands')
    subscribeToTable('categories')
    subscribeToTable('stock_ledger')
    subscribeToTable('product_codes')
})

// Product management
const editProduct = (product: Product) => {
    editingProduct.value = product
    showEditProductModal.value = true
}

const viewProduct = (product: Product) => {
    viewingProduct.value = product
    showViewProductModal.value = true
}

const confirmDeleteProduct = async (product: Product) => {
    if (confirm(`¿Estás seguro de que quieres eliminar "${product.name}"?`)) {
        try {
            await deleteProduct(product.id)
        } catch (error) {
            console.error('Error deleting product:', error)
        }
    }
}

// Modal management
const closeCreateProductModal = () => {
    showCreateProductModal.value = false
}

const closeEditProductModal = () => {
    showEditProductModal.value = false
    editingProduct.value = null
}

const closeViewProductModal = () => {
    showViewProductModal.value = false
    viewingProduct.value = null
}

const closeStockMovementModal = () => {
    showStockMovementModal.value = false
}

// Form submissions
const handleCreateProduct = async (data: ProductFormData) => {
    try {
        isSubmittingProduct.value = true
        // Convert form data to match API expectations
        const productData = {
            ...data,
            dimensions: data.dimensions || undefined,
            barcode: data.barcode || undefined,
        }
        await createProduct(productData as any)
        closeCreateProductModal()
    } catch (error) {
        console.error('Error creating product:', error)
    } finally {
        isSubmittingProduct.value = false
    }
}

const handleEditProduct = async (data: ProductFormData) => {
    if (!editingProduct.value) return

    try {
        isSubmittingProduct.value = true
        // Convert form data to match API expectations
        const productData = {
            ...data,
            dimensions: data.dimensions || undefined,
            barcode: data.barcode || undefined,
        }
        await updateProduct(editingProduct.value.id, productData as any)
        closeEditProductModal()
    } catch (error) {
        console.error('Error updating product:', error)
    } finally {
        isSubmittingProduct.value = false
    }
}

const handleCreateStockMovement = async (data: StockMovementFormData) => {
    try {
        isSubmittingMovement.value = true
        await createStockMovement(data)
        closeStockMovementModal()
    } catch (error) {
        console.error('Error creating stock movement:', error)
    } finally {
        isSubmittingMovement.value = false
    }
}
</script>
