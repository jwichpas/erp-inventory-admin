import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { z } from 'zod'
import FormField from '../FormField.vue'

describe('FormField', () => {
  it('renders text input by default', () => {
    const wrapper = mount(FormField, {
      props: {
        modelValue: '',
        label: 'Test Field',
      },
    })

    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(wrapper.find('label').text()).toBe('Test Field')
  })

  it('renders different input types', () => {
    const emailWrapper = mount(FormField, {
      props: {
        modelValue: '',
        type: 'email',
      },
    })

    const numberWrapper = mount(FormField, {
      props: {
        modelValue: 0,
        type: 'number',
      },
    })

    const textareaWrapper = mount(FormField, {
      props: {
        modelValue: '',
        type: 'textarea',
      },
    })

    expect(emailWrapper.find('input[type="email"]').exists()).toBe(true)
    expect(numberWrapper.find('input[type="number"]').exists()).toBe(true)
    expect(textareaWrapper.find('textarea').exists()).toBe(true)
  })

  it('renders select with options', () => {
    const options = [
      { value: '1', label: 'Option 1' },
      { value: '2', label: 'Option 2' },
    ]

    const wrapper = mount(FormField, {
      props: {
        modelValue: '',
        type: 'select',
        options,
        placeholder: 'Choose option',
      },
    })

    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)

    const optionElements = wrapper.findAll('option')
    expect(optionElements).toHaveLength(3) // placeholder + 2 options
    expect(optionElements[0].text()).toBe('Choose option')
    expect(optionElements[1].text()).toBe('Option 1')
    expect(optionElements[2].text()).toBe('Option 2')
  })

  it('renders checkbox with label', () => {
    const wrapper = mount(FormField, {
      props: {
        modelValue: false,
        type: 'checkbox',
        checkboxLabel: 'Accept terms',
      },
    })

    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Accept terms')
  })

  it('shows required indicator', () => {
    const wrapper = mount(FormField, {
      props: {
        modelValue: '',
        label: 'Required Field',
        required: true,
      },
    })

    expect(wrapper.find('span.text-red-500').text()).toBe('*')
  })

  it('shows help text', () => {
    const wrapper = mount(FormField, {
      props: {
        modelValue: '',
        helpText: 'This is help text',
      },
    })

    expect(wrapper.text()).toContain('This is help text')
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(FormField, {
      props: {
        modelValue: '',
      },
    })

    const input = wrapper.find('input')
    await input.setValue('test value')

    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['test value'])
  })

  it('validates with Zod schema', async () => {
    const schema = z.string().min(3, 'Minimum 3 characters')

    const wrapper = mount(FormField, {
      props: {
        modelValue: 'ab',
        validation: schema,
      },
    })

    // Trigger validation by blurring
    await wrapper.find('input').trigger('blur')

    expect(wrapper.text()).toContain('Minimum 3 characters')
    expect(wrapper.find('.text-red-600').exists()).toBe(true)
  })

  it('applies error styles when validation fails', async () => {
    const schema = z.string().min(5)

    const wrapper = mount(FormField, {
      props: {
        modelValue: 'abc',
        validation: schema,
      },
    })

    await wrapper.find('input').trigger('blur')

    const input = wrapper.find('input')
    expect(input.classes()).toContain('border-red-300')
    expect(input.classes()).toContain('focus:border-red-500')
  })

  it('handles disabled state', () => {
    const wrapper = mount(FormField, {
      props: {
        modelValue: '',
        disabled: true,
      },
    })

    const input = wrapper.find('input')
    expect(input.attributes('disabled')).toBeDefined()
    expect(input.classes()).toContain('disabled:opacity-50')
  })

  it('handles readonly state', () => {
    const wrapper = mount(FormField, {
      props: {
        modelValue: '',
        readonly: true,
      },
    })

    expect(wrapper.find('input').attributes('readonly')).toBeDefined()
  })
})
