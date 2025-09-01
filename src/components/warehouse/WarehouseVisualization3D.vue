<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
    <!-- Header Controls -->
    <div class="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Visualización 3D de Almacén
          </h2>

          <!-- Warehouse Selector -->
          <FormField v-model="selectedWarehouseId" type="select" placeholder="Seleccionar almacén"
            :options="warehouseOptions" :disabled="isLoadingWarehouses" class="w-64" />
        </div>

        <div class="flex items-center space-x-2">
          <!-- View Controls -->
          <button @click="resetCamera"
            class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <HomeIcon class="w-4 h-4 mr-2 inline" />
            Vista General
          </button>

          <button @click="toggleWireframe" :class="[
            'px-3 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
            showWireframe
              ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700'
              : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
          ]">
            <CubeIcon class="w-4 h-4 mr-2 inline" />
            Wireframe
          </button>
        </div>
      </div>
    </div>

    <!-- 3D Scene Container -->
    <div class="flex-1 relative overflow-hidden">
      <!-- Loading State -->
      <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-600 dark:text-gray-400">Cargando almacén...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
        <div class="text-center">
          <ExclamationTriangleIcon class="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p class="text-red-600 dark:text-red-400">Error al cargar datos del almacén</p>
          <button @click="retryLoad" class="mt-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Intentar de nuevo
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!selectedWarehouseId"
        class="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
        <div class="text-center">
          <BuildingStorefrontIcon class="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Selecciona un almacén
          </h3>
          <p class="text-gray-500 dark:text-gray-400">
            Elige un almacén del selector para ver su visualización 3D
          </p>
        </div>
      </div>

      <!-- 3D Scene -->
      <div v-else-if="warehouse3DData" class="h-full w-full">
        <TresCanvas ref="canvasRef" :alpha="false" :antialias="true" :shadow-map-enabled="true"
          :shadow-map-type="PCFSoftShadowMap" class="h-full w-full">
          <!-- Scene Setup -->
          <TresPerspectiveCamera ref="cameraRef" :position="cameraPosition" :fov="75" :aspect="1" :near="0.1"
            :far="2000" />

          <!-- Lighting -->
          <TresAmbientLight :intensity="0.4" />
          <TresDirectionalLight :position="[50, 100, 50]" :intensity="0.8" :cast-shadow="true"
            :shadow-map-size="[2048, 2048]" />

          <!-- Controls -->
          <OrbitControls ref="controlsRef" :enable-damping="true" :damping-factor="0.05" :max-polar-angle="Math.PI / 2"
            @change="onCameraChange" />

          <!-- Warehouse Floor -->
          <WarehouseFloor :warehouse="warehouse3DData.warehouse" />

          <!-- Warehouse Zones -->
          <WarehouseZone3D v-for="zone in filteredZones" :key="zone.id" :zone="zone"
            :selected="selectedZoneId === zone.id" :wireframe="showWireframe" @click="selectZone" @hover="hoverZone" />

          <!-- Storage Locations -->
          <StorageLocation3D v-for="location in filteredLocations" :key="location.id" :location="location"
            :selected="selectedLocationId === location.id" :show-details="showLocationDetails" @click="selectLocation"
            @hover="hoverLocation" />
        </TresCanvas>
      </div>

      <!-- Info Panel -->
      <transition enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="transform translate-x-full" enter-to-class="transform translate-x-0"
        leave-active-class="transition-all duration-200 ease-in" leave-from-class="transform translate-x-0"
        leave-to-class="transform translate-x-full">
        <InfoPanel v-if="selectedItem" :item="selectedItem" :type="selectedItemType" @close="clearSelection"
          class="absolute top-4 right-4 w-80" />
      </transition>

      <!-- Stock Legend -->
      <StockLevelLegend class="absolute bottom-4 left-4" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { PCFSoftShadowMap } from 'three'
import { useWarehouse3D } from '@/composables/useWarehouse3D'
import FormField from '@/components/ui/FormField.vue'
import WarehouseFloor from './WarehouseFloor.vue'
import WarehouseZone3D from './WarehouseZone3D.vue'
import StorageLocation3D from './StorageLocation3D.vue'
import InfoPanel from './InfoPanel.vue'
import StockLevelLegend from './StockLevelLegend.vue'
import {
  Home as HomeIcon,
  Cube as CubeIcon,
  ExclamationTriangle as ExclamationTriangleIcon,
  BuildingStorefront as BuildingStorefrontIcon,
} from 'lucide-vue-next'
import type { WarehouseZone3DType, StorageLocation3DType } from '@/composables/useWarehouse3D'

// Props
interface Props {
  initialWarehouseId?: string
  showControls?: boolean
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  showControls: true,
  height: '100%'
})

// Emits
interface Emits {
  'warehouse-selected': [warehouseId: string]
  'zone-selected': [zoneId: string]
  'location-selected': [locationId: string]
}

const emit = defineEmits<Emits>()

// 3D Warehouse composable
const {
  warehouses,
  warehouse3DData,
  selectedWarehouseId,
  processedZones,
  processedLocations,
  isLoading,
  error,
  selectWarehouse,
  getZoneColor,
  getLocationColor,
  refetchZones,
  refetchLocations,
  refetchStock
} = useWarehouse3D({
  warehouseId: props.initialWarehouseId
})

// 3D Scene refs
const canvasRef = ref()
const cameraRef = ref()
const controlsRef = ref()

// 3D Scene state
const cameraPosition = ref([50, 50, 50])
const showWireframe = ref(false)
const showLocationDetails = ref(true)

// Selection state
const selectedZoneId = ref<string | null>(null)
const selectedLocationId = ref<string | null>(null)
const hoveredZoneId = ref<string | null>(null)
const hoveredLocationId = ref<string | null>(null)

// Computed properties
const warehouseOptions = computed(() => [
  { value: '', label: 'Seleccionar almacén' },
  ...(warehouses.value?.map(warehouse => ({
    value: warehouse.id,
    label: `${warehouse.name} (${warehouse.code})`
  })) || [])
])

const isLoadingWarehouses = computed(() => isLoading.value && !warehouses.value)

const filteredZones = computed(() => {
  if (!processedZones.value) return []

  return processedZones.value.filter(zone => {
    // Apply filters here if needed
    return true
  })
})

const filteredLocations = computed(() => {
  if (!processedLocations.value) return []

  return processedLocations.value.filter(location => {
    // Apply filters here if needed
    return true
  })
})

const selectedItem = computed(() => {
  if (selectedZoneId.value) {
    return processedZones.value?.find(z => z.id === selectedZoneId.value) || null
  }
  if (selectedLocationId.value) {
    return processedLocations.value?.find(l => l.id === selectedLocationId.value) || null
  }
  return null
})

const selectedItemType = computed(() => {
  if (selectedZoneId.value) return 'zone'
  if (selectedLocationId.value) return 'location'
  return null
})

// Methods
const resetCamera = async () => {
  if (!controlsRef.value) return

  cameraPosition.value = [50, 50, 50]
  await nextTick()

  if (controlsRef.value.reset) {
    controlsRef.value.reset()
  }
}

const toggleWireframe = () => {
  showWireframe.value = !showWireframe.value
}

const selectZone = (zone: WarehouseZone3DType) => {
  selectedZoneId.value = zone.id
  selectedLocationId.value = null
  emit('zone-selected', zone.id)
}

const selectLocation = (location: StorageLocation3DType) => {
  selectedLocationId.value = location.id
  selectedZoneId.value = null
  emit('location-selected', location.id)
}

const hoverZone = (zone: WarehouseZone3DType | null) => {
  hoveredZoneId.value = zone?.id || null
}

const hoverLocation = (location: StorageLocation3DType | null) => {
  hoveredLocationId.value = location?.id || null
}

const clearSelection = () => {
  selectedZoneId.value = null
  selectedLocationId.value = null
}

const onCameraChange = () => {
  // Handle camera changes if needed
}

const retryLoad = () => {
  refetchZones()
  refetchLocations()
  refetchStock()
}

// Watch for warehouse selection changes
watch(selectedWarehouseId, (newId) => {
  if (newId) {
    emit('warehouse-selected', newId)
    clearSelection()
    resetCamera()
  }
})

// Initialize
onMounted(() => {
  if (props.initialWarehouseId && warehouses.value) {
    selectWarehouse(props.initialWarehouseId)
  }
})
</script>