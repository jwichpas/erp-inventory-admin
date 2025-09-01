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
                    }" placeholder="Enter your email address" />
                <p v-if="errors.email" class="form-error">
                    {{ errors.email }}
                </p>
            </div>
            <p class="mt-2 text-sm text-gray-500">
                We'll send you a link to reset your password.
            </p>
        </div>

        <!-- Error Message -->
        <div v-if="authStore.error" class="rounded-md bg-danger-50 p-4">
            <div class="flex">
                <AlertTriangleIcon class="h-5 w-5 text-danger-400" />
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-danger-800">
                        Reset failed
                    </h3>
                    <div class="mt-2 text-sm text-danger-700">
                        {{ authStore.error }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Success Message -->
        <div v-if="resetSent" class="rounded-md bg-success-50 p-4">
            <div class="flex">
                <CheckCircleIcon class="h-5 w-5 text-success-400" />
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-success-800">
                        Reset link sent!
                    </h3>
                    <div class="mt-2 text-sm text-success-700">
                        Check your email for a link to reset your password. If it doesn't appear within a few minutes,
                        check your spam folder.
                    </div>
                </div>
            </div>
        </div>

        <!-- Submit Button -->
        <div>
            <button type="submit" :disabled="authStore.loading || !isFormValid || resetSent"
                class="btn-primary w-full flex justify-center items-center" :class="{
                    'opacity-50 cursor-not-allowed': authStore.loading || !isFormValid || resetSent
                }">
                <div v-if="authStore.loading" class="loading-spinner mr-2"></div>
                {{ authStore.loading ? 'Sending...' : resetSent ? 'Reset link sent' : 'Send reset link' }}
            </button>
        </div>

        <!-- Back to Login -->
        <div class="text-center">
            <router-link to="/login" class="font-medium text-primary-600 hover:text-primary-500 text-sm">
                ← Back to sign in
            </router-link>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { AlertTriangleIcon, CheckCircleIcon } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/schemas/validation'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { supabase } from '@/lib/supabase'

const authStore = useAuthStore()
const { handleError } = useErrorHandler()

const resetSent = ref(false)

const form = reactive<ForgotPasswordFormData>({
    email: '',
})

const errors = ref<Partial<Record<keyof ForgotPasswordFormData, string>>>({})

const isFormValid = computed(() => {
    return form.email && Object.keys(errors.value).length === 0
})

const validateForm = () => {
    try {
        forgotPasswordSchema.parse(form)
        errors.value = {}
        return true
    } catch (error: any) {
        if (error.issues) {
            errors.value = {}
            error.issues.forEach((issue: any) => {
                const field = issue.path[0] as keyof ForgotPasswordFormData
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

        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
            redirectTo: `${window.location.origin}/reset-password`,
        })

        if (error) throw error

        resetSent.value = true
    } catch (error) {
        handleError(error)
    } finally {
        authStore.setLoading(false)
    }
}

// Real-time validation
const validateField = (field: keyof ForgotPasswordFormData) => {
    try {
        forgotPasswordSchema.pick({ [field]: true }).parse({ [field]: form[field] })
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
</script>
