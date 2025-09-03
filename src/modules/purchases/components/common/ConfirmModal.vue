<template>
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="relative inset-0 bg-gray-500/75 " @click="$emit('cancel')"></div>

      <!-- This element is to trick the browser into centering the modal contents -->
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

      <!-- Modal panel -->
      <div
        class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
        <div class="sm:flex sm:items-start">
          <!-- Icon -->
          <div
            class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 sm:mx-0 sm:h-10 sm:w-10">
            <AlertTriangle class="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>

          <!-- Content -->
          <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              {{ title }}
            </h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ message }}
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button type="button" @click="$emit('confirm')" :disabled="loading"
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">
            <div v-if="loading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            {{ confirmText }}
          </button>
          <button type="button" @click="$emit('cancel')" :disabled="loading"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50">
            {{ cancelText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'

// Props
interface Props {
  title: string
  message: string
  loading?: boolean
  confirmText?: string
  cancelText?: string
}

withDefaults(defineProps<Props>(), {
  loading: false,
  confirmText: 'Confirmar',
  cancelText: 'Cancelar',
})

// Emits
defineEmits<{
  confirm: []
  cancel: []
}>()
</script>
