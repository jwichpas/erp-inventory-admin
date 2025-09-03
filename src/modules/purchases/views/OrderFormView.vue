<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <OrderForm
      :initial-data="initialData"
      :loading="loading"
      :is-edit="isEdit"
      :suppliers="suppliers"
      :warehouses="warehouses"
      @submit="handleSubmit"
      @save-draft="handleSaveDraft"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import OrderForm from '../components/orders/OrderForm.vue'
import { usePurchaseOrders } from '../composables'
import { useToast } from '@/composables/useToast'
import type { OrderFormData } from '../types'

// Composables
const router = useRouter()
const route = useRoute()
const { toast } = useToast()
const orders = usePurchaseOrders()

// State
const loading = ref(false)
const initialData = ref<Partial<OrderFormData> | undefined>(undefined)
const suppliers = ref<Array<{ id: string; name: string }>>([])
const warehouses = ref<Array<{ id: string; name: string }>>([])

// Computed
const isEdit = computed(() => !!route.params.id)
const orderId = computed(() => route.params.id as string)

// Methods
const loadOrderData = async () => {
  if (!isEdit.value) return
  
  loading.value = true
  try {
    const order = await orders.getOrderById(orderId.value)
    if (order) {
      initialData.value = {
        supplier_id: order.supplier_id,
        branch_id: order.branch_id,
        order_date: order.order_date,
        expected_delivery_date: order.expected_delivery_date,
        currency_code: order.currency_code,
        exchange_rate: order.exchange_rate,
        notes: order.notes,
        items: order.items?.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_code: item.unit_code,
          description: item.description
        })) || []
      }
    }
  } catch (error) {
    toast.error('Error cargando los datos de la orden')
    console.error('Error loading order:', error)
  } finally {
    loading.value = false
  }
}

const loadSuppliers = async () => {
  try {
    // TODO: Implementar carga de proveedores
    suppliers.value = []
  } catch (error) {
    console.error('Error loading suppliers:', error)
  }
}

const loadWarehouses = async () => {
  try {
    // TODO: Implementar carga de almacenes
    warehouses.value = []
  } catch (error) {
    console.error('Error loading warehouses:', error)
  }
}

const handleSubmit = async (data: OrderFormData) => {
  loading.value = true
  try {
    if (isEdit.value) {
      await orders.updateOrder(orderId.value, data)
      toast.success('Orden actualizada correctamente')
    } else {
      const newOrder = await orders.createOrder(data)
      toast.success('Orden creada correctamente')
      router.push(`/purchases/orders/${newOrder.id}`)
      return
    }
    router.push('/purchases')
  } catch (error) {
    toast.error(isEdit.value ? 'Error actualizando la orden' : 'Error creando la orden')
    console.error('Error saving order:', error)
  } finally {
    loading.value = false
  }
}

const handleSaveDraft = async (data: OrderFormData) => {
  loading.value = true
  try {
    const draftOrder = await orders.saveDraft(data)
    toast.success('Borrador guardado correctamente')
    router.push(`/purchases/orders/${draftOrder.id}/edit`)
  } catch (error) {
    toast.error('Error guardando el borrador')
    console.error('Error saving draft:', error)
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  router.push('/purchases')
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    loadSuppliers(),
    loadWarehouses(),
    loadOrderData()
  ])
})
</script>