<template>
    <div class="space-y-4">
        <!-- Search and Filters -->
        <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div class="flex-1 max-w-sm">
                <FormField v-model="globalFilter" type="text" placeholder="Search..."
                    @update:model-value="table.setGlobalFilter($event)" />
            </div>
            <div class="flex items-center gap-2">
                <slot name="actions" />
            </div>
        </div>

        <!-- Table -->
        <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                    <!-- Header -->
                    <thead class="bg-gray-50 dark:bg-gray-800">
                        <tr v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                            <th v-for="header in headerGroup.headers" :key="header.id" :class="getHeaderClasses(header)"
                                @click="header.column.getCanSort() ? header.column.toggleSorting() : null">
                                <div class="flex items-center gap-2">
                                    <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header"
                                        :props="header.getContext()" />
                                    <div v-if="header.column.getCanSort()" class="flex flex-col">
                                        <ChevronUpIcon :class="[
                                            'h-3 w-3',
                                            header.column.getIsSorted() === 'asc'
                                                ? 'text-gray-900 dark:text-white'
                                                : 'text-gray-400 dark:text-gray-600'
                                        ]" />
                                        <ChevronDownIcon :class="[
                                            'h-3 w-3 -mt-1',
                                            header.column.getIsSorted() === 'desc'
                                                ? 'text-gray-900 dark:text-white'
                                                : 'text-gray-400 dark:text-gray-600'
                                        ]" />
                                    </div>
                                </div>
                            </th>
                        </tr>
                    </thead>

                    <!-- Body -->
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                        <tr v-for="row in table.getRowModel().rows" :key="row.id" :class="getRowClasses(row)"
                            @click="handleRowClick(row)">
                            <td v-for="cell in row.getVisibleCells()" :key="cell.id" :class="getCellClasses(cell)">
                                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Empty State -->
            <div v-if="table.getRowModel().rows.length === 0" class="text-center py-12 bg-white dark:bg-gray-900">
                <div class="text-gray-500 dark:text-gray-400">
                    <slot name="empty">
                        <p class="text-lg font-medium">No data available</p>
                        <p class="mt-1">Try adjusting your search or filter criteria.</p>
                    </slot>
                </div>
            </div>
        </div>

        <!-- Pagination -->
        <div v-if="showPagination && table.getPageCount() > 1"
            class="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div class="flex flex-1 justify-between sm:hidden">
                <Button variant="outline" :disabled="!table.getCanPreviousPage()" @click="table.previousPage()">
                    Previous
                </Button>
                <Button variant="outline" :disabled="!table.getCanNextPage()" @click="table.nextPage()">
                    Next
                </Button>
            </div>
            <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p class="text-sm text-gray-700 dark:text-gray-300">
                        Showing
                        <span class="font-medium">{{ table.getState().pagination.pageIndex *
                            table.getState().pagination.pageSize + 1 }}</span>
                        to
                        <span class="font-medium">{{ Math.min((table.getState().pagination.pageIndex + 1) *
                            table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length) }}</span>
                        of
                        <span class="font-medium">{{ table.getFilteredRowModel().rows.length }}</span>
                        results
                    </p>
                </div>
                <div>
                    <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <Button variant="outline" size="sm" :disabled="!table.getCanPreviousPage()"
                            @click="table.setPageIndex(0)">
                            First
                        </Button>
                        <Button variant="outline" size="sm" :disabled="!table.getCanPreviousPage()"
                            @click="table.previousPage()">
                            <ChevronLeftIcon class="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" :disabled="!table.getCanNextPage()"
                            @click="table.nextPage()">
                            <ChevronRightIcon class="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" :disabled="!table.getCanNextPage()"
                            @click="table.setPageIndex(table.getPageCount() - 1)">
                            Last
                        </Button>
                    </nav>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" generic="TData">
import { ref, computed, watch } from 'vue'
import {
    useVueTable,
    FlexRender,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    type ColumnDef,
    type SortingState,
    type Row,
    type Header,
    type Cell,
} from '@tanstack/vue-table'
import {
    ChevronUp as ChevronUpIcon,
    ChevronDown as ChevronDownIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
} from 'lucide-vue-next'
import Button from './Button.vue'
import FormField from './FormField.vue'

interface DataTableProps<TData> {
    data: TData[]
    columns: ColumnDef<TData>[]
    loading?: boolean
    showPagination?: boolean
    pageSize?: number
    selectable?: boolean
    onRowClick?: (row: Row<TData>) => void
}

interface DataTableEmits<TData> {
    'row-click': [row: Row<TData>]
    'selection-change': [selectedRows: Row<TData>[]]
}

const props = withDefaults(defineProps<DataTableProps<TData>>(), {
    loading: false,
    showPagination: true,
    pageSize: 10,
    selectable: false,
})

const emit = defineEmits<DataTableEmits<TData>>()

const sorting = ref<SortingState>([])
const globalFilter = ref('')

const table = useVueTable({
    get data() {
        return props.data
    },
    get columns() {
        return props.columns
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
        get sorting() {
            return sorting.value
        },
        get globalFilter() {
            return globalFilter.value
        },
    },
    onSortingChange: (updaterOrValue) => {
        sorting.value = typeof updaterOrValue === 'function'
            ? updaterOrValue(sorting.value)
            : updaterOrValue
    },
    onGlobalFilterChange: (updaterOrValue) => {
        globalFilter.value = typeof updaterOrValue === 'function'
            ? updaterOrValue(globalFilter.value)
            : updaterOrValue
    },
    initialState: {
        pagination: {
            pageSize: props.pageSize,
        },
    },
})

const handleRowClick = (row: Row<TData>) => {
    if (props.onRowClick) {
        props.onRowClick(row)
    }
    emit('row-click', row)
}

const getHeaderClasses = (header: Header<TData, unknown>) => {
    const baseClasses = [
        'px-6',
        'py-3',
        'text-left',
        'text-xs',
        'font-medium',
        'text-gray-500',
        'dark:text-gray-400',
        'uppercase',
        'tracking-wider',
    ]

    if (header.column.getCanSort()) {
        baseClasses.push('cursor-pointer', 'select-none', 'hover:bg-gray-100', 'dark:hover:bg-gray-700')
    }

    return baseClasses.join(' ')
}

const getRowClasses = (row: Row<TData>) => {
    const baseClasses = ['hover:bg-gray-50', 'dark:hover:bg-gray-800']

    if (props.onRowClick) {
        baseClasses.push('cursor-pointer')
    }

    return baseClasses.join(' ')
}

const getCellClasses = (cell: Cell<TData, unknown>) => {
    return [
        'px-6',
        'py-4',
        'whitespace-nowrap',
        'text-sm',
        'text-gray-900',
        'dark:text-gray-100',
    ].join(' ')
}
</script>
