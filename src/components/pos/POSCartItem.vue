<template>
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
        <!-- Product Info -->
        <div class="flex justify-between items-start mb-3">
            <div class="flex-1 min-w-0">
                <h4 class="font-medium text-gray-900 dark:text-white truncate">{{ item.name }}</h4>
                <p class="text-sm text-gray-600 dark:text-gray-300">SKU: {{ item.sku }}</p>
                <p class="text-sm text-blue-600 dark:text-blue-400">S/ {{ item.unitPrice.toFixed(2) }} c/u</p>
            </div>

            <Button @click="$emit('remove', item.productId)" variant="ghost" size="sm"
                class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 ml-2">
                <Trash2 class="h-4 w-4" />
            </Button>
        </div>

        <!-- Quantity Controls -->
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
                <Button @click="decreaseQuantity" variant="secondary" size="sm" :disabled="item.quantity <= 1"
                    class="w-8 h-8 p-0">
                    <Minus class="h-3 w-3" />
                </Button>

                <input :value="item.quantity" @input="handleQuantityInput" @blur="handleQuantityBlur" type="number"
                    min="1" :max="item.availableStock"
                    class="w-16 text-center border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">

                <Button @click="increaseQuantity" variant="secondary" size="sm"
                    :disabled="item.quantity >= item.availableStock" class="w-8 h-8 p-0">
                    <Plus class="h-3 w-3" />
                </Button>
            </div>

            <div class="text-sm text-gray-600 dark:text-gray-300">
                Stock: {{ item.availableStock }}
            </div>
        </div>

        <!-- Discount Input -->
        <div class="flex items-center justify-between mb-3">
            <label class="text-sm text-gray-600 dark:text-gray-300">Descuento %:</label>
            <div class="flex items-center space-x-2">
                <input :value="item.discount" @input="handleDiscountInput" @blur="handleDiscountBlur" type="number"
                    min="0" max="100" step="0.01"
                    class="w-20 text-center border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <span class="text-sm text-gray-600 dark:text-gray-300">%</span>
            </div>
        </div>

        <!-- Price Breakdown -->
        <div class="space-y-1 text-sm border-t border-gray-200 dark:border-gray-600 pt-3">
            <div class="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Subtotal:</span>
                <span>S/ {{ item.subtotal.toFixed(2) }}</span>
            </div>

            <div v-if="item.discount > 0" class="flex justify-between text-red-600 dark:text-red-400">
                <span>Descuento ({{ item.discount }}%):</span>
                <span>-S/ {{ (item.subtotal * item.discount / 100).toFixed(2) }}</span>
            </div>

            <div class="flex justify-between text-gray-600 dark:text-gray-300">
                <span>IGV ({{ item.taxRate }}%):</span>
                <span>S/ {{ (item.subtotal * (1 - item.discount / 100) * item.taxRate / 100).toFixed(2) }}</span>
            </div>

            <div
                class="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-600 pt-1">
                <span>Total:</span>
                <span>S/ {{ item.total.toFixed(2) }}</span>
            </div>
        </div>

        <!-- Stock Warning -->
        <div v-if="item.quantity > item.availableStock"
            class="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
            <div class="flex items-center">
                <AlertTriangle class="h-4 w-4 mr-2" />
                Stock insuficiente. Disponible: {{ item.availableStock }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Minus, Trash2, AlertTriangle } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import type { POSCartItem } from '@/types/pos'

interface Props {
    item: POSCartItem
}

interface Emits {
    (e: 'update-quantity', productId: string, quantity: number): void
    (e: 'update-discount', productId: string, discount: number): void
    (e: 'remove', productId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state for input handling
const tempQuantity = ref(props.item.quantity)
const tempDiscount = ref(props.item.discount)

// Quantity methods
const increaseQuantity = () => {
    if (props.item.quantity < props.item.availableStock) {
        emit('update-quantity', props.item.productId, props.item.quantity + 1)
    }
}

const decreaseQuantity = () => {
    if (props.item.quantity > 1) {
        emit('update-quantity', props.item.productId, props.item.quantity - 1)
    }
}

const handleQuantityInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    const value = parseInt(target.value) || 1
    tempQuantity.value = value
}

const handleQuantityBlur = () => {
    let quantity = tempQuantity.value

    // Validate quantity
    if (quantity < 1) quantity = 1
    if (quantity > props.item.availableStock) quantity = props.item.availableStock

    tempQuantity.value = quantity
    emit('update-quantity', props.item.productId, quantity)
}

// Discount methods
const handleDiscountInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    const value = parseFloat(target.value) || 0
    tempDiscount.value = value
}

const handleDiscountBlur = () => {
    let discount = tempDiscount.value

    // Validate discount
    if (discount < 0) discount = 0
    if (discount > 100) discount = 100

    tempDiscount.value = discount
    emit('update-discount', props.item.productId, discount)
}
</script>
