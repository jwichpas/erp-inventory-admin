<template>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900 dark:text-white">UI Components Demo</h1>
                <p class="mt-2 text-gray-600 dark:text-gray-400">
                    Demonstration of all reusable UI components with dark mode support
                </p>
            </div>

            <div class="space-y-8">
                <!-- Buttons -->
                <Card title="Buttons">
                    <div class="space-y-4">
                        <div class="flex flex-wrap gap-4">
                            <Button variant="primary">Primary</Button>
                            <Button variant="secondary">Secondary</Button>
                            <Button variant="success">Success</Button>
                            <Button variant="danger">Danger</Button>
                            <Button variant="warning">Warning</Button>
                            <Button variant="ghost">Ghost</Button>
                            <Button variant="outline">Outline</Button>
                        </div>

                        <div class="flex flex-wrap gap-4">
                            <Button size="xs">Extra Small</Button>
                            <Button size="sm">Small</Button>
                            <Button size="md">Medium</Button>
                            <Button size="lg">Large</Button>
                            <Button size="xl">Extra Large</Button>
                        </div>

                        <div class="flex flex-wrap gap-4">
                            <Button :loading="loadingButton" @click="toggleLoading">
                                {{ loadingButton ? 'Loading...' : 'Click to Load' }}
                            </Button>
                            <Button disabled>Disabled</Button>
                            <Button :left-icon="PlusIcon">With Icon</Button>
                        </div>
                    </div>
                </Card>

                <!-- Form Fields -->
                <Card title="Form Fields">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField v-model="formData.text" label="Text Input" placeholder="Enter some text"
                            help-text="This is a help text" />

                        <FormField v-model="formData.email" type="email" label="Email" placeholder="Enter your email"
                            required />

                        <FormField v-model="formData.number" type="number" label="Number"
                            placeholder="Enter a number" />

                        <FormField v-model="formData.select" type="select" label="Select Option"
                            placeholder="Choose an option" :options="selectOptions" />

                        <FormField v-model="formData.date" type="date" label="Date" />

                        <FormField v-model="formData.checkbox" type="checkbox" checkbox-label="I agree to the terms" />

                        <div class="md:col-span-2">
                            <FormField v-model="formData.textarea" type="textarea" label="Textarea"
                                placeholder="Enter a longer text" :rows="4" />
                        </div>
                    </div>
                </Card>

                <!-- Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card title="Default Card" variant="default">
                        <p class="text-gray-600 dark:text-gray-400">
                            This is a default card with some content.
                        </p>
                    </Card>

                    <Card title="Outlined Card" variant="outlined">
                        <p class="text-gray-600 dark:text-gray-400">
                            This is an outlined card variant.
                        </p>
                    </Card>

                    <Card title="Elevated Card" variant="elevated" hoverable>
                        <p class="text-gray-600 dark:text-gray-400">
                            This is an elevated card that's hoverable.
                        </p>
                    </Card>
                </div>

                <!-- Data Table -->
                <Card title="Data Table">
                    <DataTable :data="tableData" :columns="tableColumns" :loading="tableLoading"
                        @row-click="handleRowClick">
                        <template #actions>
                            <Button @click="refreshTable">Refresh</Button>
                            <Button variant="success" :left-icon="PlusIcon">Add Item</Button>
                        </template>
                    </DataTable>
                </Card>

                <!-- Toast Notifications -->
                <Card title="Toast Notifications">
                    <div class="flex flex-wrap gap-4">
                        <Button variant="success" @click="showSuccessToast">Success Toast</Button>
                        <Button variant="danger" @click="showErrorToast">Error Toast</Button>
                        <Button variant="warning" @click="showWarningToast">Warning Toast</Button>
                        <Button @click="showInfoToast">Info Toast</Button>
                    </div>
                </Card>

                <!-- Modal -->
                <Card title="Modal">
                    <Button @click="showModal = true">Open Modal</Button>

                    <Modal :show="showModal" title="Example Modal" size="md" @close="showModal = false">
                        <p class="text-gray-600 dark:text-gray-400">
                            This is an example modal with HeadlessUI transitions and dark mode support.
                        </p>

                        <template #footer>
                            <Button variant="outline" @click="showModal = false">Cancel</Button>
                            <Button @click="showModal = false">Confirm</Button>
                        </template>
                    </Modal>
                </Card>
            </div>
        </div>

        <!-- Toast Container -->
        <ToastContainer />
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Plus as PlusIcon } from 'lucide-vue-next'
import { Button, Card, FormField, DataTable, Modal, ToastContainer } from '@/components/ui'
import { useToast } from '@/composables/useToast'
import type { ColumnDef } from '@tanstack/vue-table'

// Toast composable
const { success, error, warning, info } = useToast()

// Button loading state
const loadingButton = ref(false)
const toggleLoading = () => {
    loadingButton.value = true
    setTimeout(() => {
        loadingButton.value = false
    }, 2000)
}

// Form data
const formData = reactive({
    text: '',
    email: '',
    number: null,
    select: '',
    date: '',
    checkbox: false,
    textarea: '',
})

const selectOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
]

// Table data
interface TableItem {
    id: number
    name: string
    email: string
    role: string
    status: 'active' | 'inactive'
}

const tableData = ref<TableItem[]>([
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'active' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'inactive' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Manager', status: 'active' },
])

const tableColumns: ColumnDef<TableItem>[] = [
    {
        accessorKey: 'id',
        header: 'ID',
    },
    {
        accessorKey: 'name',
        header: 'Name',
    },
    {
        accessorKey: 'email',
        header: 'Email',
    },
    {
        accessorKey: 'role',
        header: 'Role',
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
            const status = getValue() as string
            return status === 'active'
                ? '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">Active</span>'
                : '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">Inactive</span>'
        },
    },
]

const tableLoading = ref(false)

const handleRowClick = (row: any) => {
    info('Row Clicked', `You clicked on ${row.original.name}`)
}

const refreshTable = () => {
    tableLoading.value = true
    setTimeout(() => {
        tableLoading.value = false
        success('Table Refreshed', 'Data has been updated')
    }, 1000)
}

// Modal
const showModal = ref(false)

// Toast methods
const showSuccessToast = () => {
    success('Success!', 'This is a success message')
}

const showErrorToast = () => {
    error('Error!', 'This is an error message')
}

const showWarningToast = () => {
    warning('Warning!', 'This is a warning message')
}

const showInfoToast = () => {
    info('Info', 'This is an info message')
}
</script>
