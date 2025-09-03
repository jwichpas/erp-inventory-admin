<template>
    <div class="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <!-- Header -->
        <div class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 p-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                        Punto de Venta
                    </h1>
                    <div v-if="currentSession" class="flex items-center space-x-2">
                        <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span class="text-sm text-gray-600 dark:text-gray-300">
                            Sesión Activa
                        </span>
                    </div>
                </div>

                <div class="flex items-center space-x-4">
                    <!-- Session Stats -->
                    <div v-if="sessionStats" class="text-sm text-gray-600 dark:text-gray-300">
                        <span>Ventas: {{ sessionStats.todayTransactions || 0 }}</span>
                        <span class="ml-4">Total: S/ {{ (sessionStats.todaySales || 0).toFixed(2) }}</span>
                    </div>

                    <!-- Session Management -->
                    <Button v-if="!isSessionOpen" @click="showSessionModal = true" variant="primary"
                        class="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800">
                        Abrir Sesión
                    </Button>

                    <Button v-else @click="showCloseSessionModal = true" variant="secondary"
                        class="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800">
                        Cerrar Sesión
                    </Button>
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="flex-1 flex overflow-hidden">
            <!-- Left Panel - Product Search & Cart -->
            <div class="flex-1 flex flex-col bg-white dark:bg-gray-800">
                <!-- Product Search -->
                <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div class="relative">
                        <input v-model="searchQuery" type="text" placeholder="Buscar productos por SKU o nombre..."
                            class="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                            @keyup.enter="handleBarcodeSearch">
                        <Search class="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    </div>
                </div>

                <!-- Product Results -->
                <div class="flex-1 overflow-y-auto p-4">
                    <div v-if="isSearching" class="text-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p class="mt-2 text-gray-600 dark:text-gray-400">Buscando productos...</p>
                    </div>

                    <div v-else-if="searchResults && searchResults.length > 0"
                        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div v-for="product in searchResults" :key="product.id"
                            class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white dark:bg-gray-700"
                            @click="addToCart(product)">
                            <div class="flex justify-between items-start mb-2">
                                <h3 class="font-medium text-gray-900 dark:text-white truncate">{{ product.name }}</h3>
                                <span class="text-sm text-gray-500 dark:text-gray-400">{{ product.sku }}</span>
                            </div>

                            <div class="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                <p v-if="product.brandName">{{ product.brandName }}</p>
                                <p v-if="product.categoryName">{{ product.categoryName }}</p>
                            </div>

                            <div class="flex justify-between items-center">
                                <span class="text-lg font-bold text-blue-600 dark:text-blue-400">
                                    S/ {{ product.currentPrice.toFixed(2) }}
                                </span>
                                <span class="text-sm px-2 py-1 rounded" :class="product.availableStock > product.minStock
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'">
                                    Stock: {{ product.availableStock }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div v-else-if="searchQuery.length >= 2" class="text-center py-8">
                        <Package class="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p class="text-gray-600 dark:text-gray-400">No se encontraron productos</p>
                    </div>

                    <div v-else class="text-center py-8">
                        <Search class="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p class="text-gray-600 dark:text-gray-400">Ingrese al menos 2 caracteres para buscar</p>
                    </div>
                </div>
            </div>

            <!-- Right Panel - Cart & Checkout -->
            <div class="w-96 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col">
                <!-- Customer Selection -->
                <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                    <POSCustomerSelector v-model="selectedCustomer" @customer-created="handleCustomerCreated" />
                </div>

                <!-- Cart Items -->
                <div class="flex-1 overflow-y-auto p-4">
                    <h3 class="font-medium text-gray-900 dark:text-white mb-4">
                        Carrito ({{ cart.length }} items)
                    </h3>

                    <div v-if="cart.length === 0" class="text-center py-8">
                        <ShoppingCart class="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p class="text-gray-600 dark:text-gray-400">Carrito vacío</p>
                    </div>

                    <div v-else class="space-y-3">
                        <POSCartItem v-for="item in cart" :key="item.productId" :item="item"
                            @update-quantity="updateCartItemQuantity" @update-discount="updateCartItemDiscount"
                            @remove="removeFromCart" />
                    </div>
                </div>

                <!-- Cart Totals -->
                <div v-if="cart.length > 0" class="border-t border-gray-200 dark:border-gray-700 p-4">
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between text-gray-600 dark:text-gray-300">
                            <span>Subtotal:</span>
                            <span>S/ {{ cartSubtotal.toFixed(2) }}</span>
                        </div>
                        <div class="flex justify-between text-gray-600 dark:text-gray-300">
                            <span>IGV (18%):</span>
                            <span>S/ {{ cartTaxAmount.toFixed(2) }}</span>
                        </div>
                        <div v-if="cartDiscountAmount > 0" class="flex justify-between text-red-600 dark:text-red-400">
                            <span>Descuento:</span>
                            <span>-S/ {{ cartDiscountAmount.toFixed(2) }}</span>
                        </div>
                        <div
                            class="flex justify-between text-lg font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-600 pt-2">
                            <span>Total:</span>
                            <span>S/ {{ cartTotal.toFixed(2) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Payment & Checkout -->
                <div v-if="cart.length > 0" class="border-t border-gray-200 dark:border-gray-700 p-4">
                    <POSPaymentPanel :total="cartTotal" :payments="payments" @add-payment="addPayment"
                        @remove-payment="removePayment" />

                    <Button @click="handleCheckout" :disabled="!canCompleteSale || isCompletingSale"
                        :loading="isCompletingSale"
                        class="w-full mt-4 bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800">
                        <CreditCard class="h-5 w-5 mr-2" />
                        Completar Venta
                    </Button>

                    <Button @click="clearCart" variant="secondary" class="w-full mt-2">
                        <X class="h-5 w-5 mr-2" />
                        Limpiar Carrito
                    </Button>
                </div>
            </div>
        </div>

        <!-- Session Management Modals -->
        <POSSessionModal :show="showSessionModal" @update:show="showSessionModal = $event"
            @session-opened="handleSessionOpened" />

        <POSCloseSessionModal :show="showCloseSessionModal" @update:show="showCloseSessionModal = $event"
            :session="currentSession" @session-closed="handleSessionClosed" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Search, Package, ShoppingCart, CreditCard, X } from 'lucide-vue-next'
import { usePOS } from '@/composables/usePOS'
import { usePOSSession } from '@/composables/usePOSSession'
import { usePOSSales } from '@/composables/usePOSSales'
import { usePOSCustomers } from '@/composables/usePOSCustomers'
import { useToast } from '@/composables/useToast'
import Button from '@/components/ui/Button.vue'
import POSCustomerSelector from './POSCustomerSelector.vue'
import POSCartItem from './POSCartItem.vue'
import POSPaymentPanel from './POSPaymentPanel.vue'
import POSSessionModal from './POSSessionModal.vue'
import POSCloseSessionModal from './POSCloseSessionModal.vue'
import type { POSProduct, POSCustomer } from '@/types/pos'

// Composables
const {
    cart,
    selectedCustomer,
    payments,
    searchQuery,
    selectedWarehouseId,
    searchResults,
    isSearching,
    cartSubtotal,
    cartTaxAmount,
    cartDiscountAmount,
    cartTotal,
    canCompleteSale,
    validateCartStock,
    addToCart: addProductToCart,
    updateCartItemQuantity,
    updateCartItemDiscount,
    removeFromCart,
    clearCart,
    addPayment,
    removePayment,
} = usePOS()

const {
    currentSession,
    sessionStats,
    isSessionOpen,
    canOpenSession,
} = usePOSSession()

const {
    completeSale,
    isCompletingSale,
    generateReceiptData,
    printReceipt,
} = usePOSSales()

const { defaultCustomer } = usePOSCustomers()
const { showToast } = useToast()

// Local state
const showSessionModal = ref(false)
const showCloseSessionModal = ref(false)

// Set default warehouse from session
watch(currentSession, (session) => {
    if (session?.warehouseId) {
        selectedWarehouseId.value = session.warehouseId
    }
}, { immediate: true })

// Set default customer if none selected
watch(defaultCustomer, (customer) => {
    if (customer && !selectedCustomer.value) {
        selectedCustomer.value = customer
    }
}, { immediate: true })

// Methods
const addToCart = (product: POSProduct) => {
    if (!isSessionOpen.value) {
        showToast('Debe abrir una sesión POS primero', 'error')
        return
    }
    addProductToCart(product, 1)
}

const handleBarcodeSearch = () => {
    // Handle barcode scanning or quick search
    if (searchQuery.value.trim() && searchResults.value?.length === 1) {
        addToCart(searchResults.value[0])
        searchQuery.value = ''
    }
}

const handleCustomerCreated = (customer: POSCustomer) => {
    selectedCustomer.value = customer
}

const handleCheckout = async () => {
    if (!currentSession.value || !selectedCustomer.value) {
        showToast('Sesión o cliente no válidos', 'error')
        return
    }

    // Validate stock before processing sale
    const stockValid = await validateCartStock()
    if (!stockValid) {
        return
    }

    try {
        const sale = await completeSale({
            sessionId: currentSession.value.id!,
            customerId: selectedCustomer.value.id,
            items: cart.value,
            payments: payments.value,
        })

        // Generate and print receipt
        const receiptData = await generateReceiptData(sale, selectedCustomer.value)
        await printReceipt(receiptData)

        // Clear cart after successful sale
        clearCart()

        showToast('Venta completada exitosamente', 'success')
    } catch (error) {
        console.error('Error completing sale:', error)
        showToast('Error al completar la venta', 'error')
    }
}

const handleSessionOpened = () => {
    showSessionModal.value = false
    showToast('Sesión POS abierta', 'success')
}

const handleSessionClosed = () => {
    showCloseSessionModal.value = false
    clearCart()
    showToast('Sesión POS cerrada', 'success')
}

onMounted(() => {
    // Check if there's an active session
    if (!isSessionOpen.value && canOpenSession.value) {
        showToast('No hay sesión POS activa. Abra una sesión para comenzar.', 'info')
    }
})
</script>
