<template>
    <AuthLayout title="Sign in to your account" subtitle="Enter your credentials to access the ERP system">
        <LoginForm />
    </AuthLayout>
</template>

<script setup lang="ts">
import AuthLayout from '@/layouts/AuthLayout.vue'
import LoginForm from '@/components/auth/LoginForm.vue'
</script>
