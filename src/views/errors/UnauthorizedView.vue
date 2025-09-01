<template>
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="max-w-md w-full text-center">
            <h1 class="text-6xl font-bold text-gray-900 mb-4">403</h1>
            <h2 class="text-2xl font-semibold text-gray-700 mb-4">Unauthorized</h2>
            <p class="text-gray-500 mb-8">You don't have permission to access this resource.</p>
            <router-link to="/dashboard" class="btn-primary">
                Go to Dashboard
            </router-link>
        </div>
    </div>
</template>

<script setup lang="ts">
// Error view component
</script>
