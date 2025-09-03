// Composable para gestión de órdenes de compra
import { ref, computed, reactive } from 'vue'
import { supabase } from '@/lib/supabase'
import type {
  PurchaseOrder,
  PurchaseOrderListItem,
  PurchaseOrderFormData,
  PurchaseOrderFilters,
  PaginatedResponse
} from '../types'

export function usePurchaseOrders() {
  // Estado reactivo
  const orders = ref<PurchaseOrderListItem[]>([])
  const currentOrder = ref<PurchaseOrder | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Filtros y paginación
  const filters = reactive<PurchaseOrderFilters>({
    page: 1,
    limit: 20,
    sort_by: 'order_date',
    sort_direction: 'desc'
  })

  const pagination = reactive({
    page: 1,
    limit: 20,
    total: 0,
    hasNext: false,
    hasPrevious: false
  })

  // Computed properties
  const hasOrders = computed(() => orders.value.length > 0)
  const isEmpty = computed(() => !loading.value && !hasOrders.value)
  const totalPages = computed(() => Math.ceil(pagination.total / (filters.limit || 20)))

  // ============================================================================
  // FUNCIONES PRINCIPALES
  // ============================================================================

  /**
   * Cargar lista de órdenes de compra
   */
  const loadOrders = async (newFilters?: Partial<PurchaseOrderFilters>) => {
    loading.value = true
    error.value = null

    try {
      // Aplicar nuevos filtros si se proporcionan
      if (newFilters) {
        Object.assign(filters, newFilters)
      }

      let query = supabase
        .from('purchase_orders')
        .select(`
          id,
          order_date,
          expected_delivery_date,
          currency_code,
          total_amount,
          status,
          created_at,
          supplier:parties!supplier_id(
            id,
            fullname
          ),
          items:purchase_order_items(id)
        `, { count: 'exact' })

      // Aplicar filtros
      if (filters.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.branch_id) {
        query = query.eq('branch_id', filters.branch_id)
      }

      if (filters.currency_code) {
        query = query.eq('currency_code', filters.currency_code)
      }

      if (filters.date_from) {
        query = query.gte('order_date', filters.date_from)
      }

      if (filters.date_to) {
        query = query.lte('order_date', filters.date_to)
      }

      if (filters.search) {
        query = query.or(`notes.ilike.%${filters.search}%`)
      }

      // Ordenamiento
      const sortBy = filters.sort_by || 'order_date'
      const sortDirection = filters.sort_direction || 'desc'
      query = query.order(sortBy, { ascending: sortDirection === 'asc' })

      // Paginación
      const page = filters.page || 1
      const limit = filters.limit || 20
      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)

      const { data, error: queryError, count } = await query

      if (queryError) throw queryError

      // Transformar datos para la vista de lista
      orders.value = (data || []).map((order: any) => ({
        id: order.id,
        order_number: `ORD-${order.id.slice(-8).toUpperCase()}`,
        supplier_name: order.supplier?.fullname || 'Sin proveedor',
        order_date: order.order_date,
        expected_date: order.expected_delivery_date,
        currency_code: order.currency_code,
        total: order.total_amount,
        status: order.status,
        items_count: order.items?.length || 0,
        can_edit: order.status !== 'RECEIVED',
        can_approve: order.status === 'PENDING',
        can_receive: order.status === 'APPROVED'
      }))

      // Actualizar paginación
      pagination.total = count || 0
      pagination.hasNext = (page * limit) < (count || 0)
      pagination.hasPrevious = page > 1

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error cargando órdenes'
      console.error('Error loading purchase orders:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Cargar una orden específica
   */
  const loadOrder = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: queryError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:parties!supplier_id(
            id,
            fullname,
            doc_type,
            doc_number,
            email,
            phone,
            address
          ),
          branch:branches!branch_id(
            id,
            name,
            code
          ),
          items:purchase_order_items(
            *,
            product:products(
              id,
              sku,
              name,
              unit_code,
              description
            )
          )
        `)
        .eq('id', id)
        .single()

      if (queryError) throw queryError

      currentOrder.value = data as PurchaseOrder

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error cargando orden'
      console.error('Error loading purchase order:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Crear nueva orden de compra
   */
  const createOrder = async (formData: PurchaseOrderFormData): Promise<PurchaseOrder> => {
    loading.value = true
    error.value = null

    try {
      // Calcular total
      const totalAmount = formData.items.reduce((sum, item) =>
        sum + (item.quantity * item.unit_price), 0
      )

      // Crear la orden
      const { data: order, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          company_id: formData.company_id,
          supplier_id: formData.supplier_id,
          branch_id: formData.branch_id,
          order_date: formData.order_date,
          expected_delivery_date: formData.expected_delivery_date,
          currency_code: formData.currency_code,
          exchange_rate: formData.exchange_rate,
          total_amount: totalAmount,
          status: 'PENDING',
          notes: formData.notes
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Crear los items
      const orderItems = formData.items.map(item => ({
        purchase_order_id: order.id,
        product_id: item.product_id,
        description: item.description,
        unit_code: item.unit_code,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      // Recargar la lista
      await loadOrders()

      return order as PurchaseOrder

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error creando orden'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Actualizar orden de compra
   */
  const updateOrder = async (id: string, formData: Partial<PurchaseOrderFormData>) => {
    loading.value = true
    error.value = null

    try {
      const { items, ...orderData } = formData

      // Actualizar la orden
      const { error: orderError } = await supabase
        .from('purchase_orders')
        .update(orderData)
        .eq('id', id)

      if (orderError) throw orderError

      // Actualizar items si se proporcionan
      if (items) {
        // Eliminar items existentes
        await supabase
          .from('purchase_order_items')
          .delete()
          .eq('purchase_order_id', id)

        // Insertar nuevos items
        if (items.length > 0) {
          const orderItems = items.map(item => ({
            purchase_order_id: id,
            product_id: item.product_id,
            description: item.description,
            unit_code: item.unit_code,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.quantity * item.unit_price
          }))

          const { error: itemsError } = await supabase
            .from('purchase_order_items')
            .insert(orderItems)

          if (itemsError) throw itemsError

          // Actualizar el total
          const totalAmount = items.reduce((sum, item) =>
            sum + (item.quantity * item.unit_price), 0
          )

          await supabase
            .from('purchase_orders')
            .update({ total_amount: totalAmount })
            .eq('id', id)
        }
      }

      // Recargar datos
      await Promise.all([
        loadOrders(),
        currentOrder.value ? loadOrder(id) : Promise.resolve()
      ])

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error actualizando orden'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Eliminar orden de compra
   */
  const deleteOrder = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // Recargar la lista
      await loadOrders()

      // Limpiar orden actual si es la que se eliminó
      if (currentOrder.value?.id === id) {
        currentOrder.value = null
      }

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error eliminando orden'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ============================================================================
  // ACCIONES DE ESTADO
  // ============================================================================

  /**
   * Aprobar orden de compra
   */
  const approveOrder = async (id: string, notes?: string) => {
    loading.value = true
    error.value = null

    try {
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          status: 'APPROVED',
          notes: notes ? `${notes}\n\n[APROBADA]` : '[APROBADA]'
        })
        .eq('id', id)

      if (updateError) throw updateError

      await loadOrders()

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error aprobando orden'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Rechazar orden de compra
   */
  const rejectOrder = async (id: string, reason: string) => {
    loading.value = true
    error.value = null

    try {
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          status: 'REJECTED',
          notes: `[RECHAZADA] ${reason}`
        })
        .eq('id', id)

      if (updateError) throw updateError

      await loadOrders()

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error rechazando orden'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Cancelar orden de compra
   */
  const cancelOrder = async (id: string, reason: string) => {
    loading.value = true
    error.value = null

    try {
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          status: 'CANCELLED',
          notes: `[CANCELADA] ${reason}`
        })
        .eq('id', id)

      if (updateError) throw updateError

      await loadOrders()

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error cancelando orden'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  const refreshOrders = () => loadOrders()
  const clearError = () => { error.value = null }
  const clearCurrentOrder = () => { currentOrder.value = null }

  // Cambiar página
  const changePage = (page: number) => {
    filters.page = page
    loadOrders()
  }

  // Aplicar filtros
  const applyFilters = (newFilters: Partial<PurchaseOrderFilters>) => {
    filters.page = 1 // Reset a primera página
    loadOrders(newFilters)
  }

  return {
    // Estado
    orders,
    currentOrder,
    loading,
    error,
    filters,
    pagination,

    // Computed
    hasOrders,
    isEmpty,
    totalPages,

    // Acciones principales
    loadOrders,
    loadOrder,
    createOrder,
    updateOrder,
    deleteOrder,

    // Acciones de estado
    approveOrder,
    rejectOrder,
    cancelOrder,

    // Utilidades
    refreshOrders,
    clearError,
    clearCurrentOrder,
    changePage,
    applyFilters
  }
}
