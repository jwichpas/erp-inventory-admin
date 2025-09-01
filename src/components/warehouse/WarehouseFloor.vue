<template>
  <TresMesh 
    :position="[0, -0.1, 0]" 
    :receive-shadow="true"
  >
    <TresPlaneGeometry 
      :args="[warehouse.width || 100, warehouse.length || 100]" 
    />
    <TresMeshLambertMaterial 
      :color="floorColor" 
      :transparent="true"
      :opacity="0.8"
    />
  </TresMesh>

  <!-- Warehouse Boundaries -->
  <TresMesh 
    :position="[0, 0.5, 0]"
  >
    <TresBoxGeometry 
      :args="[warehouse.width || 100, 1, warehouse.length || 100]" 
    />
    <TresMeshLambertMaterial 
      :color="boundaryColor"
      :wireframe="true"
      :transparent="true"
      :opacity="0.3"
    />
  </TresMesh>

  <!-- Floor Grid -->
  <TresMesh 
    v-if="showGrid"
    :position="[0, 0.01, 0]"
  >
    <TresPlaneGeometry 
      :args="[warehouse.width || 100, warehouse.length || 100, gridDivisions, gridDivisions]" 
    />
    <TresMeshBasicMaterial 
      :color="gridColor"
      :wireframe="true"
      :transparent="true"
      :opacity="0.2"
    />
  </TresMesh>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { TresMesh, TresPlaneGeometry, TresBoxGeometry, TresMeshLambertMaterial, TresMeshBasicMaterial } from '@tresjs/core'
import type { Warehouse } from '@/types/database'

interface Props {
  warehouse: Warehouse
  showGrid?: boolean
  gridDivisions?: number
}

const props = withDefaults(defineProps<Props>(), {
  showGrid: true,
  gridDivisions: 20
})

// Get dark mode state (could be from a theme composable or inject)
const isDark = inject('isDark', false)

const floorColor = computed(() => 
  isDark ? '#1F2937' : '#F3F4F6' // gray-800 : gray-100
)

const boundaryColor = computed(() => 
  isDark ? '#4B5563' : '#9CA3AF' // gray-600 : gray-400
)

const gridColor = computed(() => 
  isDark ? '#374151' : '#D1D5DB' // gray-700 : gray-300
)
</script>