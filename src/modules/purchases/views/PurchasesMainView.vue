<template>
  <div class="space-y-6">
    <!-- Encabezado -->
    <div class="bg-white dark:bg-gray-800 shadow">
      <div class="px-4 sm:px-6 lg:px-8">
        <div class="py-6">
          <div class="md:flex md:items-center md:justify-between">
            <div class="flex-1 min-w-0">
              <h2 class="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
                Gestión de Compras
              </h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Sistema completo de gestión de compras: órdenes, documentos y recepciones
              </p>
            </div>
            <div class="mt-4 flex md:mt-0 md:ml-4 space-x-3">
              <button
                type="button"
                @click="refreshCurrentTab"
                :disabled="isLoading"
                class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <RefreshCw :class="['h-4 w-4 mr-2', isLoading && 'animate-spin']" />
                Actualizar
              </button>
              <button
                @click="createNew"
                class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus class="h-4 w-4 mr-2" />
                {{ getCreateButtonText() }}
              </button>
            </div>
          </div>

          <!-- Navigation Tabs -->
          <div class="mt-6">
            <nav class="flex space-x-8" aria-label="Tabs">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                @click="activeTab = tab.key"
                :class="[
                  'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center',
                  activeTab === tab.key
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300',
                ]"
              >
                <component :is="tab.icon" class="h-4 w-4 mr-2" />
                {{ tab.label }}
                <span
                  v-if="tab.badge > 0"
                  :class="[
                    'ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    activeTab === tab.key
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-100'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
                  ]"
                >
                  {{ tab.badge }}
                </span>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Contenido por pestaña -->
    <div class="px-4 sm:px-6 lg:px-8">
      <!-- Órdenes de Compra -->
      <div v-if="activeTab === 'orders'">
        <OrdersList
          :orders="purchases.orders.orders.value"
          :loading="purchases.orders.loading.value"
          :filters="purchases.orders.filters"
          :pagination="purchases.orders.pagination"
          :suppliers="suppliers"
          @refresh="purchases.orders.loadOrders"
          @create="() => $router.push('/purchases/orders/new')"
          @view="(id) => $router.push(`/purchases/orders/${id}`)"
          @edit="(id) => $router.push(`/purchases/orders/${id}/edit`)"
          @approve="handleApproveOrder"
          @duplicate="handleDuplicateOrder"
          @createDoc="handleCreateDocFromOrder"
          @filter="purchases.orders.applyFilters"
          @page="purchases.orders.changePage"
        />
      </div>

      <!-- Documentos de Compra -->
      <div v-else-if="activeTab === 'documents'">
        <DocumentsList
          :docs="purchases.docs.docs.value"
          :loading="purchases.docs.loading.value"
          :filters="purchases.docs.filters"
          :pagination="purchases.docs.pagination"
          :suppliers="suppliers"
          @refresh="purchases.docs.loadDocs"
          @create="() => $router.push('/purchases/documents/new')"
          @view="(id) => $router.push(`/purchases/documents/${id}`)"
          @edit="(id) => $router.push(`/purchases/documents/${id}/edit`)"
          @markReceived="purchases.docs.markAsReceived"
          @createReception="handleCreateReceptionFromDoc"
          @filter="purchases.docs.applyFilters"
          @page="purchases.docs.changePage"
        />
      </div>

      <!-- Recepciones -->
      <div v-else-if="activeTab === 'receptions'">
        <ReceptionsList
          :receptions="purchases.receptions.receptions.value"
          :loading="purchases.receptions.loading.value"
          :filters="purchases.receptions.filters"
          :pagination="purchases.receptions.pagination"
          :suppliers="suppliers"
          :warehouses="warehouses"
          @refresh="purchases.receptions.loadReceptions"
          @create="() => $router.push('/purchases/receptions/new')"
          @view="(id) => $router.push(`/purchases/receptions/${id}`)"
          @edit="(id) => $router.push(`/purchases/receptions/${id}/edit`)"
          @approve="purchases.receptions.approveReception"
          @reject="handleRejectReception"
          @filter="purchases.receptions.applyFilters"
          @page="purchases.receptions.changePage"
        />
      </div>

      <!-- Analíticas -->
      <div v-else-if="activeTab === 'analytics'">
        <AnalyticsView
          :analytics="analytics"
          :loading="analyticsLoading"
          @refresh="loadAnalytics"
          @export="handleExportReport"
        />
      </div>
    </div>
  </div>

  <!-- Modal de confirmación -->
  <ConfirmModal
    v-if="showConfirmModal"
    :title="confirmModal.title"
    :message="confirmModal.message"
    :loading="confirmModal.loading"
    @confirm="confirmModal.onConfirm"
    @cancel="showConfirmModal = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import {
  RefreshCw,
  Plus,
  ShoppingCart,
  FileText,
  Package,
  TrendingUp
} from 'lucide-vue-next'

import { usePurchases } from '../composables'
import { useToast } from '@/composables/useToast'

import OrdersList from '../components/orders/OrdersList.vue'
import DocumentsList from '../components/documents/DocumentsList.vue'
import ReceptionsList from '../components/receipts/ReceptionsList.vue'
import AnalyticsView from '../components/analytics/AnalyticsView.vue'
import ConfirmModal from '../components/common/ConfirmModal.vue'

// Composables
const router = useRouter()
const toast = useToast()
const purchases = usePurchases()

// Emit for the component 
const emit = defineEmits<{
  refresh: []
}>()

// State
const activeTab = ref('orders' as 'orders' | 'documents' | 'receptions' | 'analytics')
const suppliers = ref<Array<{ id: string; name: string }>>([])
const warehouses = ref<Array<{ id: string; name: string }>>([])
const analytics = ref<any>(null)
const analyticsLoading = ref(false)

// Modal state
const showConfirmModal = ref(false)
const confirmModal = reactive({
  title: '',
  message: '',
  loading: false,
  onConfirm: () => {}
})

// Computed
const isLoading = computed(() => purchases.orders.loading.value || purchases.docs.loading.value || purchases.receptions.loading.value)

const tabs = computed(() => [
  {
    key: 'orders',
    label: 'Órdenes de Compra',
    icon: ShoppingCart,
    badge: purchases.orders.orders.value.filter(o => o.status === 'PENDING').length,
  },
  {
    key: 'documents',
    label: 'Facturas/Documentos',
    icon: FileText,
    badge: purchases.docs.docs.value.filter(d => d.status === 'PENDING').length,
  },
  {
    key: 'receptions',
    label: 'Recepciones',
    icon: Package,
    badge: purchases.receptions.receptions.value.filter(r => r.status === 'PARTIAL').length,
  },
  {
    key: 'analytics',
    label: 'Análisis',
    icon: TrendingUp,
    badge: 0,
  },
])

// Methods
const refreshCurrentTab = async () => {
  try {
    switch (activeTab.value as string) {
      case 'orders':
        await purchases.orders.loadOrders()
        break
      case 'documents':
        await purchases.docs.loadDocs()
        break
      case 'receptions':
        await purchases.receptions.loadReceptions()
        break
      case 'analytics':
        await loadAnalytics()
        break
    }
    toast.success('Datos actualizados correctamente')
  } catch (error) {
    toast.error('Error al actualizar los datos')
  }
}

const createNew = () => {
  switch (activeTab.value as string) {
    case 'orders':
      router.push('/purchases/orders/new')
      break
    case 'documents':
      router.push('/purchases/documents/new')
      break
    case 'receptions':
      router.push('/purchases/receptions/new')
      break
  }
}

const getCreateButtonText = () => {
  switch (activeTab.value as string) {
    case 'orders':
      return 'Nueva Orden'
    case 'documents':
      return 'Nuevo Documento'
    case 'receptions':
      return 'Nueva Recepción'
    default:
      return 'Crear'
  }
}

// Handlers para órdenes
const handleApproveOrder = async (id: string) => {
  confirmModal.title = 'Aprobar Orden'
  confirmModal.message = '¿Está seguro que desea aprobar esta orden de compra?'
  confirmModal.loading = false
  confirmModal.onConfirm = async () => {
    try {
      confirmModal.loading = true
      await purchases.orders.approveOrder(id, 'Aprobada desde el sistema')
      toast.success('Orden aprobada correctamente')
      showConfirmModal.value = false
    } catch (error) {
      toast.error('Error al aprobar la orden')
    } finally {
      confirmModal.loading = false
    }
  }
  showConfirmModal.value = true
}

const handleDuplicateOrder = async (id: string) => {
  try {
    // TODO: Implementar duplicación
    toast.info('Funcionalidad de duplicación próximamente')
  } catch (error) {
    toast.error('Error al duplicar la orden')
  }
}

const handleCreateDocFromOrder = async (orderId: string) => {
  try {
    // TODO: Implement document creation from order
    toast.info('Redirigiendo para crear documento desde orden...')
    router.push(`/purchases/documents/new?from_order=${orderId}`)
  } catch (error) {
    toast.error('Error al crear documento desde la orden')
  }
}

// Handlers para recepciones
const handleCreateReceptionFromDoc = async (docId: string) => {
  try {
    // Obtener almacenes disponibles
    if (warehouses.value.length === 0) {
      await loadWarehouses()
    }
    
    if (warehouses.value.length === 0) {
      toast.error('No hay almacenes disponibles')
      return
    }
    
    // Usar el primer almacén por defecto (en un caso real, se debería mostrar selector)
    const defaultWarehouse = warehouses.value[0]
    // TODO: Implement reception creation from document
    toast.info('Redirigiendo para crear recepción desde documento...')
    router.push(`/purchases/receptions/new?from_doc=${docId}`)
  } catch (error) {
    toast.error('Error al crear recepción desde el documento')
  }
}

const handleRejectReception = async (id: string) => {
  confirmModal.title = 'Rechazar Recepción'
  confirmModal.message = '¿Está seguro que desea rechazar esta recepción? Especifique el motivo.'
  confirmModal.loading = false
  confirmModal.onConfirm = async () => {
    try {
      confirmModal.loading = true
      await purchases.receptions.rejectReception(id, 'Rechazada desde el sistema')
      toast.success('Recepción rechazada correctamente')
      showConfirmModal.value = false
    } catch (error) {
      toast.error('Error al rechazar la recepción')
    } finally {
      confirmModal.loading = false
    }
  }
  showConfirmModal.value = true
}

// Analíticas
const loadAnalytics = async () => {
  analyticsLoading.value = true
  try {
    const dateFrom = new Date()
    dateFrom.setMonth(dateFrom.getMonth() - 3) // Últimos 3 meses
    const dateTo = new Date()
    
    // TODO: Implement analytics loading
    analytics.value = {
      totals: { orders: 0, documents: 0, receptions: 0, amount: 0 },
      topSuppliers: [],
      averageTimes: { orderToDoc: 0, docToReception: 0, fullProcess: 0 },
      rates: { orderApproval: 0, completeReception: 0, onTimeDelivery: 0 },
      pending: { orders: 0, partialReceptions: 0, overdueDeliveries: 0 }
    }
  } catch (error) {
    toast.error('Error cargando analíticas')
  } finally {
    analyticsLoading.value = false
  }
}

const handleExportReport = async (type: string, format: string) => {
  try {
    toast.info('Generando reporte...')
    // TODO: Implementar exportación
    toast.success('Reporte generado correctamente')
  } catch (error) {
    toast.error('Error generando reporte')
  }
}

// Utilidades
const loadSuppliers = async () => {
  try {
    const results = await purchases.searchSuppliers('*') // Use * to get all suppliers
    suppliers.value = (results as any[]).map((supplier: any) => ({
      id: supplier.id,
      name: supplier.fullname
    }))
  } catch (error) {
    console.error('Error loading suppliers:', error)
  }
}

const loadWarehouses = async () => {
  try {
    warehouses.value = await purchases.getWarehouses()
  } catch (error) {
    console.error('Error loading warehouses:', error)
  }
}

// Lifecycle
onMounted(async () => {
  // Cargar datos iniciales
  await Promise.all([
    loadSuppliers(),
    loadWarehouses(),
    purchases.orders.loadOrders(),
  ])
})
</script>