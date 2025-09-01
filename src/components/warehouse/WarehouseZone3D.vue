<template>
  <TresGroup>
    <!-- Zone Base -->
    <TresMesh
      :position="[zone.x_coordinate || 0, 0.25, zone.y_coordinate || 0]"
      :cast-shadow="true"
      :receive-shadow="true"
      @click="handleClick"
      @pointer-over="handlePointerOver"
      @pointer-out="handlePointerOut"
    >
      <!-- Geometry based on shape type -->
      <TresBoxGeometry 
        v-if="zone.shape_type === 'RECTANGLE' || zone.shape_type === 'SQUARE'"
        :args="[zone.width || 10, 0.5, zone.length || 10]"
      />
      <TresCylinderGeometry 
        v-else-if="zone.shape_type === 'CIRCLE'"
        :args="[zone.width / 2 || 5, zone.width / 2 || 5, 0.5, 16]"
      />
      <TresBoxGeometry 
        v-else
        :args="[zone.width || 10, 0.5, zone.length || 10]"
      />

      <!-- Material -->
      <TresMeshLambertMaterial
        :color="zoneColor"
        :transparent="true"
        :opacity="zoneOpacity"
        :wireframe="wireframe"
        :emissive="isHovered ? hoverEmissive : 0x000000"
      />
    </TresMesh>

    <!-- Zone Label -->
    <TresGroup v-if="showLabel">
      <!-- Label Background -->
      <TresMesh
        :position="[zone.x_coordinate || 0, 2, zone.y_coordinate || 0]"
      >
        <TresPlaneGeometry :args="[labelWidth, 1]" />
        <TresMeshBasicMaterial
          :color="labelBackgroundColor"
          :transparent="true"
          :opacity="0.8"
        />
      </TresMesh>
      
      <!-- TODO: Add text rendering with troika-three-text or similar -->
      <!-- For now using a simple plane as placeholder -->
    </TresGroup>

    <!-- Stock Level Indicator -->
    <TresMesh
      v-if="showStockIndicator"
      :position="[
        (zone.x_coordinate || 0) + (zone.width || 10) / 2 - 1,
        1.5,
        (zone.y_coordinate || 0) + (zone.length || 10) / 2 - 1
      ]"
    >
      <TresSphereGeometry :args="[0.5, 8, 6]" />
      <TresMeshBasicMaterial 
        :color="stockIndicatorColor"
        :emissive="stockIndicatorColor"
        :emissive-intensity="0.3"
      />
    </TresMesh>

    <!-- Utilization Bar -->
    <TresMesh
      v-if="showUtilization"
      :position="[
        zone.x_coordinate || 0,
        0.6,
        (zone.y_coordinate || 0) - (zone.length || 10) / 2 - 2
      ]"
    >
      <TresBoxGeometry 
        :args="[
          (zone.width || 10) * (zone.utilizationPercentage / 100),
          0.2,
          1
        ]" 
      />
      <TresMeshBasicMaterial :color="utilizationBarColor" />
    </TresMesh>

    <!-- Zone Boundaries (wireframe) -->
    <TresMesh
      v-if="selected || isHovered"
      :position="[zone.x_coordinate || 0, 0.25, zone.y_coordinate || 0]"
    >
      <TresBoxGeometry :args="[zone.width || 10, 0.5, zone.length || 10]" />
      <TresMeshBasicMaterial
        :color="selected ? selectedBorderColor : hoverBorderColor"
        :wireframe="true"
        :transparent="true"
        :opacity="0.8"
      />
    </TresMesh>
  </TresGroup>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { 
  TresGroup, 
  TresMesh, 
  TresBoxGeometry, 
  TresCylinderGeometry, 
  TresSphereGeometry,
  TresPlaneGeometry,
  TresMeshLambertMaterial,
  TresMeshBasicMaterial
} from '@tresjs/core'
import type { WarehouseZone3D } from '@/composables/useWarehouse3D'

interface Props {
  zone: WarehouseZone3D
  selected?: boolean
  wireframe?: boolean
  showLabel?: boolean
  showStockIndicator?: boolean
  showUtilization?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  wireframe: false,
  showLabel: true,
  showStockIndicator: true,
  showUtilization: true
})

interface Emits {
  click: [zone: WarehouseZone3D]
  hover: [zone: WarehouseZone3D | null]
}

const emit = defineEmits<Emits>()

// Get dark mode state
const isDark = inject('isDark', false)

// Hover state
const isHovered = ref(false)

// Colors based on stock level and theme
const zoneColor = computed(() => {
  if (props.zone.color_hex) {
    return props.zone.color_hex
  }
  
  const stockColors = {
    EMPTY: isDark ? '#374151' : '#F3F4F6',      // gray-700 / gray-100
    LOW: isDark ? '#DC2626' : '#FEE2E2',        // red-600 / red-100  
    NORMAL: isDark ? '#059669' : '#D1FAE5',     // emerald-600 / emerald-100
    HIGH: isDark ? '#D97706' : '#FEF3C7',       // amber-600 / amber-100
  }
  
  return stockColors[props.zone.stockLevel]
})

const zoneOpacity = computed(() => {
  return props.zone.opacity || (props.selected ? 0.9 : 0.7)
})

const hoverEmissive = computed(() => 
  isDark ? 0x333333 : 0x444444
)

const selectedBorderColor = computed(() => 
  isDark ? '#3B82F6' : '#2563EB' // blue-500 / blue-600
)

const hoverBorderColor = computed(() => 
  isDark ? '#60A5FA' : '#93C5FD' // blue-400 / blue-300
)

const stockIndicatorColor = computed(() => {
  const colors = {
    EMPTY: isDark ? '#6B7280' : '#9CA3AF',      // gray-500 / gray-400
    LOW: isDark ? '#EF4444' : '#F87171',        // red-500 / red-400
    NORMAL: isDark ? '#10B981' : '#34D399',     // emerald-500 / emerald-400
    HIGH: isDark ? '#F59E0B' : '#FBBF24',       // amber-500 / amber-400
  }
  return colors[props.zone.stockLevel]
})

const utilizationBarColor = computed(() => {
  const percentage = props.zone.utilizationPercentage
  if (percentage < 25) return isDark ? '#10B981' : '#34D399'      // green
  if (percentage < 75) return isDark ? '#F59E0B' : '#FBBF24'      // yellow
  return isDark ? '#EF4444' : '#F87171'                           // red
})

const labelBackgroundColor = computed(() => 
  isDark ? '#1F2937' : '#FFFFFF' // gray-800 / white
)

const labelWidth = computed(() => {
  const nameLength = props.zone.name?.length || props.zone.code.length
  return Math.max(nameLength * 0.5, 4)
})

// Event handlers
const handleClick = (event: Event) => {
  event.stopPropagation()
  emit('click', props.zone)
}

const handlePointerOver = () => {
  isHovered.value = true
  emit('hover', props.zone)
}

const handlePointerOut = () => {
  isHovered.value = false
  emit('hover', null)
}
</script>