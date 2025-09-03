<template>
    <div class="space-y-4">
        <!-- Payment Summary -->
        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Total a Pagar:</span>
                <span class="text-lg font-bold text-gray-900 dark:text-white">S/ {{ total.toFixed(2) }}</span>
            </div>

            <div v-if="totalPaid > 0" class="flex justify-between items-center mb-2">
                <span class="text-sm text-gray-600 dark:text-gray-400">Pagado:</span>
                <span class="text-sm font-medium text-green-600 dark:text-green-400">S/ {{ totalPaid.toFixed(2)
                    }}</span>
            </div>

            <div v-if="remainingAmount > 0" class="flex justify-between items-center mb-2">
                <span class="text-sm text-gray-600 dark:text-gray-400">Pendiente:</span>
                <span class="text-sm font-medium text-red-600 dark:text-red-400">S/ {{ remainingAmount.toFixed(2)
                    }}</span>
            </div>

            <div v-if="changeAmount > 0" class="flex justify-between items-center">
                <span class="text-sm text-gray-600 dark:text-gray-400">Vuelto:</span>
                <span class="text-sm font-medium text-blue-600 dark:text-blue-400">S/ {{ changeAmount.toFixed(2)
                    }}</span>
            </div>
        </div>

        <!-- Existing Payments -->
        <div v-if="payments.length > 0" class="space-y-2">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Pagos Registrados:</h4>
            <div v-for="(payment, index) in payments" :key="index"
                class="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                <div class="flex items-center space-x-2">
                    <component :is="getPaymentIcon(payment.type)" class="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span class="text-sm font-medium text-green-800 dark:text-green-200">
                        {{ getPaymentLabel(payment.type) }}
                    </span>
                    <span class="text-sm text-green-600 dark:text-green-400">
                        S/ {{ payment.amount.toFixed(2) }}
                    </span>
                </div>

                <Button @click="$emit('remove-payment', index)" variant="ghost" size="sm"
                    class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200">
                    <X class="h-3 w-3" />
                </Button>
            </div>
        </div>

        <!-- Payment Method Selection -->
        <div v-if="remainingAmount > 0" class="space-y-3">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Agregar Pago:</h4>

            <!-- Payment Type Buttons -->
            <div class="grid grid-cols-3 gap-2">
                <Button @click="selectPaymentType('CASH')"
                    :variant="selectedPaymentType === 'CASH' ? 'primary' : 'secondary'" size="sm"
                    class="flex flex-col items-center py-3">
                    <Banknote class="h-5 w-5 mb-1" />
                    <span class="text-xs">Efectivo</span>
                </Button>

                <Button @click="selectPaymentType('CARD')"
                    :variant="selectedPaymentType === 'CARD' ? 'primary' : 'secondary'" size="sm"
                    class="flex flex-col items-center py-3">
                    <CreditCard class="h-5 w-5 mb-1" />
                    <span class="text-xs">Tarjeta</span>
                </Button>

                <Button @click="selectPaymentType('TRANSFER')"
                    :variant="selectedPaymentType === 'TRANSFER' ? 'primary' : 'secondary'" size="sm"
                    class="flex flex-col items-center py-3">
                    <ArrowRightLeft class="h-5 w-5 mb-1" />
                    <span class="text-xs">Transfer.</span>
                </Button>
            </div>

            <!-- Payment Amount Input -->
            <div v-if="selectedPaymentType" class="space-y-3">
                <div class="flex items-center space-x-2">
                    <input v-model.number="paymentAmount" type="number" step="0.01" min="0.01" :max="remainingAmount"
                        placeholder="0.00"
                        class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">

                    <Button @click="setExactAmount" variant="secondary" size="sm" class="whitespace-nowrap">
                        Exacto
                    </Button>
                </div>

                <!-- Quick Amount Buttons for Cash -->
                <div v-if="selectedPaymentType === 'CASH'" class="grid grid-cols-4 gap-2">
                    <Button v-for="amount in quickAmounts" :key="amount" @click="paymentAmount = amount"
                        variant="secondary" size="sm" class="text-xs">
                        S/ {{ amount }}
                    </Button>
                </div>

                <!-- Card Details -->
                <div v-if="selectedPaymentType === 'CARD'" class="space-y-2">
                    <FormField v-model="cardType" label="Tipo de Tarjeta" type="select" :options="cardTypeOptions"
                        size="sm" />

                    <FormField v-model="authCode" label="Código de Autorización" type="text" placeholder="123456"
                        size="sm" />
                </div>

                <!-- Transfer Reference -->
                <div v-if="selectedPaymentType === 'TRANSFER'" class="space-y-2">
                    <FormField v-model="transferReference" label="Referencia de Transferencia" type="text"
                        placeholder="Número de operación" size="sm" />
                </div>

                <!-- Add Payment Button -->
                <Button @click="addPayment" :disabled="!canAddPayment"
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800">
                    <Plus class="h-4 w-4 mr-2" />
                    Agregar Pago S/ {{ paymentAmount.toFixed(2) }}
                </Button>
            </div>
        </div>

        <!-- Payment Complete Message -->
        <div v-if="remainingAmount <= 0 && totalPaid > 0"
            class="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
            <CheckCircle class="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <p class="text-sm font-medium text-green-800 dark:text-green-200">
                Pago Completo
            </p>
            <p v-if="changeAmount > 0" class="text-sm text-green-600 dark:text-green-400">
                Vuelto: S/ {{ changeAmount.toFixed(2) }}
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
    Banknote,
    CreditCard,
    ArrowRightLeft,
    Plus,
    X,
    CheckCircle
} from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import FormField from '@/components/ui/FormField.vue'
import type { POSPayment } from '@/types/pos'

interface Props {
    total: number
    payments: POSPayment[]
}

interface Emits {
    (e: 'add-payment', payment: POSPayment): void
    (e: 'remove-payment', index: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state
const selectedPaymentType = ref<'CASH' | 'CARD' | 'TRANSFER' | null>(null)
const paymentAmount = ref(0)
const cardType = ref('')
const authCode = ref('')
const transferReference = ref('')

// Computed values
const totalPaid = computed(() =>
    props.payments.reduce((sum, payment) => sum + payment.amount, 0)
)

const remainingAmount = computed(() =>
    Math.max(0, props.total - totalPaid.value)
)

const changeAmount = computed(() =>
    Math.max(0, totalPaid.value - props.total)
)

const canAddPayment = computed(() =>
    selectedPaymentType.value &&
    paymentAmount.value > 0 &&
    paymentAmount.value <= remainingAmount.value * 1.1 // Allow slight overpayment
)

// Quick amounts for cash payments
const quickAmounts = computed(() => {
    const remaining = remainingAmount.value
    const amounts = [10, 20, 50, 100, 200]

    // Add exact amount and round up amounts
    const suggestions = [
        remaining,
        Math.ceil(remaining / 10) * 10,
        Math.ceil(remaining / 20) * 20,
        Math.ceil(remaining / 50) * 50,
    ]

    // Combine and filter unique amounts
    return [...new Set([...suggestions, ...amounts])]
        .filter(amount => amount >= remaining && amount <= remaining + 100)
        .sort((a, b) => a - b)
        .slice(0, 4)
})

// Card type options
const cardTypeOptions = [
    { value: 'VISA', label: 'Visa' },
    { value: 'MASTERCARD', label: 'Mastercard' },
    { value: 'AMEX', label: 'American Express' },
    { value: 'DINERS', label: 'Diners Club' },
    { value: 'OTHER', label: 'Otra' },
]

// Methods
const selectPaymentType = (type: 'CASH' | 'CARD' | 'TRANSFER') => {
    selectedPaymentType.value = type
    paymentAmount.value = remainingAmount.value

    // Reset additional fields
    cardType.value = ''
    authCode.value = ''
    transferReference.value = ''
}

const setExactAmount = () => {
    paymentAmount.value = remainingAmount.value
}

const addPayment = () => {
    if (!selectedPaymentType.value || paymentAmount.value <= 0) return

    const payment: POSPayment = {
        type: selectedPaymentType.value,
        amount: paymentAmount.value,
    }

    // Add additional fields based on payment type
    if (selectedPaymentType.value === 'CARD') {
        payment.cardType = cardType.value
        payment.authCode = authCode.value
    } else if (selectedPaymentType.value === 'TRANSFER') {
        payment.reference = transferReference.value
    }

    emit('add-payment', payment)

    // Reset form
    selectedPaymentType.value = null
    paymentAmount.value = 0
    cardType.value = ''
    authCode.value = ''
    transferReference.value = ''
}

const getPaymentIcon = (type: string) => {
    switch (type) {
        case 'CASH': return Banknote
        case 'CARD': return CreditCard
        case 'TRANSFER': return ArrowRightLeft
        default: return Banknote
    }
}

const getPaymentLabel = (type: string) => {
    switch (type) {
        case 'CASH': return 'Efectivo'
        case 'CARD': return 'Tarjeta'
        case 'TRANSFER': return 'Transferencia'
        default: return type
    }
}
</script>
