<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <DocumentView
      :document="document"
      :loading="loading"
      :error="error"
      @edit="handleEdit"
      @create-reception="handleCreateReception"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import DocumentView from '../components/documents/DocumentView.vue'
import { usePurchaseDocs } from '../composables'
import type { PurchaseDoc } from '../types'

const router = useRouter()
const route = useRoute()
const docs = usePurchaseDocs()

const document = ref<PurchaseDoc | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const docId = computed(() => route.params.id as string)

const handleEdit = () => {
  router.push(`/purchases/documents/${docId.value}/edit`)
}

const handleCreateReception = () => {
  router.push(`/purchases/receptions/new?from_doc=${docId.value}`)
}

onMounted(async () => {
  loading.value = true
  try {
    document.value = await docs.getDocById(docId.value)
  } catch (err) {
    error.value = 'Error cargando el documento'
  } finally {
    loading.value = false
  }
})
</script>