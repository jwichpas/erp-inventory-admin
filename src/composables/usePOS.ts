import { ref, computed, watch, readonly } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { supabase } from '@/lib/supabase'
import { useCompanyStore } from '@/stores/company'
import { useToast } from '@/composables/useToast'
import type {
  POSProduct,
  POSCustomer,
  POSCartItem,
  POSPayment,
  POSSale,
  POSSession,
} from '@/types/pos'
import { posCartItemSchema, posSaleSchema } from '@/schemas/posSchemas'

export const usePOS = () => {
  const companyStore = useCompanyStore()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  // State
  const cart = ref<POSCartItem[]>([])
  const selectedCustomer = ref<POSCustomer | null>(null)
  const payments = ref<POSPayment[]>([])
  const currentSession = ref<POSSession | null>(null)
  const searchQuery = ref('')
  const selectedWarehouseId = ref<string>('')

  // Computed values
  const cartSubtotal = computed(() => cart.value.reduce((sum, item) => sum + item.subtotal, 0))

  const cartTaxAmount = computed(() =>
    cart.value.reduce((sum, item) => sum + (item.subtotal * item.taxRate) / 100, 0),
  )

  const cartDiscountAmount = computed(() =>
    cart.value.reduce((sum, item) => sum + (item.subtotal * item.discount) / 100, 0),
  )

  const cartTotal = computed(
    () => cartSubtotal.value + cartTaxAmount.value - cartDiscountAmount.value,
  )

  const totalPaid = computed(() => payments.value.reduce((sum, payment) => sum + payment.amount, 0))

  const changeAmount = computed(() => Math.max(0, totalPaid.value - cartTotal.value))

  const remainingAmount = computed(() => Math.max(0, cartTotal.value - totalPaid.value))

  const canCompleteSale = computed(
    () => cart.value.length > 0 && selectedCustomer.value && totalPaid.value >= cartTotal.value,
  )

  // Product search
  const searchProducts = async (query: string, warehouseId: string): Promise<POSProduct[]> => {
    if (!query.trim() || !warehouseId) return []

    const { data, error } = await supabase
      .from('products')
      .select(
        `
        id,
        sku,
        name,
        unit_code,
        is_serialized,
        brands!inner(name),
        categories!inner(name),
        warehouse_stock!inner(
          balance_qty,
          warehouse_id
        ),
        price_list_items!inner(
          unit_price,
          price_lists!inner(is_default)
        )
      `,
      )
      .eq('company_id', companyStore.currentCompany?.id)
      .eq('warehouse_stock.warehouse_id', warehouseId)
      .eq('price_list_items.price_lists.is_default', true)
      .or(`sku.ilike.%${query}%,name.ilike.%${query}%`)
      .textSearch('search_vector', query)
      .limit(20)

    if (error) {
      console.error('Error searching products:', error)
      return []
    }

    return (
      data?.map((product) => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        brandName: product.brands?.name,
        categoryName: product.categories?.name,
        unitCode: product.unit_code,
        currentPrice: product.price_list_items?.[0]?.unit_price || 0,
        availableStock: product.warehouse_stock?.[0]?.balance_qty || 0,
        minStock: 0, // TODO: Add min_stock to products table
        isSerialized: product.is_serialized,
        taxRate: 18, // Default IGV rate
      })) || []
    )
  }

  // Product search query
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['pos-products', searchQuery, selectedWarehouseId],
    queryFn: () => searchProducts(searchQuery.value, selectedWarehouseId.value),
    enabled: computed(() => searchQuery.value.length >= 2 && !!selectedWarehouseId.value),
    staleTime: 30000, // 30 seconds
  })

  // Validate cart stock using SQL function
  const validateCartStock = async (): Promise<boolean> => {
    if (!companyStore.currentCompany?.id || !selectedWarehouseId.value || cart.value.length === 0) {
      return true
    }

    try {
      const cartItems = cart.value.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }))

      const { data: validation, error } = await supabase.rpc('validate_pos_cart', {
        p_company_id: companyStore.currentCompany.id,
        p_warehouse_id: selectedWarehouseId.value,
        p_cart_items: cartItems,
      })

      if (error) {
        console.error('Error validating cart stock:', error)
        return false
      }

      if (validation?.has_stock_errors) {
        const errorItems = validation.items?.filter((item: any) => !item.is_sufficient) || []
        if (errorItems.length > 0) {
          showToast(`Stock insuficiente para: ${errorItems.map((item: any) => item.product_name).join(', ')}`, 'error')
          return false
        }
      }

      return true
    } catch (error) {
      console.error('Error validating stock:', error)
      return false
    }
  }

  // Cart management
  const addToCart = (product: POSProduct, quantity: number = 1) => {
    if (quantity <= 0 || quantity > product.availableStock) {
      showToast('Cantidad inválida o insuficiente stock', 'error')
      return
    }

    const existingItem = cart.value.find((item) => item.productId === product.id)

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity
      if (newQuantity > product.availableStock) {
        showToast('Stock insuficiente', 'error')
        return
      }
      updateCartItemQuantity(product.id, newQuantity)
    } else {
      const cartItem: POSCartItem = {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity,
        unitPrice: product.currentPrice,
        discount: 0,
        taxRate: product.taxRate,
        subtotal: product.currentPrice * quantity,
        total: product.currentPrice * quantity * (1 + product.taxRate / 100),
        availableStock: product.availableStock,
      }

      try {
        posCartItemSchema.parse(cartItem)
        cart.value.push(cartItem)
        showToast('Producto agregado al carrito', 'success')
      } catch (error) {
        showToast('Error al agregar producto', 'error')
      }
    }
  }

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    const item = cart.value.find((item) => item.productId === productId)
    if (!item) return

    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    if (quantity > item.availableStock) {
      showToast('Stock insuficiente', 'error')
      return
    }

    item.quantity = quantity
    item.subtotal = item.unitPrice * quantity * (1 - item.discount / 100)
    item.total = item.subtotal * (1 + item.taxRate / 100)
  }

  const updateCartItemDiscount = (productId: string, discount: number) => {
    const item = cart.value.find((item) => item.productId === productId)
    if (!item) return

    if (discount < 0 || discount > 100) {
      showToast('Descuento inválido', 'error')
      return
    }

    item.discount = discount
    item.subtotal = item.unitPrice * item.quantity * (1 - discount / 100)
    item.total = item.subtotal * (1 + item.taxRate / 100)
  }

  const removeFromCart = (productId: string) => {
    const index = cart.value.findIndex((item) => item.productId === productId)
    if (index > -1) {
      cart.value.splice(index, 1)
      showToast('Producto eliminado del carrito', 'info')
    }
  }

  const clearCart = () => {
    cart.value = []
    payments.value = []
    selectedCustomer.value = null
  }

  // Payment management
  const addPayment = (payment: POSPayment) => {
    if (payment.amount <= 0) {
      showToast('Monto de pago inválido', 'error')
      return
    }

    if (totalPaid.value + payment.amount > cartTotal.value * 1.1) {
      showToast('El pago excede el total de la venta', 'error')
      return
    }

    payments.value.push(payment)
    showToast('Pago agregado', 'success')
  }

  const removePayment = (index: number) => {
    if (index >= 0 && index < payments.value.length) {
      payments.value.splice(index, 1)
      showToast('Pago eliminado', 'info')
    }
  }

  return {
    // State
    cart: readonly(cart),
    selectedCustomer,
    payments: readonly(payments),
    currentSession: readonly(currentSession),
    searchQuery,
    selectedWarehouseId,
    searchResults: readonly(searchResults),
    isSearching: readonly(isSearching),

    // Computed
    cartSubtotal: readonly(cartSubtotal),
    cartTaxAmount: readonly(cartTaxAmount),
    cartDiscountAmount: readonly(cartDiscountAmount),
    cartTotal: readonly(cartTotal),
    totalPaid: readonly(totalPaid),
    changeAmount: readonly(changeAmount),
    remainingAmount: readonly(remainingAmount),
    canCompleteSale: readonly(canCompleteSale),

    // Methods
    validateCartStock,
    addToCart,
    updateCartItemQuantity,
    updateCartItemDiscount,
    removeFromCart,
    clearCart,
    addPayment,
    removePayment,
  }
}
