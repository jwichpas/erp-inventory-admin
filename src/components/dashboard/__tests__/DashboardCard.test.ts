import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardCard from '../DashboardCard.vue'
import { TrendingUp } from 'lucide-vue-next'

describe('DashboardCard', () => {
  it('renders basic card with title and value', () => {
    const wrapper = mount(DashboardCard, {
      props: {
        title: 'Total Sales',
        value: '$10,000',
      },
    })

    expect(wrapper.text()).toContain('Total Sales')
    expect(wrapper.text()).toContain('$10,000')
  })

  it('renders change indicator when change prop is provided', () => {
    const wrapper = mount(DashboardCard, {
      props: {
        title: 'Total Sales',
        value: '$10,000',
        change: 15.5,
      },
    })

    expect(wrapper.text()).toContain('15.5%')
    expect(wrapper.text()).toContain('from last period')
  })

  it('renders icon when provided', () => {
    const wrapper = mount(DashboardCard, {
      props: {
        title: 'Total Sales',
        value: '$10,000',
        icon: TrendingUp,
      },
    })

    // Check if icon container exists
    expect(wrapper.find('.w-12.h-12').exists()).toBe(true)
  })

  it('shows positive change with green color', () => {
    const wrapper = mount(DashboardCard, {
      props: {
        title: 'Total Sales',
        value: '$10,000',
        change: 15.5,
      },
    })

    const changeElement = wrapper.find('.text-green-600')
    expect(changeElement.exists()).toBe(true)
  })

  it('shows negative change with red color', () => {
    const wrapper = mount(DashboardCard, {
      props: {
        title: 'Total Sales',
        value: '$10,000',
        change: -5.2,
      },
    })

    const changeElement = wrapper.find('.text-red-600')
    expect(changeElement.exists()).toBe(true)
  })
})
