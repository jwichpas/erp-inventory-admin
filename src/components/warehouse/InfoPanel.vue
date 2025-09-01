<template>
  <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
    <div class="p-4">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center">
          <component
            :is="headerIcon"
            class="w-5 h-5 mr-2"
            :class="headerIconColor"
          />
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            {{ headerTitle }}
          </h3>
        </div>
        <button
          @click="$emit('close')"
          class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <XMarkIcon class="w-5 h-5" />
        </button>
      </div>

      <!-- Zone Info -->
      <div v-if="type === 'zone'" class="space-y-3">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Código</p>
            <p class="text-sm text-gray-900 dark:text-white">{{ zoneItem.code }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</p>
            <p class="text-sm text-gray-900 dark:text-white">{{ zoneItem.shape_type }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Dimensiones</p>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ zoneItem.width }}m × {{ zoneItem.length }}m × {{ zoneItem.height }}m
            </p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Capacidad</p>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ formatNumber(zoneItem.capacity_kg) }} kg
            </p>
          </div>
        </div>

        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Stock Actual</p>
          <div class="flex items-center">
            <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                class="h-2 rounded-full transition-all duration-300"
                :class="stockLevelClasses"
                :style="{ width: `${Math.min(zoneItem.utilizationPercentage, 100)}%` }"
              ></div>
            </div>
            <span class="ml-2 text-sm text-gray-600 dark:text-gray-300">
              {{ formatNumber(zoneItem.currentStock) }} / {{ formatNumber(zoneItem.maxCapacity) }}
            </span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ zoneItem.utilizationPercentage.toFixed(1) }}% de utilización
          </p>
        </div>

        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Estado de Stock</p>
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            :class="getStockLevelBadgeClasses(zoneItem.stockLevel)"
          >
            <span
              class="w-2 h-2 rounded-full mr-1"
              :class="getStockLevelDotClasses(zoneItem.stockLevel)"
            ></span>
            {{ getStockLevelText(zoneItem.stockLevel) }}
          </span>
        </div>

        <div v-if="zoneItem.coordinates">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Ubicación</p>
          <p class="text-sm text-gray-900 dark:text-white">
            X: {{ zoneItem.x_coordinate }}, Y: {{ zoneItem.y_coordinate }}
          </p>
        </div>
      </div>

      <!-- Location Info -->
      <div v-else-if="type === 'location'" class="space-y-3">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Código</p>
            <p class="text-sm text-gray-900 dark:text-white">{{ locationItem.code }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Estado</p>
            <span
              v-if="locationItem.is_active"
              class="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900 rounded-full"
            >
              Activa
            </span>
            <span
              v-else
              class="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900 rounded-full"
            >
              Inactiva
            </span>
          </div>
        </div>

        <div v-if="locationItem.max_capacity_kg">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Capacidad</p>
          <div class="flex items-center">
            <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                class="h-2 rounded-full transition-all duration-300"
                :class="stockLevelClasses"
                :style="{ width: `${Math.min(locationItem.utilizationPercentage, 100)}%` }"
              ></div>
            </div>
            <span class="ml-2 text-sm text-gray-600 dark:text-gray-300">
              {{ locationItem.utilizationPercentage.toFixed(1) }}%
            </span>
          </div>
        </div>

        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Productos ({{ locationItem.products.length }})
          </p>
          <div class="space-y-2 max-h-40 overflow-y-auto">
            <div
              v-for="product in locationItem.products"
              :key="product.id"
              class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {{ (product as any).product?.name || 'Producto sin nombre' }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  SKU: {{ (product as any).product?.sku }}
                </p>
              </div>
              <div class="flex items-center">
                <span class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ formatNumber(product.current_qty) }}
                </span>
                <span
                  class="ml-1 w-2 h-2 rounded-full"
                  :style="{ backgroundColor: getProductStockColor(product) }"
                ></span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="locationItem.coordinates">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Coordenadas 3D</p>
          <p class="text-sm text-gray-900 dark:text-white">
            X: {{ locationItem.coordinates.x }}, 
            Y: {{ locationItem.coordinates.y }}, 
            Z: {{ locationItem.coordinates.z }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  XMark as XMarkIcon,
  MapPin as MapPinIcon,
  BuildingOffice as BuildingOfficeIcon,
} from 'lucide-vue-next'
import type { WarehouseZone3D, StorageLocation3D } from '@/composables/useWarehouse3D'
import type { WarehouseStockLocation } from '@/types/database'

interface Props {
  item: WarehouseZone3D | StorageLocation3D
  type: 'zone' | 'location'
}

const props = defineProps<Props>()

interface Emits {
  close: []
}

defineEmits<Emits>()

// Computed properties
const headerIcon = computed(() => 
  props.type === 'zone' ? BuildingOfficeIcon : MapPinIcon
)

const headerTitle = computed(() => {
  if (props.type === 'zone') {
    const zone = props.item as WarehouseZone3D
    return zone.name || zone.code
  } else {
    const location = props.item as StorageLocation3D
    return location.name || location.code
  }
})

const headerIconColor = computed(() => {
  const level = props.item.stockLevel
  const colors = {
    EMPTY: 'text-gray-500 dark:text-gray-400',
    LOW: 'text-red-500 dark:text-red-400',
    NORMAL: 'text-emerald-500 dark:text-emerald-400',
    HIGH: 'text-amber-500 dark:text-amber-400',
  }
  return colors[level]
})

const zoneItem = computed(() => props.item as WarehouseZone3D)
const locationItem = computed(() => props.item as StorageLocation3D)

const stockLevelClasses = computed(() => {
  const level = props.item.stockLevel
  const classes = {
    EMPTY: 'bg-gray-300 dark:bg-gray-600',
    LOW: 'bg-red-500 dark:bg-red-600',
    NORMAL: 'bg-emerald-500 dark:bg-emerald-600',
    HIGH: 'bg-amber-500 dark:bg-amber-600',
  }
  return classes[level]
})

// Helper functions
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('es-PE').format(value)
}

const getStockLevelText = (level: string): string => {
  const texts = {
    EMPTY: 'Vacío',
    LOW: 'Stock Bajo',
    NORMAL: 'Stock Normal',
    HIGH: 'Stock Alto',
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

const getStockLevelDotClasses = (level: string): string => {
  const classes = {
    EMPTY: 'bg-gray-400 dark:bg-gray-500',
    LOW: 'bg-red-500 dark:bg-red-400',
    NORMAL: 'bg-emerald-500 dark:bg-emerald-400',
    HIGH: 'bg-amber-500 dark:bg-amber-400',
  }
  return classes[level as keyof typeof classes] || classes.EMPTY
}

const getProductStockColor = (product: WarehouseStockLocation): string => {
  const productData = (product as any).product
  const minStock = productData?.min_stock || 0
  const maxStock = productData?.max_stock || 1000
  
  if (product.current_qty === 0) return '#6B7280' // gray-500
  if (product.current_qty <= minStock) return '#EF4444' // red-500
  if (product.current_qty >= maxStock * 0.9) return '#F59E0B' // amber-500
  return '#10B981' // emerald-500
}
</script>