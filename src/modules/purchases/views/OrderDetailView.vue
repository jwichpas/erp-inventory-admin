<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <OrderView
      :order="order"
      :loading="loading"
      :error="error"
      :related-docs="relatedDocs"
      @edit="handleEdit"
      @approve="handleApprove"
      @create-doc="handleCreateDoc"
      @duplicate="handleDuplicate"
      @view-doc="handleViewDoc"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import OrderView from '../components/orders/OrderView.vue'
import { usePurchaseOrders } from '../composables'
import { useToast } from '@/composables/useToast'
import type { PurchaseOrder, PurchaseDoc } from '../types'

// Composables
const router = useRouter()
const route = useRoute()
const { toast } = useToast()
const orders = usePurchaseOrders()

// State
const order = ref<PurchaseOrder | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const relatedDocs = ref<PurchaseDoc[]>([])

// Computed
const orderId = computed(() => route.params.id as string)

// Methods
const loadOrder = async () => {
  loading.value = true
  error.value = null
  
  try {
    const [orderData, docs] = await Promise.all([
      orders.getOrderById(orderId.value),
      orders.getRelatedDocs(orderId.value)
    ])
    
    order.value = orderData
    relatedDocs.value = docs
  } catch (err) {
    error.value = 'Error cargando la orden'
    console.error('Error loading order:', err)
  } finally {
    loading.value = false
  }
}

const handleEdit = () => {
  router.push(`/purchases/orders/${orderId.value}/edit`)
}

const handleApprove = async () => {
  try {
    await orders.approveOrder(orderId.value, 'Aprobado desde la vista de detalle')
    toast.success('Orden aprobada correctamente')
    await loadOrder() // Reload to show updated status
  } catch (error) {
    toast.error('Error aprobando la orden')
    console.error('Error approving order:', error)
  }
}

const handleCreateDoc = async () => {
  try {
    // TODO: Implementar creación de documento desde orden
    toast.info('Redirigiendo a crear documento...')
    router.push(`/purchases/documents/new?from_order=${orderId.value}`)
  } catch (error) {
    toast.error('Error creando documento desde la orden')
    console.error('Error creating doc from order:', error)
  }
}

const handleDuplicate = async () => {
  try {
    const duplicatedOrder = await orders.duplicateOrder(orderId.value)
    toast.success('Orden duplicada correctamente')
    router.push(`/purchases/orders/${duplicatedOrder.id}`)
  } catch (error) {
    toast.error('Error duplicando la orden')
    console.error('Error duplicating order:', error)
  }
}

const handleViewDoc = (docId: string) => {
  router.push(`/purchases/documents/${docId}`)
}

// Lifecycle
onMounted(() => {
  loadOrder()
})
</script>