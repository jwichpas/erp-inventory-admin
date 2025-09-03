<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Check if user has POS permissions -->
    <!-- <div v-if="!hasPermission('pos.access')" class="flex items-center justify-center min-h-screen">
            <div class="text-center">
                <Lock class="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Acceso Denegado
                </h2>
                <p class="text-gray-600 dark:text-gray-400">
                    No tiene permisos para acceder al sistema POS
                </p>
            </div>
        </div> -->

    <!-- Check if company is selected -->
    <!-- <div class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <Building class="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Seleccione una Empresa
        </h2>
        <p class="text-gray-600 dark:text-gray-400">
          Debe seleccionar una empresa para acceder al POS
        </p>
      </div>
    </div> -->

    <!-- POS Interface -->
    <POSInterface />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Lock, Building } from 'lucide-vue-next'
import { usePermissions } from '@/composables/usePermissions'
import { useCompanyStore } from '@/stores/company'
import POSInterface from '@/components/pos/POSInterface.vue'

// Composables
const { hasPermission } = usePermissions()
const companyStore = useCompanyStore()

// Computed
const currentCompany = computed(() => companyStore.currentCompany)
</script>
