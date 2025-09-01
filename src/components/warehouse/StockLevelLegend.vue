<template>
  <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
    <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">
      Niveles de Stock
    </h4>
    
    <div class="space-y-2">
      <div
        v-for="level in stockLevels"
        :key="level.key"
        class="flex items-center"
      >
        <div
          class="w-4 h-4 rounded mr-3 border border-gray-300 dark:border-gray-600"
          :style="{ backgroundColor: level.color }"
        ></div>
        <div class="flex-1">
          <p class="text-sm text-gray-900 dark:text-white">
            {{ level.label }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ level.description }}
          </p>
        </div>
        <div class="flex items-center">
          <span class="text-xs text-gray-600 dark:text-gray-300">
            {{ level.count }}
          </span>
          <component
            :is="level.icon"
            class="w-3 h-3 ml-1"
            :class="level.iconClass"
          />
        </div>
      </div>
    </div>
    
    <!-- Statistics Summary -->
    <div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
      <div class="grid grid-cols-2 gap-4 text-center">
        <div>
          <p class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ totalZones }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Zonas Total
          </p>
        </div>
        <div>
          <p class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ utilizationPercentage }}%
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Utilización
          </p>
        </div>
      </div>
    </div>
    
    <!-- Toggle Button -->
    <div class="mt-3 flex justify-center">
      <button
        @click="toggleExpanded"
        class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
      >
        {{ isExpanded ? 'Contraer' : 'Expandir' }}
        <ChevronUpIcon v-if="isExpanded" class="w-3 h-3 ml-1 inline" />
        <ChevronDownIcon v-else class="w-3 h-3 ml-1 inline" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { useWarehouse3D } from '@/composables/useWarehouse3D'
import {
  Circle as CircleIcon,
  AlertTriangle as AlertTriangleIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  ChevronUp as ChevronUpIcon,
  ChevronDown as ChevronDownIcon,
} from 'lucide-vue-next'

// Get dark mode state
const isDark = inject('isDark', false)

// Get warehouse data from parent or use default composable
const { warehouse3DData, processedZones } = useWarehouse3D()

// Component state
const isExpanded = ref(true)

// Computed properties
const stockLevels = computed(() => {
  const zones = processedZones.value || []
  const emptyCont = zones.filter(z => z.stockLevel === 'EMPTY').length
  const lowCount = zones.filter(z => z.stockLevel === 'LOW').length
  const normalCount = zones.filter(z => z.stockLevel === 'NORMAL').length
  const highCount = zones.filter(z => z.stockLevel === 'HIGH').length
  
  return [
    {
      key: 'empty',
      label: 'Vacío',
      description: 'Sin stock',
      color: isDark ? '#374151' : '#F3F4F6', // gray-700 / gray-100
      count: emptyCont,
      icon: XCircleIcon,
      iconClass: 'text-gray-500 dark:text-gray-400'
    },
    {
      key: 'low',
      label: 'Stock Bajo',
      description: 'Bajo mínimo',
      color: isDark ? '#DC2626' : '#FEE2E2', // red-600 / red-100
      count: lowCount,
      icon: AlertTriangleIcon,
      iconClass: 'text-red-500 dark:text-red-400'
    },
    {
      key: 'normal',
      label: 'Stock Normal',
      description: 'Nivel óptimo',
      color: isDark ? '#059669' : '#D1FAE5', // emerald-600 / emerald-100
      count: normalCount,
      icon: CheckCircleIcon,
      iconClass: 'text-emerald-500 dark:text-emerald-400'
    },
    {
      key: 'high',
      label: 'Stock Alto',
      description: 'Cerca del máximo',
      color: isDark ? '#D97706' : '#FEF3C7', // amber-600 / amber-100
      count: highCount,
      icon: CircleIcon,
      iconClass: 'text-amber-500 dark:text-amber-400'
    }
  ]
})

const totalZones = computed(() => 
  processedZones.value?.length || 0
)

const utilizationPercentage = computed(() => {
  if (!warehouse3DData.value) return 0
  return Math.round(warehouse3DData.value.utilizationPercentage)
})

// Methods
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}
</script>