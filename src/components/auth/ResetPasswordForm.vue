<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Password Field -->
        <div>
            <label for="password" class="form-label">
                New Password
            </label>
            <div class="mt-1 relative">
                <input id="password" v-model="form.password" name="password" :type="showPassword ? 'text' : 'password'"
                    autocomplete="new-password" required class="form-input pr-10" :class="{
                        'border-danger-300 focus:border-danger-500 focus:ring-danger-500': errors.password
                    }" placeholder="Enter your new password" />
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

        <!-- Confirm Password Field -->
        <div>
            <label for="confirmPassword" class="form-label">
                Confirm New Password
            </label>
            <div class="mt-1 relative">
                <input id="confirmPassword" v-model="form.confirmPassword" name="confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'" autocomplete="new-password" required
                    class="form-input pr-10" :class="{
                        'border-danger-300 focus:border-danger-500 focus:ring-danger-500': errors.confirmPassword
                    }" placeholder="Confirm your new password" />
                <button type="button" class="absolute inset-y-0 right-0 pr-3 flex items-center"
                    @click="showConfirmPassword = !showConfirmPassword">
                    <EyeIcon v-if="!showConfirmPassword" class="h-5 w-5 text-gray-400" />
                    <EyeOffIcon v-else class="h-5 w-5 text-gray-400" />
                </button>
                <p v-if="errors.confirmPassword" class="form-error">
                    {{ errors.confirmPassword }}
                </p>
            </div>
        </div>

        <!-- Error Message -->
        <div v-if="authStore.error" class="rounded-md bg-danger-50 p-4">
            <div class="flex">
                <AlertTriangleIcon class="h-5 w-5 text-danger-400" />
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-danger-800">
                        Password reset failed
                    </h3>
                    <div class="mt-2 text-sm text-danger-700">
                        {{ authStore.error }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Success Message -->
        <div v-if="resetSuccess" class="rounded-md bg-success-50 p-4">
            <div class="flex">
                <CheckCircleIcon class="h-5 w-5 text-success-400" />
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-success-800">
                        Password updated successfully!
                    </h3>
                    <div class="mt-2 text-sm text-success-700">
                        Your password has been updated. You can now sign in with your new password.
                    </div>
                </div>
            </div>
        </div>

        <!-- Submit Button -->
        <div>
            <button type="submit" :disabled="authStore.loading || !isFormValid || resetSuccess"
                class="btn-primary w-full flex justify-center items-center" :class="{
                    'opacity-50 cursor-not-allowed': authStore.loading || !isFormValid || resetSuccess
                }">
                <div v-if="authStore.loading" class="loading-spinner mr-2"></div>
                {{ authStore.loading ? 'Updating...' : resetSuccess ? 'Password updated' : 'Update password' }}
            </button>
        </div>

        <!-- Sign in link -->
        <div v-if="resetSuccess" class="text-center">
            <router-link to="/login" class="font-medium text-primary-600 hover:text-primary-500 text-sm">
                Continue to sign in →
            </router-link>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EyeIcon, EyeOffIcon, AlertTriangleIcon, CheckCircleIcon } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/schemas/validation'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { supabase } from '@/lib/supabase'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { handleError } = useErrorHandler()

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const resetSuccess = ref(false)

const form = reactive<ResetPasswordFormData>({
    password: '',
    confirmPassword: '',
})

const errors = ref<Partial<Record<keyof ResetPasswordFormData, string>>>({})

const isFormValid = computed(() => {
    return form.password && form.confirmPassword && Object.keys(errors.value).length === 0
})

const validateForm = () => {
    try {
        resetPasswordSchema.parse(form)
        errors.value = {}
        return true
    } catch (error: any) {
        if (error.issues) {
            errors.value = {}
            error.issues.forEach((issue: any) => {
                const field = issue.path[0] as keyof ResetPasswordFormData
                errors.value[field] = issue.message
            })
        }
        return false
    }
}

const handleSubmit = async () => {
    if (!validateForm()) return

    try {
        authStore.setLoading(true)
        authStore.clearError()

        const { error } = await supabase.auth.updateUser({
            password: form.password
        })

        if (error) throw error

        resetSuccess.value = true

        // Redirect to login after 3 seconds
        setTimeout(() => {
            router.push('/login')
        }, 3000)
    } catch (error) {
        handleError(error)
    } finally {
        authStore.setLoading(false)
    }
}

// Real-time validation
const validateField = (field: keyof ResetPasswordFormData) => {
    try {
        resetPasswordSchema.pick({ [field]: true }).parse({ [field]: form[field] })
        delete errors.value[field]
    } catch (error: any) {
        if (error.issues?.[0]) {
            errors.value[field] = error.issues[0].message
        }
    }
}

// Watch for form changes to validate
import { watch } from 'vue'
watch(() => form.password, () => validateField('password'))
watch(() => form.confirmPassword, () => validateField('confirmPassword'))

onMounted(() => {
    // Check if we have a valid session for password reset
    const accessToken = route.query.access_token as string
    const refreshToken = route.query.refresh_token as string

    if (accessToken && refreshToken) {
        // Set the session with the tokens from the URL
        supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
        })
    } else {
        // No valid tokens, redirect to login
        router.push('/login')
    }
})
</script>
