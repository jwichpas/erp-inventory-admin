<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Email Field -->
        <div>
            <label for="email" class="form-label">
                Email address
            </label>
            <div class="mt-1">
                <input id="email" v-model="form.email" name="email" type="email" autocomplete="email" required
                    class="form-input" :class="{
                        'border-danger-300 focus:border-danger-500 focus:ring-danger-500': errors.email
                    }" placeholder="Enter your email" />
                <p v-if="errors.email" class="form-error">
                    {{ errors.email }}
                </p>
            </div>
        </div>

        <!-- Password Field -->
        <div>
            <label for="password" class="form-label">
                Password
            </label>
            <div class="mt-1 relative">
                <input id="password" v-model="form.password" name="password" :type="showPassword ? 'text' : 'password'"
                    autocomplete="current-password" required class="form-input pr-10" :class="{
                        'border-danger-300 focus:border-danger-500 focus:ring-danger-500': errors.password
                    }" placeholder="Enter your password" />
                <button type="button" class="absolute inset-y-0 right-0 pr-3 flex items-center"
                    @click="showPassword = !showPassword">
                    <EyeIcon v-if="!showPassword" class="h-5 w-5 text-gray-400" />
                    <EyeOffIcon v-else class="h-5 w-5 text-gray-400" />
                </button>
                <p v-if="errors.password" class="form-error">
                    {{ errors.password }}
                </p>
            </div>
        </div>

        <!-- Remember Me -->
        <div class="flex items-center justify-between">
            <div class="flex items-center">
                <input id="remember-me" v-model="form.rememberMe" name="remember-me" type="checkbox"
                    class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
                <label for="remember-me" class="ml-2 block text-sm text-gray-900">
                    Remember me
                </label>
            </div>

            <div class="text-sm">
                <router-link to="/forgot-password" class="font-medium text-primary-600 hover:text-primary-500">
                    Forgot your password?
                </router-link>
            </div>
        </div>

        <!-- Error Message -->
        <div v-if="authStore.error" class="rounded-md bg-danger-50 p-4">
            <div class="flex">
                <AlertTriangleIcon class="h-5 w-5 text-danger-400" />
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-danger-800">
                        Sign in failed
                    </h3>
                    <div class="mt-2 text-sm text-danger-700">
                        {{ authStore.error }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Submit Button -->
        <div>
            <button type="submit" :disabled="authStore.loading || !isFormValid"
                class="btn-primary w-full flex justify-center items-center" :class="{
                    'opacity-50 cursor-not-allowed': authStore.loading || !isFormValid
                }">
                <div v-if="authStore.loading" class="loading-spinner mr-2"></div>
                {{ authStore.loading ? 'Signing in...' : 'Sign in' }}
            </button>
        </div>

        <!-- Register Link -->
        <div class="text-center">
            <p class="text-sm text-gray-600">
                Don't have an account?
                <router-link to="/register" class="font-medium text-primary-600 hover:text-primary-500">
                    Sign up
                </router-link>
            </p>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { EyeIcon, EyeOffIcon, AlertTriangleIcon } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { loginSchema, type LoginFormData } from '@/schemas/validation'
import { useErrorHandler } from '@/composables/useErrorHandler'

const router = useRouter()
const authStore = useAuthStore()
const { handleError } = useErrorHandler()

const showPassword = ref(false)

const form = reactive<LoginFormData & { rememberMe: boolean }>({
    email: '',
    password: '',
    rememberMe: false,
})

const errors = ref<Partial<Record<keyof LoginFormData, string>>>({})

const isFormValid = computed(() => {
    return form.email && form.password && Object.keys(errors.value).length === 0
})

const validateForm = () => {
    try {
        loginSchema.parse(form)
        errors.value = {}
        return true
    } catch (error: any) {
        if (error.issues) {
            errors.value = {}
            error.issues.forEach((issue: any) => {
                const field = issue.path[0] as keyof LoginFormData
                errors.value[field] = issue.message
            })
        }
        return false
    }
}

const handleSubmit = async () => {
    if (!validateForm()) return

    try {
        await authStore.signIn(form.email, form.password)

        // Redirect to intended page or dashboard
        const redirect = router.currentRoute.value.query.redirect as string
        await router.push(redirect || '/dashboard')
    } catch (error) {
        handleError(error)
    }
}

// Real-time validation
const validateField = (field: keyof LoginFormData) => {
    try {
        loginSchema.pick({ [field]: true }).parse({ [field]: form[field] })
        delete errors.value[field]
    } catch (error: any) {
        if (error.issues?.[0]) {
            errors.value[field] = error.issues[0].message
        }
    }
}

// Watch for form changes to validate
import { watch } from 'vue'
watch(() => form.email, () => validateField('email'))
watch(() => form.password, () => validateField('password'))
</script>
