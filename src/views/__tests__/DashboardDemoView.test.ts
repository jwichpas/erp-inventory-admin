import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardDemoView from '../DashboardDemoView.vue'

// Mock ApexCharts component
vi.mock('vue3-apexcharts', () => ({
  default: {
    name: 'apexchart',
    template: '<div class="mock-chart">Chart</div>',
  },
}))

describe('DashboardDemoView', () => {
  it('renders dashboard demo with title', () => {
    const wrapper = mount(DashboardDemoView, {
      global: {
        components: {
          apexchart: {
            name: 'apexchart',
            template: '<div class="mock-chart">Chart</div>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('Dashboard Demo')
    expect(wrapper.text()).toContain('Demo dashboard with mock data')
  })

  it('renders dashboard cards with mock data', () => {
    const wrapper = mount(DashboardDemoView, {
      global: {
        components: {
          apexchart: {
            name: 'apexchart',
            template: '<div class="mock-chart">Chart</div>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('Total Sales')
    expect(wrapper.text()).toContain('S/ 125,000')
    expect(wrapper.text()).toContain('Inventory Value')
    expect(wrapper.text()).toContain('Low Stock Items')
    expect(wrapper.text()).toContain('Exchange Rate Impact')
  })

  it('renders refresh button', () => {
    const wrapper = mount(DashboardDemoView, {
      global: {
        components: {
          apexchart: {
            name: 'apexchart',
            template: '<div class="mock-chart">Chart</div>',
          },
        },
      },
    })

    const refreshButton = wrapper.find('button')
    expect(refreshButton.text()).toContain('Refresh Demo Data')
  })

  it('handles refresh button click', async () => {
    const consoleSpy = vi.spyOn(console, 'log')

    const wrapper = mount(DashboardDemoView, {
      global: {
        components: {
          apexchart: {
            name: 'apexchart',
            template: '<div class="mock-chart">Chart</div>',
          },
        },
      },
    })

    const refreshButton = wrapper.find('button')
    await refreshButton.trigger('click')

    expect(consoleSpy).toHaveBeenCalledWith('Refreshing demo data...')
  })
})
