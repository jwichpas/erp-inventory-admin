<template>
    <Modal :show="show" @update:show="$emit('update:show', $event)" title="Abrir Sesión POS" size="md"
        :persistent="true">
        <form @submit.prevent="handleOpenSession" class="space-y-6">
            <!-- Warehouse Selection -->
            <FormField v-model="selectedWarehouseId" label="Almacén" type="select" :options="warehouseOptions" required
                :loading="isLoadingWarehouses" />

            <!-- Opening Amount -->
            <FormField v-model.number="openingAmount" label="Monto de Apertura (Efectivo en Caja)" type="number"
                step="0.01" min="0" required placeholder="0.00">
                <template #help>
                    Ingrese el monto en efectivo con el que inicia la sesión
                </template>
            </FormField>

            <!-- Notes -->
            <FormField v-model="notes" label="Notas (Opcional)" type="textarea"
                placeholder="Observaciones sobre la apertura de sesión..." rows="3" />

            <!-- Session Info -->
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div class="flex items-start space-x-3">
                    <Info class="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div class="text-sm text-blue-800 dark:text-blue-200">
                        <p class="font-medium mb-1">Información de la Sesión:</p>
                        <ul class="space-y-1 text-blue-700 dark:text-blue-300">
                            <li>• La sesión se abrirá para el usuario actual</li>
                            <li>• Solo puede tener una sesión activa por vez</li>
                            <li>• Registre el monto exacto de efectivo inicial</li>
                            <li>• Podrá realizar ventas una vez abierta la sesión</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" @click="handleCancel" :disabled="isOpeningSession">
                    Cancelar
                </Button>

                <Button type="submit" :loading="isOpeningSession" :disabled="!selectedWarehouseId || openingAmount < 0"
                    class="bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800">
                    <Play class="h-4 w-4 mr-2" />
                    Abrir Sesión
                </Button>
            </div>
        </form>
    </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Play, Info } from 'lucide-vue-next'
import { useQuery } from '@tanstack/vue-query'
import { supabase } from '@/lib/supabase'
import { useCompanyStore } from '@/stores/company'
import { usePOSSession } from '@/composables/usePOSSession'
import { useToast } from '@/composables/useToast'
import Modal from '@/components/ui/Modal.vue'
import FormField from '@/components/ui/FormField.vue'
import Button from '@/components/ui/Button.vue'

interface Props {
    show: boolean
}

interface Emits {
    (e: 'update:show', value: boolean): void
    (e: 'session-opened'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Composables
const companyStore = useCompanyStore()
const { openSession, isOpeningSession } = usePOSSession()
const { showToast } = useToast()

// Local state
const selectedWarehouseId = ref('')
const openingAmount = ref(0)
const notes = ref('')

// Warehouses query
const {
    data: warehouses,
    isLoading: isLoadingWarehouses
} = useQuery({
    queryKey: ['warehouses', companyStore.currentCompany?.id],
    queryFn: async () => {
        if (!companyStore.currentCompany?.id) return []

        const { data, error } = await supabase
            .from('warehouses')
            .select('id, code, name')
            .eq('company_id', companyStore.currentCompany.id)
            .eq('is_active', true)
            .order('name')

        if (error) {
            console.error('Error fetching warehouses:', error)
            return []
        }

        return data || []
    },
    enabled: computed(() => !!companyStore.currentCompany?.id && props.show),
})

// Warehouse options for select
const warehouseOptions = computed(() =>
    warehouses.value?.map(warehouse => ({
        value: warehouse.id,
        label: `${warehouse.code} - ${warehouse.name}`
    })) || []
)

// Methods
const handleOpenSession = async () => {
    if (!selectedWarehouseId.value) {
        showToast('Seleccione un almacén', 'error')
        return
    }

    if (openingAmount.value < 0) {
        showToast('El monto de apertura no puede ser negativo', 'error')
        return
    }

    try {
        await openSession(
            selectedWarehouseId.value,
            openingAmount.value,
            notes.value || undefined
        )

        emit('session-opened')
        resetForm()
    } catch (error) {
        console.error('Error opening session:', error)
    }
}

const handleCancel = () => {
    emit('update:show', false)
    resetForm()
}

const resetForm = () => {
    selectedWarehouseId.value = ''
    openingAmount.value = 0
    notes.value = ''
}

// Auto-select warehouse if only one available
watch(warehouseOptions, (options) => {
    if (options.length === 1 && !selectedWarehouseId.value) {
        selectedWarehouseId.value = options[0].value
    }
}, { immediate: true })

// Reset form when modal closes
watch(() => props.show, (show) => {
    if (!show) {
        resetForm()
    }
})
</script>
