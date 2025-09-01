<template>
    <AuthLayout title="Select Company" subtitle="Choose a company to continue">
        <div class="space-y-6">
            <!-- Company List -->
            <div v-if="authStore.loading" class="text-center py-8">
                <div class="loading-spinner mx-auto mb-4"></div>
                <p class="text-gray-500">Loading companies...</p>
            </div>

            <div v-else-if="authStore.error" class="rounded-md bg-danger-50 p-4">
                <div class="flex">
                    <AlertTriangleIcon class="h-5 w-5 text-danger-400" />
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-danger-800">
                            Error loading companies
                        </h3>
                        <div class="mt-2 text-sm text-danger-700">
                            {{ authStore.error }}
                        </div>
                    </div>
                </div>
            </div>

            <div v-else-if="!authStore.userCompanies.length" class="text-center py-8">
                <BuildingIcon class="mx-auto h-12 w-12 text-gray-400" />
                <h3 class="mt-2 text-sm font-medium text-gray-900">No companies available</h3>
                <p class="mt-1 text-sm text-gray-500">
                    You don't have access to any companies. Please contact your administrator.
                </p>
                <div class="mt-6">
                    <button @click="handleSignOut" class="btn-secondary">
                        Sign out
                    </button>
                </div>
            </div>

            <div v-else class="space-y-3">
                <div v-for="userCompany in authStore.userCompanies" :key="userCompany.company_id"
                    class="relative rounded-lg border border-gray-300 bg-white px-6 py-4 shadow-sm hover:border-primary-400 hover:shadow-md transition-all duration-200 cursor-pointer"
                    @click="selectCompany(userCompany.company_id)">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                <BuildingIcon class="w-6 h-6 text-primary-600" />
                            </div>
                        </div>
                        <div class="ml-4 flex-1 min-w-0">
                            <h3 class="text-sm font-medium text-gray-900 truncate">
                                {{ userCompany.company_name }}
                            </h3>
                            <!-- RUC info will be available when we implement proper company data -->
                            <p class="text-sm text-gray-500">
                                Company ID: {{ userCompany.company_id.slice(0, 8) }}...
                            </p>
                            <p class="text-xs text-gray-400 mt-1">
                                Role: {{ userCompany.role_name }}
                            </p>
                        </div>
                        <div class="flex-shrink-0">
                            <ChevronRightIcon class="w-5 h-5 text-gray-400" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sign out option -->
            <div class="pt-4 border-t border-gray-200">
                <button @click="handleSignOut" class="btn-secondary w-full">
                    Sign out
                </button>
            </div>
        </div>
    </AuthLayout>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { BuildingIcon, ChevronRightIcon, AlertTriangleIcon } from 'lucide-vue-next'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const selectCompany = async (companyId: string) => {
    try {
        console.log('Selecting company:', companyId)
        authStore.setCurrentCompany(companyId)

        // Wait a moment for the store to update
        await new Promise(resolve => setTimeout(resolve, 100))

        // Verify the company was set
        console.log('Company set, current state:', {
            currentCompanyId: authStore.currentCompanyId,
            isAuthenticated: authStore.isAuthenticated,
            loading: authStore.loading
        })

        // Redirect to dashboard or intended page
        const redirect = router.currentRoute.value.query.redirect as string
        const targetRoute = redirect || '/dashboard'
        console.log('Redirecting to:', targetRoute)

        // Use replace instead of push to avoid navigation issues
        await router.replace(targetRoute)
        console.log('Navigation completed')
    } catch (error) {
        console.error('Error selecting company:', error)
    }
}

const handleSignOut = async () => {
    try {
        await authStore.signOut()
        router.push('/login')
    } catch (error) {
        console.error('Error signing out:', error)
    }
}

// Watch for changes in userCompanies
watch(() => authStore.userCompanies, (newCompanies) => {
    console.log('UserCompanies changed:', newCompanies.length, newCompanies)
}, { immediate: true, deep: true })

onMounted(async () => {
    console.log('CompanySelectView mounted')
    console.log('Auth store state:', {
        isAuthenticated: authStore.isAuthenticated,
        loading: authStore.loading,
        userCompaniesLength: authStore.userCompanies.length,
        currentCompanyId: authStore.currentCompanyId,
        error: authStore.error
    })

    // Ensure companies are loaded
    if (!authStore.userCompanies.length && authStore.isAuthenticated) {
        console.log('Loading user companies...')
        try {
            await authStore.loadUserCompanies()
            console.log('Companies loaded:', authStore.userCompanies.length)
        } catch (error) {
            console.error('Error loading companies:', error)
        }
    }

    // If user only has one company, auto-select it
    if (authStore.userCompanies.length === 1) {
        console.log('Auto-selecting single company:', authStore.userCompanies[0].company_id)
        await selectCompany(authStore.userCompanies[0].company_id)
    }
})
</script>
