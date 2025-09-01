<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Full Name Field -->
        <div>
            <label for="fullName" class="form-label">
                Full Name
            </label>
            <div class="mt-1">
                <input id="fullName" v-model="form.fullName" name="fullName" type="text" autocomplete="name" required
                    class="form-input" :class="{
                        'border-danger-300 focus:border-danger-500 focus:ring-danger-500': errors.fullName
                    }" placeholder="Enter your full name" />
                <p v-if="errors.fullName" class="form-error">
                    {{ errors.fullName }}
                </p>
            </div>
        </div>

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
                    autocomplete="new-password" required class="form-input pr-10" :class="{
                        'border-danger-300 focus:border-danger-500 focus:ring-danger-500': errors.password
                    }" placeholder="Create a password" />
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
                Confirm Password
            </label>
            <div class="mt-1 relative">
                <input id="confirmPassword" v-model="form.confirmPassword" name="confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'" autocomplete="new-password" required
                    class="form-input pr-10" :class="{
                        'border-danger-300 focus:border-danger-500 focus:ring-danger-500': errors.confirmPassword
                    }" placeholder="Confirm your password" />
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

        <!-- Terms and Conditions -->
        <div class="flex items-center">
            <input id="acceptTerms" v-model="form.acceptTerms" name="acceptTerms" type="checkbox" required
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
            <label for="acceptTerms" class="ml-2 block text-sm text-gray-900">
                I agree to the
                <a href="#" class="text-primary-600 hover:text-primary-500">Terms and Conditions</a>
                and
                <a href="#" class="text-primary-600 hover:text-primary-500">Privacy Policy</a>
            </label>
        </div>

        <!-- Error Message -->
        <div v-if="authStore.error" class="rounded-md bg-danger-50 p-4">
            <div class="flex">
                <AlertTriangleIcon class="h-5 w-5 text-danger-400" />
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-danger-800">
                        Registration failed
                    </h3>
                    <div class="mt-2 text-sm text-danger-700">
                        {{ authStore.error }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Success Message -->
        <div v-if="registrationSuccess" class="rounded-md bg-success-50 p-4">
            <div class="flex">
                <CheckCircleIcon class="h-5 w-5 text-success-400" />
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-success-800">
                        Registration successful!
                    </h3>
                    <div class="mt-2 text-sm text-success-700">
                        Please check your email to verify your account before signing in.
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
                {{ authStore.loading ? 'Creating account...' : 'Create account' }}
            </button>
        </div>

        <!-- Login Link -->
        <div class="text-center">
            <p class="text-sm text-gray-600">
                Already have an account?
                <router-link to="/login" class="font-medium text-primary-600 hover:text-primary-500">
                    Sign in
                </router-link>
            </p>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { EyeIcon, EyeOffIcon, AlertTriangleIcon, CheckCircleIcon } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { registerSchema, type RegisterFormData } from '@/schemas/validation'
import { useErrorHandler } from '@/composables/useErrorHandler'

const authStore = useAuthStore()
const { handleError } = useErrorHandler()

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const registrationSuccess = ref(false)

const form = reactive<RegisterFormData & { acceptTerms: boolean }>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
})

const errors = ref<Partial<Record<keyof RegisterFormData, string>>>({})

const isFormValid = computed(() => {
    return (
        form.fullName &&
        form.email &&
        form.password &&
        form.confirmPassword &&
        form.acceptTerms &&
        Object.keys(errors.value).length === 0
    )
})

const validateForm = () => {
    try {
        registerSchema.parse(form)
        errors.value = {}
        return true
    } catch (error: any) {
        if (error.issues) {
            errors.value = {}
            error.issues.forEach((issue: any) => {
                const field = issue.path[0] as keyof RegisterFormData
                errors.value[field] = issue.message
            })
        }
        return false
    }
}

const handleSubmit = async () => {
    if (!validateForm()) return

    try {
        await authStore.signUp(form.email, form.password, form.fullName)
        registrationSuccess.value = true

        // Reset form
        Object.assign(form, {
            fullName: '',
            email: '',
            password: '',
            confirmPassword: '',
            acceptTerms: false,
        })
    } catch (error) {
        handleError(error)
    }
}

// Real-time validation
const validateField = (field: keyof RegisterFormData) => {
    try {
        registerSchema.pick({ [field]: true }).parse({ [field]: form[field] })
        delete errors.value[field]
    } catch (error: any) {
        if (error.issues?.[0]) {
            errors.value[field] = error.issues[0].message
        }
    }
}

// Watch for form changes to validate
import { watch } from 'vue'
watch(() => form.fullName, () => validateField('fullName'))
watch(() => form.email, () => validateField('email'))
watch(() => form.password, () => validateField('password'))
watch(() => form.confirmPassword, () => validateField('confirmPassword'))
</script>
