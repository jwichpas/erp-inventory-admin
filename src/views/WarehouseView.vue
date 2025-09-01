<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="flex-shrink-0 p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Almacenes</h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            Visualización 3D y gestión de almacenes, zonas y ubicaciones de stock
          </p>
        </div>

        <!-- View Toggle -->
        <div class="flex items-center space-x-2">
          <div class="flex rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-1">
            <button
              @click="viewMode = '3d'"
              :class="[
                'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                viewMode === '3d'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              ]"
            >
              <CubeIcon class="w-4 h-4 mr-2 inline" />
              Vista 3D
            </button>
            <button
              @click="viewMode = 'list'"
              :class="[
                'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              ]"
            >
              <ListBulletIcon class="w-4 h-4 mr-2 inline" />
              Lista
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden">
      <!-- 3D Visualization Mode -->
      <div v-if="viewMode === '3d'" class="h-full">
        <WarehouseVisualization3D
          :initial-warehouse-id="selectedWarehouseId"
          @warehouse-selected="onWarehouseSelected"
          @zone-selected="onZoneSelected"
          @location-selected="onLocationSelected"
        />
      </div>

      <!-- List Mode -->
      <div v-else class="h-full p-6 overflow-auto">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          <!-- Warehouses List -->
          <div class="lg:col-span-1">
            <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-full">
              <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-lg font-medium text-gray-900 dark:text-white">Almacenes</h2>
              </div>
              
              <div class="p-4 space-y-2 overflow-y-auto" style="max-height: calc(100% - 60px)">
                <div
                  v-for="warehouse in warehouses"
                  :key="warehouse.id"
                  @click="selectWarehouse(warehouse.id)"
                  :class="[
                    'p-3 rounded-lg border cursor-pointer transition-all',
                    selectedWarehouseId === warehouse.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  ]"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="font-medium text-gray-900 dark:text-white">
                        {{ warehouse.name }}
                      </h3>
                      <p class="text-sm text-gray-500 dark:text-gray-400">
                        {{ warehouse.code }}
                      </p>
                      <p class="text-xs text-gray-400 dark:text-gray-500">
                        {{ warehouse.width }}m × {{ warehouse.length }}m
                      </p>
                    </div>
                    
                    <div class="flex items-center">
                      <span
                        :class="[
                          'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full',
                          warehouse.is_active
                            ? 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900'
                            : 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900'
                        ]"
                      >
                        {{ warehouse.is_active ? 'Activo' : 'Inactivo' }}
                      </span>
                    </div>
                  </div>
                </div>

                <div v-if="!warehouses || warehouses.length === 0" class="text-center py-8">
                  <BuildingStorefrontIcon class="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p class="text-gray-500 dark:text-gray-400">No hay almacenes disponibles</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Zones and Locations -->
          <div class="lg:col-span-2">
            <div class="grid grid-rows-2 gap-4 h-full">
              <!-- Zones -->
              <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 class="text-lg font-medium text-gray-900 dark:text-white">
                    Zonas de Almacén
                  </h2>
                  <p v-if="selectedWarehouse" class="text-sm text-gray-500 dark:text-gray-400">
                    {{ selectedWarehouse.name }}
                  </p>
                </div>

                <div class="p-4 overflow-y-auto" style="max-height: calc(100% - 60px)">
                  <div v-if="processedZones && processedZones.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div
                      v-for="zone in processedZones"
                      :key="zone.id"
                      @click="selectZone(zone.id)"
                      :class="[
                        'p-3 rounded-lg border cursor-pointer transition-all',
                        selectedZoneId === zone.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      ]"
                    >
                      <div class="flex items-center justify-between mb-2">
                        <h3 class="font-medium text-gray-900 dark:text-white">
                          {{ zone.name || zone.code }}
                        </h3>
                        <span
                          class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full"
                          :class="getStockLevelBadgeClasses(zone.stockLevel)"
                        >
                          {{ getStockLevelText(zone.stockLevel) }}
                        </span>
                      </div>
                      
                      <div class="space-y-1">
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          {{ zone.width }}m × {{ zone.length }}m × {{ zone.height }}m
                        </p>
                        <div class="flex items-center">
                          <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              class="h-1.5 rounded-full transition-all"
                              :class="getStockLevelProgressClasses(zone.stockLevel)"
                              :style="{ width: `${Math.min(zone.utilizationPercentage, 100)}%` }"
                            ></div>
                          </div>
                          <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            {{ zone.utilizationPercentage.toFixed(1) }}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-else-if="!selectedWarehouseId" class="text-center py-8">
                    <MapIcon class="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p class="text-gray-500 dark:text-gray-400">Selecciona un almacén para ver sus zonas</p>
                  </div>

                  <div v-else class="text-center py-8">
                    <MapIcon class="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p class="text-gray-500 dark:text-gray-400">Este almacén no tiene zonas configuradas</p>
                  </div>
                </div>
              </div>

              <!-- Storage Locations -->
              <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 class="text-lg font-medium text-gray-900 dark:text-white">
                    Ubicaciones de Almacenamiento
                  </h2>
                  <p v-if="selectedZone" class="text-sm text-gray-500 dark:text-gray-400">
                    Zona: {{ selectedZone.name || selectedZone.code }}
                  </p>
                </div>

                <div class="p-4 overflow-y-auto" style="max-height: calc(100% - 60px)">
                  <div v-if="filteredLocations && filteredLocations.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div
                      v-for="location in filteredLocations"
                      :key="location.id"
                      :class="[
                        'p-3 rounded-lg border transition-all',
                        selectedLocationId === location.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      ]"
                    >
                      <div class="flex items-center justify-between mb-2">
                        <h4 class="font-medium text-gray-900 dark:text-white">
                          {{ location.name || location.code }}
                        </h4>
                        <span
                          class="w-3 h-3 rounded-full"
                          :style="{ backgroundColor: getLocationStockColor(location.stockLevel) }"
                        ></span>
                      </div>
                      
                      <div class="space-y-1">
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          {{ location.products.length }} producto{{ location.products.length !== 1 ? 's' : '' }}
                        </p>
                        <div v-if="location.max_capacity_kg" class="flex items-center">
                          <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                            <div
                              class="h-1 rounded-full bg-blue-500"
                              :style="{ width: `${Math.min(location.utilizationPercentage, 100)}%` }"
                            ></div>
                          </div>
                          <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            {{ location.utilizationPercentage.toFixed(1) }}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-else-if="!selectedWarehouseId" class="text-center py-8">
                    <MapPinIcon class="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p class="text-gray-500 dark:text-gray-400">Selecciona un almacén para ver las ubicaciones</p>
                  </div>

                  <div v-else class="text-center py-8">
                    <MapPinIcon class="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p class="text-gray-500 dark:text-gray-400">No hay ubicaciones de almacenamiento</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWarehouse3D } from '@/composables/useWarehouse3D'
import WarehouseVisualization3D from '@/components/warehouse/WarehouseVisualization3D.vue'
import {
  Cube as CubeIcon,
  ListBullet as ListBulletIcon,
  BuildingStorefront as BuildingStorefrontIcon,
  Map as MapIcon,
  MapPin as MapPinIcon,
} from 'lucide-vue-next'

// Component state
const viewMode = ref<'3d' | 'list'>('3d')
const selectedZoneId = ref<string | null>(null)
const selectedLocationId = ref<string | null>(null)

// Warehouse 3D composable
const {
  warehouses,
  selectedWarehouseId,
  processedZones,
  processedLocations,
  selectWarehouse
} = useWarehouse3D()

// Computed properties
const selectedWarehouse = computed(() => 
  warehouses.value?.find(w => w.id === selectedWarehouseId.value) || null
)

const selectedZone = computed(() => 
  processedZones.value?.find(z => z.id === selectedZoneId.value) || null
)

const filteredLocations = computed(() => {
  if (!processedLocations.value) return []
  
  if (selectedZoneId.value) {
    return processedLocations.value.filter(l => l.zone_id === selectedZoneId.value)
  }
  
  return processedLocations.value
})

// Methods
const onWarehouseSelected = (warehouseId: string) => {
  selectedZoneId.value = null
  selectedLocationId.value = null
}

const onZoneSelected = (zoneId: string) => {
  selectedZoneId.value = zoneId
  selectedLocationId.value = null
}

const onLocationSelected = (locationId: string) => {
  selectedLocationId.value = locationId
}

const selectZone = (zoneId: string) => {
  selectedZoneId.value = selectedZoneId.value === zoneId ? null : zoneId
  selectedLocationId.value = null
}

const getStockLevelText = (level: string): string => {
  const texts = {
    EMPTY: 'Vacío',
    LOW: 'Bajo',
    NORMAL: 'Normal',
    HIGH: 'Alto',
  }
  return texts[level as keyof typeof texts] || 'Desconocido'
}

const getStockLevelBadgeClasses = (level: string): string => {
  const classes = {
    EMPTY: 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700',
    LOW: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900',
    NORMAL: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900',
    HIGH: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900',
  }
  return classes[level as keyof typeof classes] || classes.EMPTY
}

const getStockLevelProgressClasses = (level: string): string => {
  const classes = {
    EMPTY: 'bg-gray-400 dark:bg-gray-600',
    LOW: 'bg-red-500 dark:bg-red-600',
    NORMAL: 'bg-emerald-500 dark:bg-emerald-600',
    HIGH: 'bg-amber-500 dark:bg-amber-600',
  }
  return classes[level as keyof typeof classes] || classes.EMPTY
}

const getLocationStockColor = (level: string): string => {
  const colors = {
    EMPTY: '#6B7280', // gray-500
    LOW: '#EF4444', // red-500
    NORMAL: '#10B981', // emerald-500
    HIGH: '#F59E0B', // amber-500
  }
  return colors[level as keyof typeof colors] || colors.EMPTY
}
</script>