<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <DocumentForm
      :initial-data="initialData"
      :loading="loading"
      :is-edit="isEdit"
      :suppliers="suppliers"
      @submit="handleSubmit"
      @save-draft="handleSaveDraft"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import DocumentForm from '../components/documents/DocumentForm.vue'
import { usePurchaseDocs } from '../composables'
import { useToast } from '@/composables/useToast'
import type { DocumentFormData } from '../types'

const router = useRouter()
const route = useRoute()
const { toast } = useToast()
const docs = usePurchaseDocs()

const loading = ref(false)
const initialData = ref<Partial<DocumentFormData> | undefined>(undefined)
const suppliers = ref<Array<{ id: string; name: string }>>([])

const isEdit = computed(() => !!route.params.id)
const docId = computed(() => route.params.id as string)

const handleSubmit = async (data: DocumentFormData) => {
  loading.value = true
  try {
    if (isEdit.value) {
      await docs.updateDoc(docId.value, data)
      toast.success('Documento actualizado correctamente')
    } else {
      const newDoc = await docs.createDoc(data)
      toast.success('Documento creado correctamente')
      router.push(`/purchases/documents/${newDoc.id}`)
      return
    }
    router.push('/purchases')
  } catch (error) {
    toast.error('Error guardando el documento')
  } finally {
    loading.value = false
  }
}

const handleSaveDraft = async (data: DocumentFormData) => {
  // Similar to handleSubmit but as draft
  handleSubmit(data)
}

const handleCancel = () => {
  router.push('/purchases')
}

onMounted(async () => {
  // TODO: Load initial data if editing
})
</script>