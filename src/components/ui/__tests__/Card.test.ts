import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Card from '../Card.vue'

describe('Card', () => {
  it('renders with default props', () => {
    const wrapper = mount(Card, {
      slots: {
        default: 'Card content',
      },
    })

    expect(wrapper.text()).toContain('Card content')
    expect(wrapper.find('div').classes()).toContain('bg-white')
    expect(wrapper.find('div').classes()).toContain('dark:bg-gray-800')
  })

  it('renders title in header', () => {
    const wrapper = mount(Card, {
      props: {
        title: 'Test Card',
      },
      slots: {
        default: 'Content',
      },
    })

    expect(wrapper.find('h3').text()).toBe('Test Card')
    expect(wrapper.find('h3').classes()).toContain('text-gray-900')
    expect(wrapper.find('h3').classes()).toContain('dark:text-white')
  })

  it('renders custom header slot', () => {
    const wrapper = mount(Card, {
      slots: {
        header: '<div class="custom-header">Custom Header</div>',
        default: 'Content',
      },
    })

    expect(wrapper.find('.custom-header').text()).toBe('Custom Header')
  })

  it('renders footer slot', () => {
    const wrapper = mount(Card, {
      slots: {
        default: 'Content',
        footer: '<div class="custom-footer">Footer content</div>',
      },
    })

    expect(wrapper.find('.custom-footer').text()).toBe('Footer content')
  })

  it('applies variant classes', () => {
    const outlinedWrapper = mount(Card, {
      props: {
        variant: 'outlined',
      },
      slots: {
        default: 'Content',
      },
    })

    const elevatedWrapper = mount(Card, {
      props: {
        variant: 'elevated',
      },
      slots: {
        default: 'Content',
      },
    })

    expect(outlinedWrapper.find('div').classes()).toContain('border-2')
    expect(elevatedWrapper.find('div').classes()).toContain('shadow-lg')
  })

  it('applies size-based padding', () => {
    const smallWrapper = mount(Card, {
      props: {
        size: 'sm',
      },
      slots: {
        default: 'Content',
      },
    })

    const largeWrapper = mount(Card, {
      props: {
        size: 'lg',
      },
      slots: {
        default: 'Content',
      },
    })

    // Check that different size classes are applied
    expect(smallWrapper.html()).toContain('p-4')
    expect(largeWrapper.html()).toContain('p-8')
  })

  it('applies hoverable styles', () => {
    const wrapper = mount(Card, {
      props: {
        hoverable: true,
      },
      slots: {
        default: 'Content',
      },
    })

    const cardDiv = wrapper.find('div')
    expect(cardDiv.classes()).toContain('hover:shadow-md')
    expect(cardDiv.classes()).toContain('cursor-pointer')
  })

  it('handles noPadding prop', () => {
    const wrapper = mount(Card, {
      props: {
        noPadding: true,
      },
      slots: {
        default: 'Content',
      },
    })

    // The body should not have padding classes when noPadding is true
    const bodyDiv = wrapper.find('div > div:last-child')
    expect(bodyDiv.classes()).not.toContain('p-6')
  })

  it('applies dark mode classes', () => {
    const wrapper = mount(Card, {
      slots: {
        default: 'Content',
      },
    })

    const cardDiv = wrapper.find('div')
    expect(cardDiv.classes()).toContain('dark:bg-gray-800')
    expect(cardDiv.classes()).toContain('dark:border-gray-700')
  })
})
