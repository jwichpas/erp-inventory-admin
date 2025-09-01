<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div>
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">Imágenes del Producto</h3>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Gestiona las imágenes de este producto
                </p>
            </div>
            <Button @click="triggerFileInput" :disabled="isUploading">
                <UploadIcon class="w-4 h-4 mr-2" />
                Subir Imagen
            </Button>
        </div>

        <!-- File Input (Hidden) -->
        <input ref="fileInput" type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple class="hidden"
            @change="handleFileSelect" />

        <!-- Upload Progress -->
        <div v-if="isUploading" class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400">
                    </div>
                </div>
                <div class="ml-3 flex-1">
                    <p class="text-sm text-blue-800 dark:text-blue-200">
                        Subiendo imagen{{ uploadingFiles.length > 1 ? 's' : '' }}...
                    </p>
                    <div class="mt-2 bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                        <div class="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                            :style="{ width: `${uploadProgress}%` }"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Images Grid -->
        <div v-if="sortedImages.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div v-for="image in sortedImages" :key="image.id"
                class="relative group bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
                <!-- Image -->
                <div class="aspect-square relative">
                    <img :src="image.image_url" :alt="image.alt_text || 'Product image'"
                        class="w-full h-full object-cover" @error="handleImageError" />

                    <!-- Primary Badge -->
                    <div v-if="image.is_primary"
                        class="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                        Principal
                    </div>

                    <!-- Actions Overlay -->
                    <div
                        class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                        <button v-if="!image.is_primary" @click="setPrimaryImage(image.id)"
                            class="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                            :disabled="isMutating" title="Establecer como principal">
                            <StarIcon class="w-4 h-4" />
                        </button>

                        <button @click="editImage(image)"
                            class="p-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
                            :disabled="isMutating" title="Editar">
                            <EditIcon class="w-4 h-4" />
                        </button>

                        <button @click="confirmDelete(image)"
                            class="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                            :disabled="isMutating" title="Eliminar">
                            <TrashIcon class="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <!-- Image Info -->
                <div class="p-3">
                    <p v-if="image.alt_text" class="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {{ image.alt_text }}
                    </p>
                    <p v-else class="text-sm text-gray-400 dark:text-gray-500 italic">
                        Sin descripción
                    </p>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <ImageIcon class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay imágenes
            </h3>
            <p class="text-gray-500 dark:text-gray-400 mb-4">
                Sube imágenes para mostrar este producto a tus clientes.
            </p>
            <Button @click="triggerFileInput" :disabled="isUploading">
                <UploadIcon class="w-4 h-4 mr-2" />
                Subir Primera Imagen
            </Button>
        </div>

        <!-- Drag and Drop Overlay -->
        <div v-if="isDragOver" class="fixed inset-0 bg-blue-600 bg-opacity-20 flex items-center justify-center z-50"
            @drop.prevent="handleDrop" @dragover.prevent @dragleave="isDragOver = false">
            <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center">
                <UploadIcon class="w-12 h-12 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
                <p class="text-lg font-medium text-gray-900 dark:text-white">
                    Suelta las imágenes aquí
                </p>
            </div>
        </div>

        <!-- Edit Image Modal -->
        <Modal :show="showEditModal" title="Editar Imagen" size="md" @close="closeEditModal">
            <form @submit.prevent="handleEditSubmit" class="space-y-4">
                <div class="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden mb-4">
                    <img v-if="editingImage" :src="editingImage.image_url"
                        :alt="editingImage.alt_text || 'Product image'" class="w-full h-full object-contain" />
                </div>

                <FormField v-model="editForm.alt_text" label="Texto Alternativo" type="text"
                    placeholder="Descripción de la imagen"
                    help-text="Describe la imagen para mejorar la accesibilidad" />

                <FormField v-model="editForm.is_primary" label="" type="checkbox" checkbox-label="Imagen principal"
                    help-text="La imagen principal se mostrará primero en las listas" />
            </form>

            <template #footer>
                <Button variant="outline" @click="closeEditModal" :disabled="isSubmitting">
                    Cancelar
                </Button>
                <Button @click="handleEditSubmit" :loading="isSubmitting">
                    Actualizar
                </Button>
            </template>
        </Modal>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useProductImages } from '@/composables/useProductImages'
import FormField from '@/components/ui/FormField.vue'
import Button from '@/components/ui/Button.vue'
import Modal from '@/components/ui/Modal.vue'
import {
    Upload as UploadIcon,
    Image as ImageIcon,
    Star as StarIcon,
    Edit as EditIcon,
    Trash2 as TrashIcon,
} from 'lucide-vue-next'
import type { Product, ProductImage } from '@/types/database'

interface ProductImageUploadProps {
    product: Product
}

const props = defineProps<ProductImageUploadProps>()

// State
const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)
const uploadingFiles = ref<File[]>([])
const showEditModal = ref(false)
const editingImage = ref<ProductImage | null>(null)
const isSubmitting = ref(false)

const editForm = ref({
    alt_text: '',
    is_primary: false,
})

// Use product images composable
const {
    productImages,
    sortedImages,
    isLoading,
    isUploading,
    uploadProgress,
    createProductImageWithUpload,
    updateProductImage,
    deleteProductImage,
    setPrimaryImage,
    isMutating,
    updateFilters,
} = useProductImages()

// Set filter for current product
onMounted(() => {
    updateFilters({ productId: props.product.id })
})

// Drag and drop handlers
const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    isDragOver.value = true
}

const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    if (!e.relatedTarget) {
        isDragOver.value = false
    }
}

const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    isDragOver.value = false

    const files = Array.from(e.dataTransfer?.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))

    if (imageFiles.length > 0) {
        handleFiles(imageFiles)
    }
}

// File handling
const triggerFileInput = () => {
    fileInput.value?.click()
}

const handleFileSelect = (e: Event) => {
    const target = e.target as HTMLInputElement
    const files = Array.from(target.files || [])

    if (files.length > 0) {
        handleFiles(files)
    }

    // Reset input
    target.value = ''
}

const handleFiles = async (files: File[]) => {
    uploadingFiles.value = files

    try {
        for (const file of files) {
            // Check if this is the first image to make it primary
            const isPrimary = sortedImages.value.length === 0

            await createProductImageWithUpload(
                file,
                props.product.id,
                isPrimary,
                `Imagen de ${props.product.name}`
            )
        }
    } catch (error) {
        console.error('Error uploading images:', error)
    } finally {
        uploadingFiles.value = []
    }
}

// Image management
const editImage = (image: ProductImage) => {
    editingImage.value = image
    editForm.value = {
        alt_text: image.alt_text || '',
        is_primary: image.is_primary,
    }
    showEditModal.value = true
}

const closeEditModal = () => {
    showEditModal.value = false
    editingImage.value = null
    editForm.value = {
        alt_text: '',
        is_primary: false,
    }
}

const handleEditSubmit = async () => {
    if (!editingImage.value) return

    try {
        isSubmitting.value = true

        const updateData = {
            alt_text: editForm.value.alt_text || null,
            is_primary: editForm.value.is_primary,
        }

        if (editForm.value.is_primary && !editingImage.value.is_primary) {
            // Use setPrimaryImage to handle the logic of unsetting other primary images
            await setPrimaryImage(editingImage.value.id, props.product.id)

            // Update alt_text separately if needed
            if (updateData.alt_text !== editingImage.value.alt_text) {
                await updateProductImage(editingImage.value.id, { alt_text: updateData.alt_text })
            }
        } else {
            await updateProductImage(editingImage.value.id, updateData)
        }

        closeEditModal()
    } catch (error) {
        console.error('Error updating image:', error)
    } finally {
        isSubmitting.value = false
    }
}

const confirmDelete = async (image: ProductImage) => {
    const message = image.is_primary
        ? `¿Estás seguro de que quieres eliminar esta imagen principal?\n\nSi hay otras imágenes, una de ellas se convertirá en la nueva imagen principal.`
        : '¿Estás seguro de que quieres eliminar esta imagen?'

    if (confirm(message)) {
        try {
            await deleteProductImage(image.id)
        } catch (error) {
            console.error('Error deleting image:', error)
        }
    }
}

const handleImageError = (e: Event) => {
    const img = e.target as HTMLImageElement
    img.src = '/placeholder-image.png' // You might want to add a placeholder image
}

// Setup drag and drop listeners
onMounted(() => {
    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('dragover', (e) => e.preventDefault())
    document.addEventListener('drop', handleDrop)
})

onUnmounted(() => {
    document.removeEventListener('dragenter', handleDragEnter)
    document.removeEventListener('dragleave', handleDragLeave)
    document.removeEventListener('dragover', (e) => e.preventDefault())
    document.removeEventListener('drop', handleDrop)
})
</script>
