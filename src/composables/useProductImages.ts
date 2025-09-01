import { computed, ref } from 'vue'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '@/lib/supabase'
import type { ProductImageFormData } from '@/schemas/productSchemas'

export interface ProductImage {
  id: string
  company_id: string
  product_id: string
  image_url: string
  is_primary: boolean
  alt_text?: string
  sort_order?: number
  created_at: string
  updated_at: string
}

export interface ProductImageFilters {
  productId?: string
  isPrimary?: boolean
}

export const useProductImages = (filters: ProductImageFilters = {}) => {
  const {
    createSelectQuery,
    createInsertMutation,
    createUpdateMutation,
    createDeleteMutation,
    queryClient,
  } = useSupabaseQuery()

  // Reactive filters
  const currentFilters = ref(filters)

  // Query for product images
  const {
    data: productImages,
    isLoading,
    error,
    refetch,
  } = createSelectQuery<ProductImage>(
    'product_images',
    '*',
    computed(() => {
      const filters: any = { ...currentFilters.value }
      if (filters.productId) {
        filters.product_id = `eq.${filters.productId}`
        delete filters.productId
      }
      if (filters.isPrimary !== undefined) {
        filters.is_primary = `eq.${filters.isPrimary}`
        delete filters.isPrimary
      }
      return filters
    }),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  )

  // Create product image mutation
  const createProductImageMutation = createInsertMutation<ProductImage>('product_images', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product_images'] })
    },
  })

  // Update product image mutation
  const updateProductImageMutation = createUpdateMutation<ProductImage>('product_images', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product_images'] })
    },
  })

  // Delete product image mutation
  const deleteProductImageMutation = createDeleteMutation('product_images', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product_images'] })
    },
  })

  // Upload state
  const isUploading = ref(false)
  const uploadProgress = ref(0)

  // Helper functions
  const updateFilters = (newFilters: Partial<ProductImageFilters>) => {
    currentFilters.value = { ...currentFilters.value, ...newFilters }
  }

  const clearFilters = () => {
    currentFilters.value = {}
  }

  // Upload image to Supabase Storage
  const uploadImage = async (file: File, productId: string): Promise<string> => {
    try {
      isUploading.value = true
      uploadProgress.value = 0

      // Validate file
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipo de archivo no permitido. Solo se permiten imágenes JPEG, PNG y WebP.')
      }

      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        throw new Error('El archivo es demasiado grande. El tamaño máximo es 5MB.')
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${productId}/${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage.from('erp inventory').upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/*',
      })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(data.path)

      uploadProgress.value = 100
      return urlData.publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      throw error
    } finally {
      isUploading.value = false
      uploadProgress.value = 0
    }
  }

  // Delete image from storage
  const deleteImageFromStorage = async (imageUrl: string) => {
    try {
      // Extract path from URL
      const url = new URL(imageUrl)
      const pathParts = url.pathname.split('/')
      const bucketIndex = pathParts.findIndex((part) => part === 'product-images')

      if (bucketIndex === -1) {
        throw new Error('Invalid image URL')
      }

      const filePath = pathParts.slice(bucketIndex + 1).join('/')

      const { error } = await supabase.storage.from('product-images').remove([filePath])

      if (error) {
        console.error('Error deleting image from storage:', error)
        // Don't throw error here as the database record should still be deleted
      }
    } catch (error) {
      console.error('Error parsing image URL:', error)
    }
  }

  // Create product image with upload
  const createProductImageWithUpload = async (
    file: File,
    productId: string,
    isPrimary: boolean = false,
    altText?: string,
  ) => {
    const imageUrl = await uploadImage(file, productId)

    const imageData: ProductImageFormData = {
      product_id: productId,
      image_url: imageUrl,
      is_primary: isPrimary,
      alt_text: altText,
      sort_order: 0,
    }

    return createProductImageMutation.mutateAsync(imageData)
  }

  // Create product image from URL
  const createProductImage = async (imageData: ProductImageFormData) => {
    return createProductImageMutation.mutateAsync(imageData)
  }

  // Update product image
  const updateProductImage = async (id: string, imageData: Partial<ProductImage>) => {
    return updateProductImageMutation.mutateAsync({ id, data: imageData })
  }

  // Delete product image (including from storage)
  const deleteProductImage = async (id: string) => {
    // Get the image data first to delete from storage
    const image = productImages.value?.find((img) => img.id === id)

    if (image) {
      await deleteImageFromStorage(image.image_url)
    }

    return deleteProductImageMutation.mutateAsync(id)
  }

  // Set primary image
  const setPrimaryImage = async (imageId: string, productId: string) => {
    // First, unset all other primary images for this product
    const otherImages =
      productImages.value?.filter(
        (img) => img.product_id === productId && img.id !== imageId && img.is_primary,
      ) || []

    const updatePromises = otherImages.map((img) =>
      updateProductImage(img.id, { is_primary: false }),
    )

    // Set the selected image as primary
    updatePromises.push(updateProductImage(imageId, { is_primary: true }))

    await Promise.all(updatePromises)
  }

  // Get images for a specific product
  const getProductImages = (productId: string) => {
    return createSelectQuery<ProductImage>(
      'product_images',
      '*',
      { product_id: productId },
      {
        enabled: computed(() => !!productId),
        staleTime: 5 * 60 * 1000,
      },
    )
  }

  // Get primary image for a product
  const getPrimaryImage = (productId: string) => {
    return computed(() => {
      if (!productImages.value) return null
      return (
        productImages.value.find((img) => img.product_id === productId && img.is_primary) ||
        productImages.value.find((img) => img.product_id === productId) ||
        null
      )
    })
  }

  // Computed properties
  const isCreating = computed(() => createProductImageMutation.isPending)
  const isUpdating = computed(() => updateProductImageMutation.isPending)
  const isDeleting = computed(() => deleteProductImageMutation.isPending)
  const isMutating = computed(
    () => isCreating.value || isUpdating.value || isDeleting.value || isUploading.value,
  )

  // Sorted images by sort_order
  const sortedImages = computed(() => {
    if (!productImages.value) return []
    return [...productImages.value].sort((a, b) => {
      // Primary image first
      if (a.is_primary && !b.is_primary) return -1
      if (!a.is_primary && b.is_primary) return 1
      // Then by sort_order
      return (a.sort_order || 0) - (b.sort_order || 0)
    })
  })

  return {
    // Data
    productImages,
    sortedImages,
    isLoading,
    error,

    // Upload state
    isUploading,
    uploadProgress,

    // Filters
    currentFilters,
    updateFilters,
    clearFilters,

    // Actions
    refetch,
    uploadImage,
    createProductImageWithUpload,
    createProductImage,
    updateProductImage,
    deleteProductImage,
    setPrimaryImage,
    getProductImages,
    getPrimaryImage,

    // Mutation states
    isCreating,
    isUpdating,
    isDeleting,
    isMutating,

    // Raw mutations
    createProductImageMutation,
    updateProductImageMutation,
    deleteProductImageMutation,
  }
}
