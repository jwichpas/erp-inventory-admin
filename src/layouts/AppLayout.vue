<template>
    <div class="min-h-screen bg-gray-50 flex">
        <!-- Sidebar -->
        <Sidebar :is-open="sidebarOpen" @toggle="toggleSidebar" />

        <!-- Main content area -->
        <div class="flex-1 flex flex-col lg:ml-0">
            <!-- Header -->
            <Header @toggle-sidebar="toggleSidebar" />

            <!-- Main content -->
            <main class="flex-1 overflow-y-auto">
                <div class="py-6">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <slot />
                    </div>
                </div>
            </main>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCompanyStore } from '@/stores/company'
import Sidebar from '@/components/layout/Sidebar.vue'
import Header from '@/components/layout/Header.vue'

const companyStore = useCompanyStore()
const sidebarOpen = ref(false)

const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value
}

onMounted(async () => {
    // Initialize company context when layout mounts
    await companyStore.initializeCompanyContext()
})
</script>
