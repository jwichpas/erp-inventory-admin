<template>
    <div class="relative">
        <!-- Company Selector Button -->
        <button @click="showDropdown = !showDropdown"
            class="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            :disabled="loading">
            <BuildingIcon class="w-4 h-4 text-gray-500" />
            <span class="max-w-32 truncate">
                {{ currentCompanyName || 'Seleccionar empresa' }}
            </span>
            <ChevronDownIcon :class="[
                'w-4 h-4 text-gray-400 transition-transform duration-200',
                showDropdown ? 'rotate-180' : ''
            ]" />
            <div v-if="loading" class="w-4 h-4">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            </div>
        </button>

        <!-- Dropdown Menu -->
        <div v-if="showDropdown && !loading"
            class="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
            <div class="py-1">
                <!-- Header -->
                <div class="px-4 py-2 border-b border-gray-100">
                    <h3 class="text-sm font-medium text-gray-900">Seleccionar Empresa</h3>
                    <p class="text-xs text-gray-500 mt-1">
                        {{ userCompanies.length }} empresa{{ userCompanies.length !== 1 ? 's' : '' }} disponible{{
                            userCompanies.length !== 1 ? 's' : '' }}
                    </p>
                </div>

                <!-- Search -->
                <div v-if="userCompanies.length > 5" class="px-4 py-2 border-b border-gray-100">
                    <div class="relative">
                        <SearchIcon class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input v-model="searchQuery" type="text" placeholder="Buscar empresa..."
                            class="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                </div>

                <!-- Company List -->
                <div class="max-h-64 overflow-y-auto">
                    <button v-for="company in filteredCompanies" :key="company.company_id"
                        @click="handleCompanySwitch(company.company_id)" :class="[
                            'w-full text-left px-4 py-3 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors duration-150',
                            currentCompanyId === company.company_id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                        ]">
                        <div class="flex items-center justify-between">
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-gray-900 truncate">
                                    {{ company.company_name }}
                                </p>
                                <p class="text-xs text-gray-500 truncate">
                                    Rol: {{ company.role_name }}
                                </p>
                            </div>
                            <div class="flex-shrink-0 ml-2">
                                <CheckIcon v-if="currentCompanyId === company.company_id"
                                    class="w-4 h-4 text-blue-500" />
                            </div>
                        </div>
                    </button>

                    <!-- No companies found -->
                    <div v-if="filteredCompanies.length === 0 && searchQuery" class="px-4 py-3 text-center">
                        <p class="text-sm text-gray-500">No se encontraron empresas</p>
                    </div>

                    <!-- No companies available -->
                    <div v-if="userCompanies.length === 0" class="px-4 py-3 text-center">
                        <p class="text-sm text-gray-500">No tienes acceso a ninguna empresa</p>
                    </div>
                </div>

                <!-- Footer -->
                <div v-if="userCompanies.length > 0" class="px-4 py-2 border-t border-gray-100 bg-gray-50">
                    <p class="text-xs text-gray-500">
                        Empresa actual: {{ currentCompanyName }}
                    </p>
                </div>
            </div>
        </div>

        <!-- Overlay -->
        <div v-if="showDropdown" class="fixed inset-0 z-40" @click="showDropdown = false"></div>

        <!-- Error Toast -->
        <div v-if="error"
            class="fixed top-4 right-4 z-50 max-w-sm bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
            <div class="flex items-center">
                <AlertTriangleIcon class="w-5 h-5 text-red-500 mr-2" />
                <div>
                    <p class="font-medium">Error</p>
                    <p class="text-sm">{{ error }}</p>
                </div>
                <button @click="clearError" class="ml-4 text-red-500 hover:text-red-700">
                    <XIcon class="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCompanyStore } from '@/stores/company'
import {
    BuildingIcon,
    ChevronDownIcon,
    CheckIcon,
    SearchIcon,
    AlertTriangleIcon,
    XIcon,
} from 'lucide-vue-next'

const companyStore = useCompanyStore()
const showDropdown = ref(false)
const searchQuery = ref('')

// Computed properties
const currentCompany = computed(() => companyStore.currentCompany)
const userCompanies = computed(() => companyStore.userCompanies)
const loading = computed(() => companyStore.loading)
const error = computed(() => companyStore.error)
const currentCompanyId = computed(() => companyStore.currentCompanyId)
const currentCompanyName = computed(() => companyStore.currentCompanyName)
const hasMultipleCompanies = computed(() => companyStore.hasMultipleCompanies)

const filteredCompanies = computed(() => {
    if (!searchQuery.value) return userCompanies.value

    const query = searchQuery.value.toLowerCase()
    return userCompanies.value.filter(company =>
        company.company_name?.toLowerCase().includes(query) ||
        company.role_name.toLowerCase().includes(query)
    )
})

// Methods
const handleCompanySwitch = async (companyId: string) => {
    try {
        await companyStore.switchCompany(companyId)
        showDropdown.value = false
        searchQuery.value = ''

        // Emit event for parent components to react to company change
        window.dispatchEvent(new CustomEvent('company-changed', {
            detail: { companyId }
        }))
    } catch (err) {
        console.error('Error switching company:', err)
    }
}

const clearError = () => {
    companyStore.error = null
}

// Close dropdown on escape key
const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        showDropdown.value = false
    }
}

onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
})
</script>
