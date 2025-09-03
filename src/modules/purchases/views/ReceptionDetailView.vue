<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <ReceptionView
      :reception="reception"
      :loading="loading"
      :error="error"
      @edit="handleEdit"
      @approve="handleApprove"
      @reject="handleReject"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import ReceptionView from '../components/receipts/ReceptionView.vue'
import { useReceptions } from '../composables'
import { useToast } from '@/composables/useToast'
import type { Reception } from '../types'

const router = useRouter()
const route = useRoute()
const { toast } = useToast()
const receptions = useReceptions()

const reception = ref<Reception | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const receptionId = computed(() => route.params.id as string)

const handleEdit = () => {
  router.push(`/purchases/receptions/${receptionId.value}/edit`)
}

const handleApprove = async () => {
  try {
    await receptions.approveReception(receptionId.value, 'Aprobado desde la vista de detalle')
    toast.success('Recepción aprobada correctamente')
    // Reload reception
    reception.value = await receptions.getReceptionById(receptionId.value)
  } catch (error) {
    toast.error('Error aprobando la recepción')
  }
}

const handleReject = async () => {
  try {
    await receptions.rejectReception(receptionId.value, 'Rechazado desde la vista de detalle')
    toast.success('Recepción rechazada')
    // Reload reception
    reception.value = await receptions.getReceptionById(receptionId.value)
  } catch (error) {
    toast.error('Error rechazando la recepción')
  }
}

onMounted(async () => {
  loading.value = true
  try {
    reception.value = await receptions.getReceptionById(receptionId.value)
  } catch (err) {
    error.value = 'Error cargando la recepción'
  } finally {
    loading.value = false
  }
})
</script>