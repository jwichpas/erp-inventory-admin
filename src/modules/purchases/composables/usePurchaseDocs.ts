// Composable para gestión de documentos de compra
import { ref, computed, reactive } from 'vue'
import { supabase } from '@/lib/supabase'
import type {
  PurchaseDoc,
  PurchaseDocListItem,
  PurchaseDocFormData,
  PurchaseDocFilters,
  TaxCalculation
} from '../types'

export function usePurchaseDocs() {
  // Estado reactivo
  const docs = ref<PurchaseDocListItem[]>([])
  const currentDoc = ref<PurchaseDoc | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Filtros y paginación
  const filters = reactive<PurchaseDocFilters>({
    page: 1,
    limit: 20,
    sort_by: 'issue_date',
    sort_direction: 'desc'
  })
  
  const pagination = reactive({
    page: 1,
    limit: 20,
    total: 0,
    hasNext: false,
    hasPrevious: false
  })

  // Computed properties
  const hasDocs = computed(() => docs.value.length > 0)
  const isEmpty = computed(() => !loading.value && !hasDocs.value)
  const totalPages = computed(() => Math.ceil(pagination.total / (filters.limit || 20)))
  
  // ============================================================================
  // FUNCIONES PRINCIPALES
  // ============================================================================
  
  /**
   * Cargar lista de documentos de compra
   */
  const loadDocs = async (newFilters?: Partial<PurchaseDocFilters>) => {
    loading.value = true
    error.value = null
    
    try {
      // Aplicar nuevos filtros si se proporcionan
      if (newFilters) {
        Object.assign(filters, newFilters)
      }
      
      let query = supabase
        .from('purchase_docs')
        .select(`
          id,
          doc_type,
          series,
          number,
          issue_date,
          currency_code,
          total,
          status,
          created_at,
          supplier:parties!supplier_id(
            id,
            fullname
          ),
          purchase_order:purchase_orders!purchase_order_id(id),
          items:purchase_doc_items(id)
        `, { count: 'exact' })
      
      // Aplicar filtros
      if (filters.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id)
      }
      
      if (filters.doc_type) {
        query = query.eq('doc_type', filters.doc_type)
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      
      if (filters.currency_code) {
        query = query.eq('currency_code', filters.currency_code)
      }
      
      if (filters.date_from) {
        query = query.gte('issue_date', filters.date_from)
      }
      
      if (filters.date_to) {
        query = query.lte('issue_date', filters.date_to)
      }
      
      if (filters.search) {
        query = query.or(`series.ilike.%${filters.search}%,number.ilike.%${filters.search}%`)
      }
      
      // Ordenamiento
      const sortBy = filters.sort_by || 'issue_date'
      const sortDirection = filters.sort_direction || 'desc'
      query = query.order(sortBy, { ascending: sortDirection === 'asc' })
      
      // Paginación
      const page = filters.page || 1
      const limit = filters.limit || 20
      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)
      
      const { data, error: queryError, count } = await query
      
      if (queryError) throw queryError
      
      // Verificar si hay recepciones para cada documento
      const docIds = data?.map(doc => doc.id) || []
      let receptionsMap: Record<string, boolean> = {}
      
      if (docIds.length > 0) {
        const { data: receptions } = await supabase
          .from('receptions')
          .select('purchase_doc_id')
          .in('purchase_doc_id', docIds)
          .not('purchase_doc_id', 'is', null)
        
        receptionsMap = (receptions || []).reduce((acc, reception) => {
          acc[reception.purchase_doc_id] = true
          return acc
        }, {} as Record<string, boolean>)
      }
      
      // Transformar datos para la vista de lista
      docs.value = (data || []).map((doc: any) => ({
        id: doc.id,
        doc_type: doc.doc_type,
        series: doc.series,
        number: doc.number,
        supplier_name: doc.supplier?.fullname || 'Sin proveedor',
        issue_date: doc.issue_date,
        currency_code: doc.currency_code,
        total: doc.total,
        status: doc.status,
        has_receipt: receptionsMap[doc.id] || false,
        can_edit: doc.status !== 'RECEIVED',
        can_receive: doc.status === 'PENDING' || doc.status === 'PARTIALLY_RECEIVED'
      }))
      
      // Actualizar paginación
      pagination.total = count || 0
      pagination.hasNext = (page * limit) < (count || 0)
      pagination.hasPrevious = page > 1
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error cargando documentos'
      console.error('Error loading purchase docs:', err)
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Cargar un documento específico
   */
  const loadDoc = async (id: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: queryError } = await supabase
        .from('purchase_docs')
        .select(`
          *,
          supplier:parties!supplier_id(
            id,
            fullname,
            doc_type,
            doc_number,
            email,
            phone,
            address
          ),
          branch:branches!branch_id(
            id,
            name,
            code
          ),
          purchase_order:purchase_orders!purchase_order_id(
            id,
            order_date,
            status
          ),
          items:purchase_doc_items(
            *,
            product:products(
              id,
              sku,
              name,
              unit_code,
              description
            )
          )
        `)
        .eq('id', id)
        .single()
      
      if (queryError) throw queryError
      
      currentDoc.value = data as PurchaseDoc
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error cargando documento'
      console.error('Error loading purchase doc:', err)
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Crear nuevo documento de compra
   */
  const createDoc = async (formData: PurchaseDocFormData): Promise<PurchaseDoc> => {
    loading.value = true
    error.value = null
    
    try {
      // Calcular totales
      const taxCalc = calculateTaxes(formData.items, formData.currency_code)
      
      // Crear el documento
      const { data: doc, error: docError } = await supabase
        .from('purchase_docs')
        .insert({
          supplier_id: formData.supplier_id,
          doc_type: formData.doc_type,
          series: formData.series,
          number: formData.number,
          issue_date: formData.issue_date,
          arrival_date: formData.arrival_date,
          currency_code: formData.currency_code,
          exchange_rate: formData.exchange_rate,
          op_type: formData.op_type,
          purchase_order_id: formData.purchase_order_id,
          subtotal: taxCalc.subtotal,
          total_ope_exoneradas: 0,
          total_ope_inafectas: 0,
          igv_amount: taxCalc.igv_amount,
          total_isc: taxCalc.isc_amount,
          total_descuentos: taxCalc.discount_amount,
          total_otros_cargos: taxCalc.other_charges,
          total: taxCalc.total,
          status: 'PENDING'
        })
        .select()
        .single()
      
      if (docError) throw docError
      
      // Crear los items
      const docItems = formData.items.map(item => {
        const lineCalc = calculateLineTotal(item)
        return {
          company_id: doc.company_id,
          purchase_doc_id: doc.id,
          product_id: item.product_id,
          description: item.description,
          unit_code: item.unit_code,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          discount_pct: item.discount_pct || 0,
          igv_affectation: item.igv_affectation,
          igv_amount: lineCalc.igv_amount,
          isc_amount: 0,
          total_line: lineCalc.total_line
        }
      })
      
      const { error: itemsError } = await supabase
        .from('purchase_doc_items')
        .insert(docItems)
      
      if (itemsError) throw itemsError
      
      // Recargar la lista
      await loadDocs()
      
      return doc as PurchaseDoc
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error creando documento'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Marcar documento como recibido (genera movimientos de inventario automáticamente)
   */
  const markAsReceived = async (id: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { error: updateError } = await supabase
        .from('purchase_docs')
        .update({ status: 'RECEIVED' })
        .eq('id', id)
      
      if (updateError) throw updateError
      
      // El trigger SQL se encarga de generar los movimientos de inventario automáticamente
      
      await loadDocs()
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error marcando como recibido'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Marcar documento como parcialmente recibido
   */
  const markAsPartiallyReceived = async (id: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { error: updateError } = await supabase
        .from('purchase_docs')
        .update({ status: 'PARTIALLY_RECEIVED' })
        .eq('id', id)
      
      if (updateError) throw updateError
      
      await loadDocs()
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error actualizando estado'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Cancelar documento
   */
  const cancelDoc = async (id: string, reason: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { error: updateError } = await supabase
        .from('purchase_docs')
        .update({ status: 'CANCELLED' })
        .eq('id', id)
      
      if (updateError) throw updateError
      
      await loadDocs()
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error cancelando documento'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  // ============================================================================
  // UTILIDADES DE CÁLCULO
  // ============================================================================
  
  /**
   * Calcular impuestos de una línea
   */
  const calculateLineTotal = (item: PurchaseDocFormData['items'][0]) => {
    const subtotal = item.quantity * item.unit_cost
    const discountAmount = subtotal * ((item.discount_pct || 0) / 100)
    const taxableAmount = subtotal - discountAmount
    
    // IGV (18% si es afecto)
    const igvAmount = item.igv_affectation === '10' ? taxableAmount * 0.18 : 0
    
    return {
      subtotal,
      discount_amount: discountAmount,
      taxable_amount: taxableAmount,
      igv_amount: igvAmount,
      isc_amount: 0,
      total_line: taxableAmount
    }
  }
  
  /**
   * Calcular totales del documento
   */
  const calculateTaxes = (items: PurchaseDocFormData['items'], currency: string): TaxCalculation => {
    let subtotal = 0
    let igv_amount = 0
    let isc_amount = 0
    let discount_amount = 0
    
    items.forEach(item => {
      const lineCalc = calculateLineTotal(item)
      subtotal += lineCalc.taxable_amount
      igv_amount += lineCalc.igv_amount
      isc_amount += lineCalc.isc_amount
      discount_amount += lineCalc.discount_amount
    })
    
    const other_charges = 0 // Por ahora no manejamos otros cargos
    const total = subtotal + igv_amount + isc_amount + other_charges
    
    return {
      subtotal,
      igv_amount,
      isc_amount,
      discount_amount,
      other_charges,
      total
    }
  }
  
  // ============================================================================
  // UTILIDADES
  // ============================================================================
  
  const refreshDocs = () => loadDocs()
  const clearError = () => { error.value = null }
  const clearCurrentDoc = () => { currentDoc.value = null }
  
  // Cambiar página
  const changePage = (page: number) => {
    filters.page = page
    loadDocs()
  }
  
  // Aplicar filtros
  const applyFilters = (newFilters: Partial<PurchaseDocFilters>) => {
    filters.page = 1 // Reset a primera página
    loadDocs(newFilters)
  }
  
  return {
    // Estado
    docs,
    currentDoc,
    loading,
    error,
    filters,
    pagination,
    
    // Computed
    hasDocs,
    isEmpty,
    totalPages,
    
    // Acciones principales
    loadDocs,
    loadDoc,
    createDoc,
    
    // Acciones de estado
    markAsReceived,
    markAsPartiallyReceived,
    cancelDoc,
    
    // Utilidades
    calculateTaxes,
    refreshDocs,
    clearError,
    clearCurrentDoc,
    changePage,
    applyFilters
  }
}