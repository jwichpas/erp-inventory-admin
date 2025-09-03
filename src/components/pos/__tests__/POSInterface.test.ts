import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import POSInterface from '../POSInterface.vue'

// Mock the composables
vi.mock('@/composables/usePOS', () => ({
  usePOS: () => ({
    cart: { value: [] },
    selectedCustomer: { value: null },
    payments: { value: [] },
    searchQuery: { value: '' },
    selectedWarehouseId: { value: '' },
    searchResults: { value: [] },
    isSearching: { value: false },
    cartSubtotal: { value: 0 },
    cartTaxAmount: { value: 0 },
    cartDiscountAmount: { value: 0 },
    cartTotal: { value: 0 },
    canCompleteSale: { value: false },
    addToCart: vi.fn(),
    updateCartItemQuantity: vi.fn(),
    updateCartItemDiscount: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
    addPayment: vi.fn(),
    removePayment: vi.fn(),
  }),
}))

const mockPOSSession = {
  currentSession: { value: null },
  sessionStats: { value: null },
  isSessionOpen: { value: false },
  canOpenSession: { value: true },
}

vi.mock('@/composables/usePOSSession', () => ({
  usePOSSession: () => mockPOSSession,
}))

vi.mock('@/composables/usePOSSales', () => ({
  usePOSSales: () => ({
    completeSale: vi.fn(),
    isCompletingSale: { value: false },
    generateReceiptData: vi.fn(),
    printReceipt: vi.fn(),
  }),
}))

vi.mock('@/composables/usePOSCustomers', () => ({
  usePOSCustomers: () => ({
    defaultCustomer: { value: null },
  }),
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}))

describe('POSInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders POS interface correctly', () => {
    const wrapper = mount(POSInterface, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          POSCustomerSelector: true,
          POSCartItem: true,
          POSPaymentPanel: true,
          POSSessionModal: true,
          POSCloseSessionModal: true,
          Button: true,
          Search: true,
          Package: true,
          ShoppingCart: true,
          CreditCard: true,
          X: true,
        },
      },
    })

    expect(wrapper.find('h1').text()).toBe('Punto de Venta')
    expect(wrapper.find('input[placeholder*="Buscar productos"]').exists()).toBe(true)
  })

  it('shows session open button when no session is active', () => {
    const wrapper = mount(POSInterface, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          POSCustomerSelector: true,
          POSCartItem: true,
          POSPaymentPanel: true,
          POSSessionModal: true,
          POSCloseSessionModal: true,
          Button: true,
          Search: true,
          Package: true,
          ShoppingCart: true,
          CreditCard: true,
          X: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Abrir Sesión')
  })

  it('shows empty cart message when cart is empty', () => {
    const wrapper = mount(POSInterface, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          POSCustomerSelector: true,
          POSCartItem: true,
          POSPaymentPanel: true,
          POSSessionModal: true,
          POSCloseSessionModal: true,
          Button: true,
          Search: true,
          Package: true,
          ShoppingCart: true,
          CreditCard: true,
          X: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Carrito vacío')
  })
})
