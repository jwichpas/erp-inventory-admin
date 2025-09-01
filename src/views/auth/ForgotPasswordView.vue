<template>
    <AuthLayout title="Reset your password" subtitle="Enter your email to receive a password reset link">
        <ForgotPasswordForm />
    </AuthLayout>
</template>

<script setup lang="ts">
import AuthLayout from '@/layouts/AuthLayout.vue'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm.vue'
</script>
