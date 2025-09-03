<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <ReceptionForm
      :initial-data="initialData"
      :loading="loading"
      :is-edit="isEdit"
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
import ReceptionForm from '../components/receipts/ReceptionForm.vue'
import { useReceptions } from '../composables'
import { useToast } from '@/composables/useToast'
import type { ReceptionFormData } from '../types'

const router = useRouter()
const route = useRoute()
const { toast } = useToast()
const receptions = useReceptions()

const loading = ref(false)
const initialData = ref<Partial<ReceptionFormData> | undefined>(undefined)
const warehouses = ref<Array<{ id: string; name: string }>>([])

const isEdit = computed(() => !!route.params.id)
const receptionId = computed(() => route.params.id as string)

const handleSubmit = async (data: ReceptionFormData) => {
  loading.value = true
  try {
    if (isEdit.value) {
      await receptions.updateReception(receptionId.value, data)
      toast.success('Recepción actualizada correctamente')
    } else {
      const newReception = await receptions.createReception(data)
      toast.success('Recepción creada correctamente')
      router.push(`/purchases/receptions/${newReception.id}`)
      return
    }
    router.push('/purchases')
  } catch (error) {
    toast.error('Error guardando la recepción')
  } finally {
    loading.value = false
  }
}

const handleSaveDraft = async (data: ReceptionFormData) => {
  handleSubmit(data)
}

const handleCancel = () => {
  router.push('/purchases')
}

onMounted(async () => {
  // TODO: Load initial data if editing
})
</script>