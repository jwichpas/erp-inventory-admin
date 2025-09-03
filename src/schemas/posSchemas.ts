import { z } from 'zod'

// POS Cart Item Schema
export const posCartItemSchema = z.object({
  productId: z.string().uuid('ID de producto inválido'),
  sku: z.string().min(1, 'SKU es requerido'),
  name: z.string().min(1, 'Nombre del producto es requerido'),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  unitPrice: z.number().positive('El precio unitario debe ser mayor a 0'),
  discount: z
    .number()
    .min(0, 'El descuento no puede ser negativo')
    .max(100, 'El descuento no puede ser mayor a 100%')
    .default(0),
  taxRate: z.number().min(0, 'La tasa de impuesto no puede ser negativa').default(18),
  subtotal: z.number().min(0, 'El subtotal no puede ser negativo'),
  total: z.number().min(0, 'El total no puede ser negativo'),
  availableStock: z.number().min(0, 'Stock disponible no puede ser negativo'),
})

export type POSCartItem = z.infer<typeof posCartItemSchema>

// Customer Quick Registration Schema
export const quickCustomerSchema = z.object({
  documentType: z.string().min(1, 'Tipo de documento es requerido'),
  documentNumber: z.string().min(1, 'Número de documento es requerido'),
  name: z.string().min(1, 'Nombre es requerido').max(200, 'Nombre muy largo'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
})

export type QuickCustomer = z.infer<typeof quickCustomerSchema>

// Payment Method Schema
export const paymentMethodSchema = z.object({
  type: z.enum(['CASH', 'CARD', 'TRANSFER'], {
    errorMap: () => ({ message: 'Método de pago inválido' }),
  }),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  reference: z.string().optional(),
  cardType: z.string().optional(),
  authCode: z.string().optional(),
})

export type PaymentMethod = z.infer<typeof paymentMethodSchema>

// POS Sale Schema
export const posSaleSchema = z.object({
  customerId: z.string().uuid('Cliente es requerido'),
  items: z.array(posCartItemSchema).min(1, 'Debe agregar al menos un producto'),
  payments: z.array(paymentMethodSchema).min(1, 'Debe agregar al menos un método de pago'),
  subtotal: z.number().min(0, 'Subtotal inválido'),
  taxAmount: z.number().min(0, 'Monto de impuesto inválido'),
  discountAmount: z.number().min(0, 'Monto de descuento inválido'),
  total: z.number().positive('Total debe ser mayor a 0'),
  notes: z.string().optional(),
})

export type POSSale = z.infer<typeof posSaleSchema>

// POS Session Schema
export const posSessionSchema = z.object({
  openingAmount: z.number().min(0, 'Monto de apertura debe ser mayor o igual a 0'),
  closingAmount: z.number().min(0, 'Monto de cierre debe ser mayor o igual a 0').optional(),
  expectedAmount: z.number().min(0, 'Monto esperado debe ser mayor o igual a 0').optional(),
  difference: z.number().optional(),
  notes: z.string().optional(),
})

export type POSSession = z.infer<typeof posSessionSchema>

// Product Search Schema
export const productSearchSchema = z.object({
  query: z.string().min(1, 'Término de búsqueda es requerido'),
  warehouseId: z.string().uuid('Almacén es requerido'),
  limit: z.number().positive().max(50).default(20),
})

export type ProductSearch = z.infer<typeof productSearchSchema>
