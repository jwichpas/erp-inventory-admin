<template>
  <TresGroup>
    <!-- Storage Location Marker -->
    <TresMesh
      :position="[
        location.coordinates?.x || 0,
        1,
        location.coordinates?.z || 0
      ]"
      :cast-shadow="true"
      @click="handleClick"
      @pointer-over="handlePointerOver"
      @pointer-out="handlePointerOut"
    >
      <TresCylinderGeometry :args="[0.8, 0.8, 2, 8]" />
      <TresMeshLambertMaterial
        :color="locationColor"
        :transparent="true"
        :opacity="locationOpacity"
        :emissive="isHovered ? hoverEmissive : 0x000000"
      />
    </TresMesh>

    <!-- Location Code Label -->
    <TresMesh
      v-if="showDetails"
      :position="[
        location.coordinates?.x || 0,
        2.5,
        location.coordinates?.z || 0
      ]"
    >
      <TresPlaneGeometry :args="[labelWidth, 0.8]" />
      <TresMeshBasicMaterial
        :color="labelBackgroundColor"
        :transparent="true"
        :opacity="0.9"
      />
    </TresMesh>

    <!-- Stock Level Indicators -->
    <TresGroup v-if="location.products.length > 0 && showDetails">
      <TresMesh
        v-for="(product, index) in displayProducts"
        :key="product.id"
        :position="[
          (location.coordinates?.x || 0) + getProductOffset(index).x,
          0.2 + index * 0.3,
          (location.coordinates?.z || 0) + getProductOffset(index).z
        ]"
      >
        <TresBoxGeometry :args="[0.4, 0.2, 0.4]" />
        <TresMeshBasicMaterial 
          :color="getProductStockColor(product)"
          :transparent="true"
          :opacity="0.8"
        />
      </TresMesh>
    </TresGroup>

    <!-- Utilization Ring -->
    <TresMesh
      v-if="showUtilization && location.utilizationPercentage > 0"
      :position="[
        location.coordinates?.x || 0,
        0.1,
        location.coordinates?.z || 0
      ]"
    >
      <TresRingGeometry 
        :args="[1.2, 1.4, 16, 1, 0, (location.utilizationPercentage / 100) * Math.PI * 2]" 
      />
      <TresMeshBasicMaterial 
        :color="utilizationRingColor"
        :transparent="true"
        :opacity="0.7"
      />
    </TresMesh>

    <!-- Selection Indicator -->
    <TresMesh
      v-if="selected || isHovered"
      :position="[
        location.coordinates?.x || 0,
        0.05,
        location.coordinates?.z || 0
      ]"
    >
      <TresRingGeometry :args="[0.9, 1.1, 16]" />
      <TresMeshBasicMaterial
        :color="selected ? selectedRingColor : hoverRingColor"
        :transparent="true"
        :opacity="0.8"
      />
    </TresMesh>

    <!-- Capacity Overflow Indicator -->
    <TresMesh
      v-if="location.utilizationPercentage > 100"
      :position="[
        location.coordinates?.x || 0,
        3,
        location.coordinates?.z || 0
      ]"
    >
      <TresSphereGeometry :args="[0.3, 8, 6]" />
      <TresMeshBasicMaterial 
        :color="overflowColor"
        :emissive="overflowColor"
        :emissive-intensity="0.5"
      />
    </TresMesh>
  </TresGroup>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import {
  TresGroup,
  TresMesh,
  TresCylinderGeometry,
  TresBoxGeometry,
  TresSphereGeometry,
  TresRingGeometry,
  TresPlaneGeometry,
  TresMeshLambertMaterial,
  TresMeshBasicMaterial
} from '@tresjs/core'
import type { StorageLocation3D } from '@/composables/useWarehouse3D'
import type { WarehouseStockLocation } from '@/types/database'

interface Props {
  location: StorageLocation3D
  selected?: boolean
  showDetails?: boolean
  showUtilization?: boolean
  maxDisplayProducts?: number
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  showDetails: true,
  showUtilization: true,
  maxDisplayProducts: 5
})

interface Emits {
  click: [location: StorageLocation3D]
  hover: [location: StorageLocation3D | null]
}

const emit = defineEmits<Emits>()

// Get dark mode state
const isDark = inject('isDark', false)

// Hover state
const isHovered = ref(false)

// Computed properties
const locationColor = computed(() => {
  const stockColors = {
    EMPTY: isDark ? '#4B5563' : '#9CA3AF',      // gray-600 / gray-400
    LOW: isDark ? '#DC2626' : '#EF4444',        // red-600 / red-500
    NORMAL: isDark ? '#059669' : '#10B981',     // emerald-600 / emerald-500
    HIGH: isDark ? '#D97706' : '#F59E0B',       // amber-600 / amber-500
  }
  return stockColors[props.location.stockLevel]
})

const locationOpacity = computed(() => 
  props.selected ? 0.9 : 0.7
)

const hoverEmissive = computed(() => 
  isDark ? 0x222222 : 0x333333
)

const selectedRingColor = computed(() => 
  isDark ? '#3B82F6' : '#2563EB' // blue-500 / blue-600
)

const hoverRingColor = computed(() => 
  isDark ? '#60A5FA' : '#93C5FD' // blue-400 / blue-300
)

const utilizationRingColor = computed(() => {
  const percentage = props.location.utilizationPercentage
  if (percentage < 50) return isDark ? '#10B981' : '#34D399'      // green
  if (percentage < 85) return isDark ? '#F59E0B' : '#FBBF24'      // yellow
  return isDark ? '#EF4444' : '#F87171'                           // red
})

const overflowColor = computed(() => 
  isDark ? '#DC2626' : '#EF4444' // red-600 / red-500
)

const labelBackgroundColor = computed(() => 
  isDark ? '#1F2937' : '#FFFFFF' // gray-800 / white
)

const labelWidth = computed(() => {
  const codeLength = props.location.code?.length || 3
  return Math.max(codeLength * 0.3, 2)
})

const displayProducts = computed(() => 
  props.location.products.slice(0, props.maxDisplayProducts)
)

// Methods
const getProductOffset = (index: number) => {
  const angle = (index / props.maxDisplayProducts) * Math.PI * 2
  const radius = 0.6
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius
  }
}

const getProductStockColor = (product: WarehouseStockLocation) => {
  const productData = (product as any).product
  const minStock = productData?.min_stock || 0
  const maxStock = productData?.max_stock || 1000
  
  if (product.current_qty === 0) {
    return isDark ? '#374151' : '#F3F4F6' // gray-700 / gray-100
  }
  if (product.current_qty <= minStock) {
    return isDark ? '#DC2626' : '#FEE2E2' // red-600 / red-100
  }
  if (product.current_qty >= maxStock * 0.9) {
    return isDark ? '#D97706' : '#FEF3C7' // amber-600 / amber-100
  }
  return isDark ? '#059669' : '#D1FAE5' // emerald-600 / emerald-100
}

// Event handlers
const handleClick = (event: Event) => {
  event.stopPropagation()
  emit('click', props.location)
}

const handlePointerOver = () => {
  isHovered.value = true
  emit('hover', props.location)
}

const handlePointerOut = () => {
  isHovered.value = false
  emit('hover', null)
}
</script>