<template>
    <div class="space-y-1">
        <label v-if="label" :for="fieldId" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ label }}
            <span v-if="required" class="text-red-500 ml-1">*</span>
        </label>

        <!-- Text Input -->
        <input v-if="type === 'text' || type === 'email' || type === 'password' || type === 'number'" :id="fieldId"
            :type="type" :value="modelValue" :placeholder="placeholder" :disabled="disabled" :readonly="readonly"
            :class="inputClasses" @input="handleInput" @blur="handleBlur" />

        <!-- Textarea -->
        <textarea v-else-if="type === 'textarea'" :id="fieldId" :value="modelValue" :placeholder="placeholder"
            :disabled="disabled" :readonly="readonly" :rows="rows" :class="textareaClasses" @input="handleInput"
            @blur="handleBlur" />

        <!-- Select -->
        <select v-else-if="type === 'select'" :id="fieldId" :value="modelValue" :disabled="disabled"
            :class="selectClasses" @change="handleChange" @blur="handleBlur">
            <option v-if="placeholder" value="" disabled>
                {{ placeholder }}
            </option>
            <option v-for="option in options" :key="option.value" :value="option.value">
                {{ option.label }}
            </option>
        </select>

        <!-- Date Input -->
        <input v-else-if="type === 'date'" :id="fieldId" type="date" :value="modelValue" :disabled="disabled"
            :readonly="readonly" :class="inputClasses" @input="handleInput" @blur="handleBlur" />

        <!-- Checkbox -->
        <div v-else-if="type === 'checkbox'" class="flex items-center">
            <input :id="fieldId" type="checkbox" :checked="modelValue" :disabled="disabled"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-400"
                @change="handleCheckboxChange" />
            <label v-if="checkboxLabel" :for="fieldId" class="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                {{ checkboxLabel }}
            </label>
        </div>

        <!-- Error Message -->
        <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">
            {{ errorMessage }}
        </p>

        <!-- Help Text -->
        <p v-if="helpText && !errorMessage" class="text-sm text-gray-500 dark:text-gray-400">
            {{ helpText }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ZodSchema } from 'zod'

interface SelectOption {
    value: string | number
    label: string
}

interface FormFieldProps {
    modelValue: any
    type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'date' | 'checkbox'
    label?: string
    placeholder?: string
    helpText?: string
    checkboxLabel?: string
    required?: boolean
    disabled?: boolean
    readonly?: boolean
    rows?: number
    options?: SelectOption[]
    validation?: ZodSchema
}

interface FormFieldEmits {
    'update:modelValue': [value: any]
    'blur': [event: Event]
}

const props = withDefaults(defineProps<FormFieldProps>(), {
    type: 'text',
    required: false,
    disabled: false,
    readonly: false,
    rows: 3,
})

const emit = defineEmits<FormFieldEmits>()

const fieldId = ref(`field-${Math.random().toString(36).substr(2, 9)}`)
const errorMessage = ref<string>('')

const validateField = (value: any) => {
    if (!props.validation) {
        errorMessage.value = ''
        return true
    }

    try {
        props.validation.parse(value)
        errorMessage.value = ''
        return true
    } catch (error: any) {
        if (error.issues && error.issues.length > 0) {
            errorMessage.value = error.issues[0].message
        } else if (error.errors && error.errors.length > 0) {
            errorMessage.value = error.errors[0].message
        } else {
            errorMessage.value = 'Invalid value'
        }
        return false
    }
}

const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement
    let value: any = target.value

    if (props.type === 'number') {
        value = target.value === '' ? null : Number(target.value)
    }

    emit('update:modelValue', value)
}

const handleChange = (event: Event) => {
    const target = event.target as HTMLSelectElement
    emit('update:modelValue', target.value)
}

const handleCheckboxChange = (event: Event) => {
    const target = event.target as HTMLInputElement
    emit('update:modelValue', target.checked)
}

const handleBlur = (event: Event) => {
    validateField(props.modelValue)
    emit('blur', event)
}

// Watch for external validation
watch(() => props.modelValue, (newValue) => {
    if (props.validation) {
        validateField(newValue)
    }
})

const baseInputClasses = [
    'block',
    'w-full',
    'rounded-md',
    'border-gray-300',
    'shadow-sm',
    'focus:border-blue-500',
    'focus:ring-blue-500',
    'dark:bg-gray-700',
    'dark:border-gray-600',
    'dark:text-white',
    'dark:focus:border-blue-400',
    'dark:focus:ring-blue-400',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'sm:text-sm',
]

const inputClasses = computed(() => {
    const classes = [...baseInputClasses]

    if (errorMessage.value) {
        classes.push(
            'border-red-300',
            'focus:border-red-500',
            'focus:ring-red-500',
            'dark:border-red-600',
            'dark:focus:border-red-400',
            'dark:focus:ring-red-400',
        )
    }

    return classes.join(' ')
})

const textareaClasses = computed(() => {
    const classes = [...baseInputClasses, 'resize-vertical']

    if (errorMessage.value) {
        classes.push(
            'border-red-300',
            'focus:border-red-500',
            'focus:ring-red-500',
            'dark:border-red-600',
            'dark:focus:border-red-400',
            'dark:focus:ring-red-400',
        )
    }

    return classes.join(' ')
})

const selectClasses = computed(() => {
    const classes = [
        ...baseInputClasses,
        'pr-10',
        'bg-white',
        'dark:bg-gray-700',
    ]

    if (errorMessage.value) {
        classes.push(
            'border-red-300',
            'focus:border-red-500',
            'focus:ring-red-500',
            'dark:border-red-600',
            'dark:focus:border-red-400',
            'dark:focus:ring-red-400',
        )
    }

    return classes.join(' ')
})

// Expose validation method for parent components
defineExpose({
    validate: () => validateField(props.modelValue),
    hasError: computed(() => !!errorMessage.value),
    errorMessage: computed(() => errorMessage.value),
})
</script>
