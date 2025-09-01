import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from '../Button.vue'

describe('Button', () => {
  it('renders with default props', () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Click me',
      },
    })

    expect(wrapper.text()).toBe('Click me')
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.find('button').attributes('type')).toBe('button')
  })

  it('applies correct variant classes', () => {
    const wrapper = mount(Button, {
      props: {
        variant: 'primary',
      },
      slots: {
        default: 'Primary Button',
      },
    })

    const button = wrapper.find('button')
    expect(button.classes()).toContain('bg-blue-600')
    expect(button.classes()).toContain('text-white')
  })

  it('applies correct size classes', () => {
    const wrapper = mount(Button, {
      props: {
        size: 'lg',
      },
      slots: {
        default: 'Large Button',
      },
    })

    const button = wrapper.find('button')
    expect(button.classes()).toContain('px-4')
    expect(button.classes()).toContain('py-2')
    expect(button.classes()).toContain('text-base')
  })

  it('shows loading state', () => {
    const wrapper = mount(Button, {
      props: {
        loading: true,
        loadingText: 'Loading...',
      },
      slots: {
        default: 'Submit',
      },
    })

    expect(wrapper.text()).toContain('Loading...')
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(Button, {
      props: {
        disabled: true,
      },
      slots: {
        default: 'Disabled Button',
      },
    })

    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.classes()).toContain('disabled:opacity-50')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Click me',
      },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('does not emit click when disabled', async () => {
    const wrapper = mount(Button, {
      props: {
        disabled: true,
      },
      slots: {
        default: 'Disabled',
      },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toBeFalsy()
  })

  it('does not emit click when loading', async () => {
    const wrapper = mount(Button, {
      props: {
        loading: true,
      },
      slots: {
        default: 'Loading',
      },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toBeFalsy()
  })

  it('applies full width class when fullWidth is true', () => {
    const wrapper = mount(Button, {
      props: {
        fullWidth: true,
      },
      slots: {
        default: 'Full Width',
      },
    })

    expect(wrapper.find('button').classes()).toContain('w-full')
  })
})
