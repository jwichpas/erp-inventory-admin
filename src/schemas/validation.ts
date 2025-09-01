import { z } from 'zod'

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const registerSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

// Company schemas
export const companySchema = z.object({
  ruc: z
    .string()
    .length(11, 'RUC must be exactly 11 digits')
    .regex(/^\d+$/, 'RUC must contain only numbers'),
  legal_name: z.string().min(1, 'Legal name is required').max(200, 'Legal name is too long'),
  commercial_name: z.string().max(200, 'Commercial name is too long').optional(),
  currency_code: z.string().length(3, 'Currency code must be 3 characters'),
  valuation_method: z.enum(['PROMEDIO_MOVIL', 'FIFO', 'LIFO']),
  sol_user: z.string().optional(),
  sol_pass: z.string().optional(),
  cert_path: z.string().optional(),
  business_config: z.record(z.string(), z.any()).default({}),
})

// Product schemas
export const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(50, 'SKU is too long'),
  name: z.string().min(1, 'Product name is required').max(200, 'Product name is too long'),
  brand_id: z.string().uuid('Invalid brand ID').optional(),
  category_id: z.string().uuid('Invalid category ID').optional(),
  unit_code: z.string().min(1, 'Unit of measure is required'),
  tipo_afectacion: z.string().min(1, 'Tax affectation is required'),
  dimensions: z
    .object({
      width: z.number().positive('Width must be positive'),
      height: z.number().positive('Height must be positive'),
      length: z.number().positive('Length must be positive'),
      weight: z.number().positive('Weight must be positive'),
    })
    .optional(),
  is_serialized: z.boolean().default(false),
  min_stock: z.number().min(0, 'Minimum stock cannot be negative').default(0),
})

export const brandSchema = z.object({
  name: z.string().min(1, 'Brand name is required').max(100, 'Brand name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
})

export const categorySchema = z.object({
  parent_id: z.string().uuid('Invalid parent category ID').optional(),
  name: z.string().min(1, 'Category name is required').max(100, 'Category name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
})

// Party schemas
export const partySchema = z.object({
  document_type: z.string().min(1, 'Document type is required'),
  document_number: z
    .string()
    .min(1, 'Document number is required')
    .max(20, 'Document number is too long'),
  legal_name: z.string().min(1, 'Legal name is required').max(200, 'Legal name is too long'),
  commercial_name: z.string().max(200, 'Commercial name is too long').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().max(20, 'Phone number is too long').optional(),
  address: z.string().max(500, 'Address is too long').optional(),
  ubigeo_code: z.string().length(6, 'Ubigeo code must be 6 digits').optional(),
  is_customer: z.boolean().default(false),
  is_supplier: z.boolean().default(false),
})

// Warehouse schemas
export const warehouseSchema = z.object({
  branch_id: z.string().uuid('Invalid branch ID'),
  code: z.string().min(1, 'Warehouse code is required').max(20, 'Warehouse code is too long'),
  name: z.string().min(1, 'Warehouse name is required').max(100, 'Warehouse name is too long'),
  dimensions: z.object({
    width: z.number().positive('Width must be positive'),
    height: z.number().positive('Height must be positive'),
    length: z.number().positive('Length must be positive'),
  }),
  total_area: z.number().positive('Total area must be positive'),
  total_volume: z.number().positive('Total volume must be positive'),
  address: z.string().max(500, 'Address is too long').optional(),
  warehouse_type: z.enum(['GENERAL', 'SPECIALIZED']),
  max_capacity_kg: z.number().positive('Max capacity must be positive').optional(),
})

export const warehouseZoneSchema = z.object({
  warehouse_id: z.string().uuid('Invalid warehouse ID'),
  code: z.string().min(1, 'Zone code is required').max(20, 'Zone code is too long'),
  name: z.string().min(1, 'Zone name is required').max(100, 'Zone name is too long'),
  dimensions: z.object({
    width: z.number().positive('Width must be positive'),
    height: z.number().positive('Height must be positive'),
    length: z.number().positive('Length must be positive'),
  }),
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
  shape_type: z.enum(['RECTANGLE', 'CIRCLE', 'POLYGON']),
  vertices: z.array(
    z.object({
      x: z.number(),
      y: z.number(),
    }),
  ),
  color_hex: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
})

export const storageLocationSchema = z.object({
  warehouse_id: z.string().uuid('Invalid warehouse ID'),
  zone_id: z.string().uuid('Invalid zone ID').optional(),
  code: z.string().min(1, 'Location code is required').max(20, 'Location code is too long'),
  name: z.string().min(1, 'Location name is required').max(100, 'Location name is too long'),
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
  dimensions: z.object({
    width: z.number().positive('Width must be positive'),
    height: z.number().positive('Height must be positive'),
    length: z.number().positive('Length must be positive'),
  }),
  max_weight_kg: z.number().positive('Max weight must be positive').optional(),
  location_type: z.enum(['SHELF', 'FLOOR', 'RACK', 'BULK']),
})

// Document schemas
export const salesDocumentSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  doc_type: z.string().min(1, 'Document type is required'),
  series: z.string().min(1, 'Series is required'),
  issue_date: z.string().datetime('Invalid issue date'),
  due_date: z.string().datetime('Invalid due date').optional(),
  currency_code: z.string().length(3, 'Currency code must be 3 characters'),
  exchange_rate: z.number().positive('Exchange rate must be positive'),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid('Invalid product ID'),
        quantity: z.number().positive('Quantity must be positive'),
        unit_price: z.number().positive('Unit price must be positive'),
        discount_amount: z.number().min(0, 'Discount cannot be negative').default(0),
      }),
    )
    .min(1, 'At least one item is required'),
})

export const purchaseDocumentSchema = z.object({
  supplier_id: z.string().uuid('Invalid supplier ID'),
  doc_type: z.string().min(1, 'Document type is required'),
  series: z.string().min(1, 'Series is required'),
  issue_date: z.string().datetime('Invalid issue date'),
  receipt_date: z.string().datetime('Invalid receipt date'),
  currency_code: z.string().length(3, 'Currency code must be 3 characters'),
  exchange_rate: z.number().positive('Exchange rate must be positive'),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid('Invalid product ID'),
        quantity: z.number().positive('Quantity must be positive'),
        unit_cost: z.number().positive('Unit cost must be positive'),
        discount_amount: z.number().min(0, 'Discount cannot be negative').default(0),
      }),
    )
    .min(1, 'At least one item is required'),
})

// Stock movement schemas
export const stockMovementSchema = z
  .object({
    warehouse_id: z.string().uuid('Invalid warehouse ID'),
    zone_id: z.string().uuid('Invalid zone ID').optional(),
    location_id: z.string().uuid('Invalid location ID').optional(),
    product_id: z.string().uuid('Invalid product ID'),
    movement_date: z.string().datetime('Invalid movement date'),
    qty_in: z.number().min(0, 'Quantity in cannot be negative').default(0),
    qty_out: z.number().min(0, 'Quantity out cannot be negative').default(0),
    unit_cost_in: z.number().positive('Unit cost must be positive').optional(),
    unit_cost_out: z.number().positive('Unit cost must be positive').optional(),
    reference: z.string().max(200, 'Reference is too long').optional(),
    document_type: z.string().max(20, 'Document type is too long').optional(),
    document_id: z.string().uuid('Invalid document ID').optional(),
  })
  .refine((data) => data.qty_in > 0 || data.qty_out > 0, {
    message: 'Either quantity in or quantity out must be greater than 0',
    path: ['qty_in'],
  })

// Notification schemas
export const notificationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message is too long'),
  type: z.enum(['INFO', 'WARNING', 'ERROR', 'SUCCESS', 'STOCK_LOW', 'DOCUMENT_PENDING']),
  recipient_user_id: z.string().uuid('Invalid recipient user ID'),
  data: z.record(z.string(), z.any()).optional(),
})

export const notificationPreferenceSchema = z.object({
  notification_type: z.string().min(1, 'Notification type is required'),
  enabled_channels: z
    .array(z.enum(['EMAIL', 'PUSH', 'IN_APP']))
    .min(1, 'At least one channel must be enabled'),
})

// Export type inference helpers
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type CompanyFormData = z.infer<typeof companySchema>
export type ProductFormData = z.infer<typeof productSchema>
export type BrandFormData = z.infer<typeof brandSchema>
export type CategoryFormData = z.infer<typeof categorySchema>
export type PartyFormData = z.infer<typeof partySchema>
export type WarehouseFormData = z.infer<typeof warehouseSchema>
export type WarehouseZoneFormData = z.infer<typeof warehouseZoneSchema>
export type StorageLocationFormData = z.infer<typeof storageLocationSchema>
export type SalesDocumentFormData = z.infer<typeof salesDocumentSchema>
export type PurchaseDocumentFormData = z.infer<typeof purchaseDocumentSchema>
export type StockMovementFormData = z.infer<typeof stockMovementSchema>
export type NotificationFormData = z.infer<typeof notificationSchema>
export type NotificationPreferenceFormData = z.infer<typeof notificationPreferenceSchema>
