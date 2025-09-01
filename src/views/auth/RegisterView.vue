<template>
    <AuthLayout title="Create your account" subtitle="Join the ERP system to manage your business">
        <RegisterForm />
    </AuthLayout>
</template>

<script setup lang="ts">
import AuthLayout from '@/layouts/AuthLayout.vue'
import RegisterForm from '@/components/auth/RegisterForm.vue'
</script>
