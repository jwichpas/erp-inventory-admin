<template>
    <Modal :show="show" @update:show="$emit('update:show', $event)" title="Cerrar Sesión POS" size="lg"
        :persistent="true">
        <div class="space-y-6">
            <!-- Session Summary -->
            <div v-if="session" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 class="font-medium text-gray-900 dark:text-white mb-3">Resumen de la Sesión</h3>

                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span class="text-gray-600 dark:text-gray-400">Apertura:</span>
                        <span class="ml-2 font-medium text-gray-900 dark:text-white">
                            {{ new Date(session.openedAt).toLocaleString() }}
                        </span>
                    </div>

                    <div>
                        <span class="text-gray-600 dark:text-gray-400">Monto Inicial:</span>
                        <span class="ml-2 font-medium text-gray-900 dark:text-white">
                            S/ {{ session.openingAmount.toFixed(2) }}
                        </span>
                    </div>

                    <div v-if="sessionStats">
                        <span class="text-gray-600 dark:text-gray-400">Ventas:</span>
                        <span class="ml-2 font-medium text-gray-900 dark:text-white">
                            {{ sessionStats.todayTransactions }} transacciones
                        </span>
                    </div>

                    <div v-if="sessionStats">
                        <span class="text-gray-600 dark:text-gray-400">Total Vendido:</span>
                        <span class="ml-2 font-medium text-gray-900 dark:text-white">
                            S/ {{ sessionStats.todaySales.toFixed(2) }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Payment Method Breakdown -->
            <div v-if="sessionStats?.paymentMethodBreakdown" class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 class="font-medium text-blue-900 dark:text-blue-100 mb-3">Desglose por Método de Pago</h3>

                <div class="space-y-2">
                    <div v-for="method in sessionStats.paymentMethodBreakdown" :key="method.method"
                        class="flex justify-between items-center text-sm">
                        <span class="text-blue-800 dark:text-blue-200">{{ getPaymentMethodLabel(method.method)
                        }}:</span>
                        <div class="text-right">
                            <span class="font-medium text-blue-900 dark:text-blue-100">S/ {{ method.amount.toFixed(2)
                            }}</span>
                            <span class="ml-2 text-blue-600 dark:text-blue-400">({{ method.percentage.toFixed(1)
                            }}%)</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Cash Count Form -->
            <form @submit.prevent="handleCloseSession" class="space-y-4">
                <div
                    class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div class="flex items-start space-x-3">
                        <Calculator class="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                        <div>
                            <h3 class="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Conteo de Efectivo</h3>
                            <p class="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                                Cuente todo el efectivo en caja y registre el monto total
                            </p>

                            <!-- Expected Amount Display -->
                            <div v-if="expectedAmount !== null"
                                class="mb-4 p-3 bg-white dark:bg-gray-800 rounded border">
                                <div class="flex justify-between items-center text-sm">
                                    <span class="text-gray-600 dark:text-gray-400">Monto Esperado:</span>
                                    <span class="font-medium text-gray-900 dark:text-white">
                                        S/ {{ expectedAmount.toFixed(2) }}
                                    </span>
                                </div>
                                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    (Apertura + Ventas en Efectivo)
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Closing Amount Input -->
                <FormField v-model.number="closingAmount" label="Monto de Cierre (Efectivo Contado)" type="number"
                    step="0.01" min="0" required placeholder="0.00" class="text-lg">
                    <template #help>
                        Ingrese el monto total de efectivo contado en caja
                    </template>
                </FormField>

                <!-- Difference Display -->
                <div v-if="closingAmount > 0 && expectedAmount !== null" class="p-3 rounded-lg border">
                    <div class="flex justify-between items-center">
                        <span class="font-medium text-gray-700 dark:text-gray-300">Diferencia:</span>
                        <span class="text-lg font-bold" :class="difference >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'">
                            {{ difference >= 0 ? '+' : '' }}S/ {{ difference.toFixed(2) }}
                        </span>
                    </div>

                    <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {{ difference > 0 ? 'Sobrante' : difference < 0 ? 'Faltante' : 'Exacto' }} </div>
                    </div>

                    <!-- Notes -->
                    <FormField v-model="notes" label="Observaciones (Opcional)" type="textarea"
                        placeholder="Notas sobre el cierre de sesión, diferencias encontradas, etc..." rows="3" />

                    <!-- Warning for Large Differences -->
                    <div v-if="Math.abs(difference) > 10"
                        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div class="flex items-start space-x-3">
                            <AlertTriangle class="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                            <div class="text-sm text-red-800 dark:text-red-200">
                                <p class="font-medium mb-1">Diferencia Significativa Detectada</p>
                                <p>Se ha detectado una diferencia de S/ {{ Math.abs(difference).toFixed(2) }}.
                                    Por favor verifique el conteo y agregue observaciones si es necesario.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="secondary" @click="handleCancel" :disabled="isClosingSession">
                            Cancelar
                        </Button>

                        <Button type="submit" :loading="isClosingSession" :disabled="closingAmount < 0"
                            class="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800">
                            <Square class="h-4 w-4 mr-2" />
                            Cerrar Sesión
                        </Button>
                    </div>
            </form>
        </div>
    </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Calculator, AlertTriangle, Square } from 'lucide-vue-next'
import { usePOSSession } from '@/composables/usePOSSession'
import { useToast } from '@/composables/useToast'
import Modal from '@/components/ui/Modal.vue'
import FormField from '@/components/ui/FormField.vue'
import Button from '@/components/ui/Button.vue'
import type { POSSession } from '@/types/pos'

interface Props {
    show: boolean
    session?: POSSession | null
}

interface Emits {
    (e: 'update:show', value: boolean): void
    (e: 'session-closed'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Composables
const { closeSession, isClosingSession, sessionStats } = usePOSSession()
const { showToast } = useToast()

// Local state
const closingAmount = ref(0)
const notes = ref('')

// Computed values
const expectedAmount = computed(() => {
    if (!props.session || !sessionStats.value) return null

    // Calculate expected amount: opening amount + cash sales
    const cashSales = sessionStats.value.paymentMethodBreakdown
        ?.find(method => method.method === 'CASH')?.amount || 0

    return props.session.openingAmount + cashSales
})

const difference = computed(() => {
    if (expectedAmount.value === null) return 0
    return closingAmount.value - expectedAmount.value
})

// Methods
const handleCloseSession = async () => {
    if (closingAmount.value < 0) {
        showToast('El monto de cierre no puede ser negativo', 'error')
        return
    }

    try {
        await closeSession(closingAmount.value, notes.value || undefined)
        emit('session-closed')
        resetForm()
    } catch (error) {
        console.error('Error closing session:', error)
    }
}

const handleCancel = () => {
    emit('update:show', false)
    resetForm()
}

const resetForm = () => {
    closingAmount.value = 0
    notes.value = ''
}

const getPaymentMethodLabel = (method: string) => {
    switch (method) {
        case 'CASH': return 'Efectivo'
        case 'CARD': return 'Tarjeta'
        case 'TRANSFER': return 'Transferencia'
        default: return method
    }
}

// Reset form when modal closes
watch(() => props.show, (show) => {
    if (!show) {
        resetForm()
    } else if (expectedAmount.value !== null) {
        // Pre-fill with expected amount
        closingAmount.value = expectedAmount.value
    }
})
</script>
