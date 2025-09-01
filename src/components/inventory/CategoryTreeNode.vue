<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <!-- Category Node -->
        <div :class="[
            'p-4 flex items-center justify-between',
            level > 0 && 'border-l-4 border-blue-200 dark:border-blue-800 ml-4'
        ]" :style="{ marginLeft: `${level * 20}px` }">
            <div class="flex items-center space-x-3 flex-1">
                <!-- Expand/Collapse Button -->
                <button v-if="hasChildren" @click="toggleExpanded"
                    class="flex-shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ChevronRightIcon :class="[
                        'w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform',
                        isExpanded && 'rotate-90'
                    ]" />
                </button>
                <div v-else class="w-6"></div>

                <!-- Category Icon -->
                <div class="flex-shrink-0">
                    <FolderIcon :class="[
                        'w-5 h-5',
                        category.active
                            ? 'text-blue-500 dark:text-blue-400'
                            : 'text-gray-400 dark:text-gray-500'
                    ]" />
                </div>

                <!-- Category Info -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-center space-x-2">
                        <h4 class="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {{ category.name }}
                        </h4>
                        <span :class="[
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            category.active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        ]">
                            {{ category.active ? 'Activa' : 'Inactiva' }}
                        </span>
                        <span v-if="hasChildren" class="text-xs text-gray-500 dark:text-gray-400">
                            {{ category.children!.length }} subcategoría{{ category.children!.length !== 1 ? 's' : '' }}
                        </span>
                    </div>
                    <p v-if="category.code" class="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                        Código: {{ category.code }}
                    </p>
                </div>

                <!-- Actions -->
                <div class="flex items-center space-x-2 flex-shrink-0">
                    <button @click="$emit('add-child', category)"
                        class="p-1 text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                        :disabled="isMutating" title="Agregar subcategoría">
                        <PlusIcon class="w-4 h-4" />
                    </button>
                    <button @click="$emit('edit', category)"
                        class="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        :disabled="isMutating" title="Editar categoría">
                        <EditIcon class="w-4 h-4" />
                    </button>
                    <button @click="$emit('delete', category)"
                        class="p-1 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        :disabled="isMutating" title="Eliminar categoría">
                        <TrashIcon class="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>

        <!-- Children -->
        <div v-if="hasChildren && isExpanded" class="pb-2">
            <CategoryTreeNode v-for="child in category.children" :key="child.id" :category="child" :level="level + 1"
                :is-mutating="isMutating" @edit="$emit('edit', $event)" @delete="$emit('delete', $event)"
                @add-child="$emit('add-child', $event)" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
    ChevronRight as ChevronRightIcon,
    Folder as FolderIcon,
    Plus as PlusIcon,
    Edit as EditIcon,
    Trash2 as TrashIcon,
} from 'lucide-vue-next'
import type { CategoryTreeNode as CategoryTreeNodeType } from '@/composables/useCategories'

interface CategoryTreeNodeProps {
    category: CategoryTreeNodeType
    level: number
    isMutating?: boolean
}

interface CategoryTreeNodeEmits {
    edit: [category: CategoryTreeNodeType]
    delete: [category: CategoryTreeNodeType]
    'add-child': [category: CategoryTreeNodeType]
}

const props = withDefaults(defineProps<CategoryTreeNodeProps>(), {
    isMutating: false,
})

defineEmits<CategoryTreeNodeEmits>()

// Local state
const isExpanded = ref(true)

// Computed properties
const hasChildren = computed(() =>
    props.category.children && props.category.children.length > 0
)

// Methods
const toggleExpanded = () => {
    isExpanded.value = !isExpanded.value
}
</script>
