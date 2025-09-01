import { z } from 'zod'

// Product validation schema
export const productSchema = z.object({
  sku: z
    .string()
    .min(1, 'SKU es requerido')
    .max(50, 'SKU no puede exceder 50 caracteres')
    .regex(/^[A-Za-z0-9-_]+$/, 'SKU solo puede contener letras, números, guiones y guiones bajos'),
  barcode: z
    .string()
    .max(100, 'Código de barras no puede exceder 100 caracteres')
    .optional()
    .nullable(),
  name: z.string().min(1, 'Nombre es requerido').max(200, 'Nombre no puede exceder 200 caracteres'),
  description: z
    .string()
    .max(1000, 'Descripción no puede exceder 1000 caracteres')
    .optional()
    .nullable(),
  brand_id: z.string().uuid('Marca inválida'),
  category_id: z.string().uuid('Categoría inválida'),
  unit_code: z
    .string()
    .min(1, 'Unidad de medida es requerida')
    .max(10, 'Código de unidad no puede exceder 10 caracteres'),
  tipo_afectacion: z
    .string()
    .min(1, 'Tipo de afectación IGV es requerido')
    .max(10, 'Tipo de afectación no puede exceder 10 caracteres'),
  dimensions: z.record(z.string(), z.any()).optional().nullable(),
  weight_kg: z.number().min(0, 'Peso debe ser mayor o igual a 0').optional().nullable(),
  is_serialized: z.boolean(),
  is_batch_controlled: z.boolean().optional(),
  min_stock: z
    .number()
    .min(0, 'Stock mínimo debe ser mayor o igual a 0')
    .max(999999, 'Stock mínimo no puede exceder 999,999'),
  max_stock: z
    .number()
    .min(0, 'Stock máximo debe ser mayor o igual a 0')
    .max(999999, 'Stock máximo no puede exceder 999,999')
    .optional()
    .nullable(),
  reorder_point: z
    .number()
    .min(0, 'Punto de reorden debe ser mayor o igual a 0')
    .max(999999, 'Punto de reorden no puede exceder 999,999')
    .optional()
    .nullable(),
  active: z.boolean().optional(),
  tags: z.array(z.string()).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
})

// Brand validation schema
export const brandSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre no puede exceder 100 caracteres'),
  code: z.string().max(50, 'Código no puede exceder 50 caracteres').optional().nullable(),
  active: z.boolean(),
})

// Category validation schema
export const categorySchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre no puede exceder 100 caracteres'),
  code: z.string().max(50, 'Código no puede exceder 50 caracteres').optional().nullable(),
  parent_id: z.string().uuid('Categoría padre inválida').optional().nullable(),
  active: z.boolean(),
})

// Stock movement validation schema
export const stockMovementSchema = z.object({
  product_id: z.string().uuid('Producto es requerido'),
  warehouse_id: z.string().uuid('Almacén es requerido'),
  zone_id: z.string().uuid().optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  movement_type: z.enum(['IN', 'OUT', 'TRANSFER'], {
    message: 'Tipo de movimiento inválido',
  }),
  quantity: z
    .number()
    .min(0.01, 'Cantidad debe ser mayor a 0')
    .max(999999, 'Cantidad no puede exceder 999,999'),
  unit_cost: z
    .number()
    .min(0, 'Costo unitario debe ser mayor o igual a 0')
    .max(999999, 'Costo unitario no puede exceder 999,999')
    .optional()
    .nullable(),
  reference: z
    .string()
    .max(200, 'Referencia no puede exceder 200 caracteres')
    .optional()
    .nullable(),
  document_type: z
    .string()
    .max(20, 'Tipo de documento no puede exceder 20 caracteres')
    .optional()
    .nullable(),
  document_id: z.string().uuid().optional().nullable(),
})

// Product code (serialized item) validation schema
export const productCodeSchema = z.object({
  product_id: z.string().uuid('Producto es requerido'),
  code: z.string().min(1, 'Código es requerido').max(100, 'Código no puede exceder 100 caracteres'),
  status: z.enum(['AVAILABLE', 'SOLD', 'RESERVED', 'DAMAGED'], {
    message: 'Estado inválido',
  }),
  warehouse_id: z.string().uuid('Almacén es requerido'),
  zone_id: z.string().uuid().optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  sale_date: z.string().optional().nullable(),
  notes: z.string().max(500, 'Notas no pueden exceder 500 caracteres').optional().nullable(),
})

// Product image validation schema
export const productImageSchema = z.object({
  product_id: z.string().uuid('Producto es requerido'),
  storage_path: z.string().min(1, 'Ruta de almacenamiento es requerida'),
  is_primary: z.boolean(),
})

export type ProductFormData = z.infer<typeof productSchema>
export type BrandFormData = z.infer<typeof brandSchema>
export type CategoryFormData = z.infer<typeof categorySchema>
export type StockMovementFormData = z.infer<typeof stockMovementSchema>
export type ProductCodeFormData = z.infer<typeof productCodeSchema>
export type ProductImageFormData = z.infer<typeof productImageSchema>
