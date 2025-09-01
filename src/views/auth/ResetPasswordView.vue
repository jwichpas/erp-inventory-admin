<template>
    <AuthLayout title="Set new password" subtitle="Enter your new password below">
        <ResetPasswordForm />
    </AuthLayout>
</template>

<script setup lang="ts">
import AuthLayout from '@/layouts/AuthLayout.vue'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm.vue'
</script>
