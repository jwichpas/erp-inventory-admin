<template>
    <div
        class="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div class="sm:mx-auto sm:w-full sm:max-w-md">
            <div class="flex justify-center">
                <div class="flex items-center space-x-2">
                    <div class="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                        <BuildingIcon class="w-6 h-6 text-white" />
                    </div>
                    <h1 class="text-2xl font-bold text-gray-900">ERP System</h1>
                </div>
            </div>
            <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                {{ title }}
            </h2>
            <p v-if="subtitle" class="mt-2 text-center text-sm text-gray-600">
                {{ subtitle }}
            </p>
        </div>

        <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div class="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10 border border-gray-200">
                <slot />
            </div>
        </div>

        <!-- Footer -->
        <div class="mt-8 text-center">
            <p class="text-xs text-gray-500">
                © {{ currentYear }} ERP System. All rights reserved.
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BuildingIcon } from 'lucide-vue-next'

interface Props {
    title: string
    subtitle?: string
}

defineProps<Props>()

const currentYear = computed(() => new Date().getFullYear())
</script>
